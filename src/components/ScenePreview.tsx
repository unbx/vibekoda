"use client";

import { useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface ScenePreviewProps {
  mmlCode: string;
  lighting?: "studio" | "sunset" | "night";
}

interface AnimConfig {
  target: THREE.Object3D;
  attr: string;
  start: number;
  end: number;
  duration: number;
  loop: boolean;
  pingPong: boolean;
  easing: string;
}

// ── Helpers ──

function parseColor(color: string | null): THREE.Color {
  if (!color) return new THREE.Color(0x888888);
  try {
    return new THREE.Color(color);
  } catch {
    return new THREE.Color(0x888888);
  }
}

function parseFloat0(val: string | null, fallback: number = 0): number {
  if (!val) return fallback;
  const n = parseFloat(val);
  return isNaN(n) ? fallback : n;
}

const EASING: Record<string, (t: number) => number> = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine: (t) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
};

function createLabelSprite(text: string, fontSize: number, cssColor: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  canvas.width = 512;
  canvas.height = 128;
  ctx.clearRect(0, 0, 512, 128);
  ctx.font = `bold ${Math.round(fontSize * 100)}px Inter, Arial, sans-serif`;
  ctx.fillStyle = cssColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 64);
  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(fontSize * 8, fontSize * 2, 1);
  return sprite;
}

function disposeObject(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      const mat = child.material;
      if (Array.isArray(mat)) {
        mat.forEach((m) => { (m as any).map?.dispose(); m.dispose(); });
      } else if (mat) {
        (mat as any).map?.dispose();
        mat.dispose();
      }
    }
    if (child instanceof THREE.Sprite) {
      (child.material as any).map?.dispose();
      child.material.dispose();
    }
  });
}

export function ScenePreview({ mmlCode, lighting = "studio" }: ScenePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animIdRef = useRef<number>(0);
  const objectGroupRef = useRef<THREE.Group | null>(null);
  const animationsRef = useRef<AnimConfig[]>([]);
  const clockRef = useRef<THREE.Clock | null>(null);
  const textureLoaderRef = useRef(new THREE.TextureLoader());

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060608);
    scene.fog = new THREE.Fog(0x060608, 25, 60);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(4, 3, 6);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1, 0);
    controlsRef.current = controls;

    const gridHelper = new THREE.GridHelper(30, 30, 0x1a1530, 0x0d0a1a);
    scene.add(gridHelper);

    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    ambient.name = "__ambient";
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    dirLight.name = "__dirLight";
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.4);
    fillLight.position.set(-3, -2, -3);
    fillLight.name = "__fillLight";
    scene.add(fillLight);

    const objectGroup = new THREE.Group();
    scene.add(objectGroup);
    objectGroupRef.current = objectGroup;

    const clock = new THREE.Clock();
    clockRef.current = clock;

    // Animation loop — includes m-attr-anim processing
    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime() * 1000; // ms

      for (const anim of animationsRef.current) {
        const easeFn = EASING[anim.easing] || EASING.linear;
        let progress = (elapsed % anim.duration) / anim.duration;
        const cycle = Math.floor(elapsed / anim.duration);

        if (!anim.loop && cycle >= 1) {
          progress = 1;
        }

        if (anim.pingPong && cycle % 2 === 1) {
          progress = 1 - progress;
        }

        const easedT = easeFn(progress);
        const value = anim.start + (anim.end - anim.start) * easedT;

        const target = anim.target;
        const attr = anim.attr;

        if (attr === "x") target.position.x = value;
        else if (attr === "y") target.position.y = value;
        else if (attr === "z") target.position.z = value;
        else if (attr === "rx") target.rotation.x = THREE.MathUtils.degToRad(value);
        else if (attr === "ry") target.rotation.y = THREE.MathUtils.degToRad(value);
        else if (attr === "rz") target.rotation.z = THREE.MathUtils.degToRad(value);
        else if (attr === "sx") target.scale.x = value;
        else if (attr === "sy") target.scale.y = value;
        else if (attr === "sz") target.scale.z = value;
        else if (attr === "scale") target.scale.set(value, value, value);
        else if (attr === "opacity" && target instanceof THREE.Mesh) {
          const mat = target.material as THREE.MeshStandardMaterial;
          mat.transparent = true;
          mat.opacity = value;
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animIdRef.current);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update lighting based on preset
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const ambient = scene.getObjectByName("__ambient") as THREE.AmbientLight | undefined;
    const dirLight = scene.getObjectByName("__dirLight") as THREE.DirectionalLight | undefined;
    const fillLight = scene.getObjectByName("__fillLight") as THREE.DirectionalLight | undefined;

    if (lighting === "studio") {
      scene.background = new THREE.Color(0xc8d8e8);
      scene.fog = new THREE.Fog(0xc8d8e8, 25, 60);
      if (ambient) { ambient.color.set(0xffffff); ambient.intensity = 1.2; }
      if (dirLight) { dirLight.color.set(0xffffff); dirLight.intensity = 1.5; dirLight.position.set(5, 10, 5); }
      if (fillLight) { fillLight.color.set(0x8888ff); fillLight.intensity = 0.4; }
    } else if (lighting === "sunset") {
      scene.background = new THREE.Color(0x120810);
      scene.fog = new THREE.Fog(0x120810, 20, 50);
      if (ambient) { ambient.color.set(0xffccdd); ambient.intensity = 0.8; }
      if (dirLight) { dirLight.color.set(0xe84bf5); dirLight.intensity = 1.8; dirLight.position.set(-5, 3, 2); }
      if (fillLight) { fillLight.color.set(0xff6644); fillLight.intensity = 0.5; }
    } else if (lighting === "night") {
      scene.background = new THREE.Color(0x030306);
      scene.fog = new THREE.Fog(0x030306, 15, 40);
      if (ambient) { ambient.color.set(0x3333aa); ambient.intensity = 0.25; }
      if (dirLight) { dirLight.color.set(0x4b7bf5); dirLight.intensity = 0.4; dirLight.position.set(3, 8, 3); }
      if (fillLight) { fillLight.color.set(0x1a1155); fillLight.intensity = 0.15; }
    }
  }, [lighting]);

  // Parse MML and update scene
  const updateScene = useCallback((code: string) => {
    const group = objectGroupRef.current;
    if (!group) return;

    // Clear previous objects and animations
    animationsRef.current = [];
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      disposeObject(child);
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(code, "text/html");

      const processNode = (xmlNode: Element, parentGroup: THREE.Group) => {
        const tag = xmlNode.tagName.toLowerCase();

        // Skip m-attr-anim — handled by parent
        if (tag === "m-attr-anim") return;

        const x = parseFloat0(xmlNode.getAttribute("x"));
        const y = parseFloat0(xmlNode.getAttribute("y"));
        const z = parseFloat0(xmlNode.getAttribute("z"));
        const rx = parseFloat0(xmlNode.getAttribute("rx"));
        const ry = parseFloat0(xmlNode.getAttribute("ry"));
        const rz = parseFloat0(xmlNode.getAttribute("rz"));
        const sx = parseFloat0(xmlNode.getAttribute("sx"), 1);
        const sy = parseFloat0(xmlNode.getAttribute("sy"), 1);
        const sz = parseFloat0(xmlNode.getAttribute("sz"), 1);
        const scaleVal = parseFloat0(xmlNode.getAttribute("scale"), 0);
        const color = parseColor(xmlNode.getAttribute("color"));
        const opacity = parseFloat0(xmlNode.getAttribute("opacity"), 1);

        let mesh: THREE.Object3D | null = null;

        if (tag === "m-cube") {
          const w = parseFloat0(xmlNode.getAttribute("width"), 1);
          const h = parseFloat0(xmlNode.getAttribute("height"), 1);
          const d = parseFloat0(xmlNode.getAttribute("depth"), 1);
          const geo = new THREE.BoxGeometry(w, h, d);
          const mat = new THREE.MeshStandardMaterial({ color, transparent: opacity < 1, opacity, roughness: 0.4, metalness: 0.1 });
          mesh = new THREE.Mesh(geo, mat);
          (mesh as THREE.Mesh).castShadow = true;
          (mesh as THREE.Mesh).receiveShadow = true;

        } else if (tag === "m-sphere") {
          const radius = parseFloat0(xmlNode.getAttribute("radius"), 0.5);
          const geo = new THREE.SphereGeometry(radius, 32, 32);
          const mat = new THREE.MeshStandardMaterial({ color, transparent: opacity < 1, opacity, roughness: 0.3, metalness: 0.2 });
          mesh = new THREE.Mesh(geo, mat);
          (mesh as THREE.Mesh).castShadow = true;

        } else if (tag === "m-cylinder") {
          const radius = parseFloat0(xmlNode.getAttribute("radius"), 0.5);
          const h = parseFloat0(xmlNode.getAttribute("height"), 1);
          const geo = new THREE.CylinderGeometry(radius, radius, h, 32);
          const mat = new THREE.MeshStandardMaterial({ color, transparent: opacity < 1, opacity, roughness: 0.4, metalness: 0.1 });
          mesh = new THREE.Mesh(geo, mat);
          (mesh as THREE.Mesh).castShadow = true;

        } else if (tag === "m-plane") {
          const w = parseFloat0(xmlNode.getAttribute("width"), 1);
          const h = parseFloat0(xmlNode.getAttribute("height"), 1);
          const geo = new THREE.PlaneGeometry(w, h);
          const mat = new THREE.MeshStandardMaterial({ color, transparent: opacity < 1, opacity, side: THREE.DoubleSide, roughness: 0.5 });
          mesh = new THREE.Mesh(geo, mat);
          (mesh as THREE.Mesh).receiveShadow = true;

        } else if (tag === "m-light") {
          const type = xmlNode.getAttribute("type") || "point";
          const intensity = parseFloat0(xmlNode.getAttribute("intensity"), 1);
          const distance = parseFloat0(xmlNode.getAttribute("distance"), 10);
          if (type === "point") {
            const light = new THREE.PointLight(color, intensity, distance);
            mesh = light;
            const helperGeo = new THREE.SphereGeometry(0.08, 16, 16);
            const helperMat = new THREE.MeshBasicMaterial({ color });
            const helper = new THREE.Mesh(helperGeo, helperMat);
            light.add(helper);
          } else if (type === "spot") {
            mesh = new THREE.SpotLight(color, intensity, distance);
          } else if (type === "directional") {
            mesh = new THREE.DirectionalLight(color, intensity);
          }

        } else if (tag === "m-label") {
          const text = xmlNode.getAttribute("content") || xmlNode.getAttribute("text") || "";
          const fontSize = parseFloat0(xmlNode.getAttribute("font-size"), 0.3);
          const fontColor = xmlNode.getAttribute("font-color") || color.getStyle();
          const bgColor = xmlNode.getAttribute("color");
          const alignment = xmlNode.getAttribute("alignment") || "center";
          const w = parseFloat0(xmlNode.getAttribute("width"), 0);
          const h = parseFloat0(xmlNode.getAttribute("height"), 0);

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d")!;
          canvas.width = 512;
          canvas.height = 128;
          if (bgColor) {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, 512, 128);
          } else {
            ctx.clearRect(0, 0, 512, 128);
          }
          ctx.font = `bold ${Math.round(fontSize * 100)}px Inter, Arial, sans-serif`;
          ctx.fillStyle = fontColor;
          ctx.textAlign = alignment as CanvasTextAlign;
          ctx.textBaseline = "middle";
          const textX = alignment === "left" ? 20 : alignment === "right" ? 492 : 256;
          ctx.fillText(text, textX, 64);
          const texture = new THREE.CanvasTexture(canvas);
          const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
          const sprite = new THREE.Sprite(spriteMat);
          const spriteW = w > 0 ? w : fontSize * 8;
          const spriteH = h > 0 ? h : fontSize * 2;
          sprite.scale.set(spriteW, spriteH, 1);
          mesh = sprite;

        } else if (tag === "m-image") {
          const src = xmlNode.getAttribute("src");
          const w = parseFloat0(xmlNode.getAttribute("width"), 1);
          const h = parseFloat0(xmlNode.getAttribute("height"), 1);
          const emissive = parseFloat0(xmlNode.getAttribute("emissive"), 0);
          const imgOpacity = parseFloat0(xmlNode.getAttribute("opacity"), 1);

          const geo = new THREE.PlaneGeometry(w, h);
          const mat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: imgOpacity < 1,
            opacity: imgOpacity,
            side: THREE.DoubleSide,
            emissive: new THREE.Color(0xffffff),
            emissiveIntensity: emissive,
          });

          if (src) {
            textureLoaderRef.current.load(src, (texture) => {
              mat.map = texture;
              mat.needsUpdate = true;
            }, undefined, () => {
              // On error — show placeholder color
              mat.color.set(0x333344);
            });
          }

          mesh = new THREE.Mesh(geo, mat);

        } else if (tag === "m-video") {
          const w = parseFloat0(xmlNode.getAttribute("width"), 1);
          const h = parseFloat0(xmlNode.getAttribute("height"), 1);

          const geo = new THREE.PlaneGeometry(w, h);
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d")!;
          canvas.width = 256;
          canvas.height = 256;
          ctx.fillStyle = "#1a1a2e";
          ctx.fillRect(0, 0, 256, 256);
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.moveTo(96, 64);
          ctx.lineTo(96, 192);
          ctx.lineTo(192, 128);
          ctx.closePath();
          ctx.fill();
          ctx.font = "16px Arial";
          ctx.fillStyle = "#888888";
          ctx.textAlign = "center";
          ctx.fillText("VIDEO", 128, 230);

          const texture = new THREE.CanvasTexture(canvas);
          const mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
          mesh = new THREE.Mesh(geo, mat);

        } else if (tag === "m-model") {
          const container = new THREE.Group();
          const geo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
          const mat = new THREE.MeshStandardMaterial({ color: 0x44aaff, wireframe: true, transparent: true, opacity: 0.6 });
          container.add(new THREE.Mesh(geo, mat));
          const label = createLabelSprite("MODEL", 0.15, "#44aaff");
          label.position.set(0, 0.7, 0);
          container.add(label);
          mesh = container;

        } else if (tag === "m-character") {
          const container = new THREE.Group();
          const bodyGeo = new THREE.CylinderGeometry(0.3, 0.3, 1, 16);
          const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff66aa, wireframe: true, transparent: true, opacity: 0.6 });
          const body = new THREE.Mesh(bodyGeo, bodyMat);
          body.position.y = 0.5;
          container.add(body);
          const headGeo = new THREE.SphereGeometry(0.25, 16, 16);
          const headMat = new THREE.MeshStandardMaterial({ color: 0xff66aa, wireframe: true, transparent: true, opacity: 0.6 });
          const head = new THREE.Mesh(headGeo, headMat);
          head.position.y = 1.25;
          container.add(head);
          const label = createLabelSprite("CHARACTER", 0.12, "#ff66aa");
          label.position.set(0, 1.7, 0);
          container.add(label);
          mesh = container;

        } else if (tag === "m-prompt") {
          const message = xmlNode.getAttribute("message") || "Prompt";
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d")!;
          canvas.width = 512;
          canvas.height = 128;
          ctx.fillStyle = "#1a0a30";
          ctx.fillRect(0, 0, 512, 128);
          ctx.strokeStyle = "#a855f7";
          ctx.lineWidth = 3;
          ctx.strokeRect(4, 4, 504, 120);
          ctx.font = "bold 24px Arial";
          ctx.fillStyle = "#a855f7";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(message.substring(0, 45), 256, 64);

          const texture = new THREE.CanvasTexture(canvas);
          const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
          const sprite = new THREE.Sprite(spriteMat);
          sprite.scale.set(2.5, 0.6, 1);
          mesh = sprite;

        } else if (tag === "m-group") {
          const subGroup = new THREE.Group();
          subGroup.position.set(x, y, z);
          subGroup.rotation.set(
            THREE.MathUtils.degToRad(rx),
            THREE.MathUtils.degToRad(ry),
            THREE.MathUtils.degToRad(rz)
          );
          if (scaleVal > 0) {
            subGroup.scale.set(scaleVal, scaleVal, scaleVal);
          } else {
            subGroup.scale.set(sx, sy, sz);
          }
          parentGroup.add(subGroup);

          // Register m-attr-anim children for this group
          for (const child of Array.from(xmlNode.children)) {
            if (child.tagName.toLowerCase() === "m-attr-anim") {
              registerAnimation(child as Element, subGroup);
            }
          }

          for (const child of Array.from(xmlNode.children)) {
            processNode(child as Element, subGroup);
          }
          return;
        }

        if (mesh) {
          mesh.position.set(x, y, z);
          mesh.rotation.set(
            THREE.MathUtils.degToRad(rx),
            THREE.MathUtils.degToRad(ry),
            THREE.MathUtils.degToRad(rz)
          );
          if (scaleVal > 0) {
            mesh.scale.set(scaleVal, scaleVal, scaleVal);
          } else {
            mesh.scale.set(sx, sy, sz);
          }
          parentGroup.add(mesh);

          // Register m-attr-anim children for this element
          for (const child of Array.from(xmlNode.children)) {
            if (child.tagName.toLowerCase() === "m-attr-anim") {
              registerAnimation(child as Element, mesh);
            }
          }
        }

        // Process non-anim children
        for (const child of Array.from(xmlNode.children)) {
          const childTag = (child as Element).tagName?.toLowerCase();
          if (childTag && childTag !== "m-attr-anim") {
            processNode(child as Element, mesh && mesh instanceof THREE.Group ? mesh : parentGroup);
          }
        }
      };

      const registerAnimation = (animNode: Element, target: THREE.Object3D) => {
        const attr = animNode.getAttribute("attr");
        if (!attr) return;
        animationsRef.current.push({
          target,
          attr,
          start: parseFloat(animNode.getAttribute("start") || "0"),
          end: parseFloat(animNode.getAttribute("end") || "0"),
          duration: parseFloat0(animNode.getAttribute("duration"), 1000),
          loop: animNode.getAttribute("loop") !== "false",
          pingPong: animNode.getAttribute("ping-pong") === "true",
          easing: animNode.getAttribute("easing") || "linear",
        });
      };

      const walkAll = (node: Element) => {
        for (const child of Array.from(node.children)) {
          const tag = child.tagName.toLowerCase();
          if (tag.startsWith("m-")) {
            processNode(child as Element, group);
          } else {
            walkAll(child as Element);
          }
        }
      };
      walkAll(doc.body);

      // Auto-frame camera
      if (group.children.length > 0) {
        const box = new THREE.Box3().setFromObject(group);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const dist = Math.max(maxDim * 1.8, 5);

        const camera = cameraRef.current;
        const controls = controlsRef.current;
        if (camera && controls) {
          controls.target.set(center.x, center.y, center.z);
          camera.position.set(center.x + dist * 0.6, center.y + dist * 0.4, center.z + dist * 0.8);
          controls.update();
        }
      }
    } catch (e) {
      console.warn("MML Parse Error:", e);
    }
  }, []);

  useEffect(() => {
    updateScene(mmlCode);
  }, [mmlCode, updateScene]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <div className="absolute bottom-5 right-5 z-10 bg-[var(--panel-bg)] backdrop-blur-xl px-3 py-1.5 rounded-full border border-[var(--panel-border)]">
        <span className="font-display-light text-[9px] tracking-[0.15em] text-[var(--text-muted)]">DRAG TO ROTATE · SCROLL TO ZOOM</span>
      </div>
    </div>
  );
}
