"use client";

import { useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface ScenePreviewProps {
  mmlCode: string;
  lighting?: "studio" | "sunset" | "night";
}

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

export function ScenePreview({ mmlCode, lighting = "studio" }: ScenePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animIdRef = useRef<number>(0);
  const objectGroupRef = useRef<THREE.Group | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // Scene — Otherside dark void
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060608);
    scene.fog = new THREE.Fog(0x060608, 25, 60);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(4, 3, 6);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1, 0);
    controlsRef.current = controls;

    // Ground grid — subtle Otherside purple tint
    const gridHelper = new THREE.GridHelper(30, 30, 0x1a1530, 0x0d0a1a);
    scene.add(gridHelper);

    // Ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    ambient.name = "__ambient";
    scene.add(ambient);

    // Default directional light
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    dirLight.name = "__dirLight";
    scene.add(dirLight);

    // Fill light from below
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.4);
    fillLight.position.set(-3, -2, -3);
    fillLight.name = "__fillLight";
    scene.add(fillLight);

    // Object group for MML objects
    const objectGroup = new THREE.Group();
    scene.add(objectGroup);
    objectGroupRef.current = objectGroup;

    // Animation loop
    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
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
      // Bright studio: light background like original daytime mode
      scene.background = new THREE.Color(0xc8d8e8);
      scene.fog = new THREE.Fog(0xc8d8e8, 25, 60);
      if (ambient) { ambient.color.set(0xffffff); ambient.intensity = 1.2; }
      if (dirLight) { dirLight.color.set(0xffffff); dirLight.intensity = 1.5; dirLight.position.set(5, 10, 5); }
      if (fillLight) { fillLight.color.set(0x8888ff); fillLight.intensity = 0.4; }
    } else if (lighting === "sunset") {
      // Portal glow: warm pinks and purples
      scene.background = new THREE.Color(0x120810);
      scene.fog = new THREE.Fog(0x120810, 20, 50);
      if (ambient) { ambient.color.set(0xffccdd); ambient.intensity = 0.8; }
      if (dirLight) { dirLight.color.set(0xe84bf5); dirLight.intensity = 1.8; dirLight.position.set(-5, 3, 2); }
      if (fillLight) { fillLight.color.set(0xff6644); fillLight.intensity = 0.5; }
    } else if (lighting === "night") {
      // Deep void: Otherside darkness
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

    // Clear previous objects
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) child.material.dispose();
      }
    }

    // Parse MML using the HTML parser (much more forgiving than XML)
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(code, "text/html");

      const processNode = (xmlNode: Element, parentGroup: THREE.Group) => {
        const tag = xmlNode.tagName.toLowerCase();

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
          const text = xmlNode.getAttribute("text") || "";
          const fontSize = parseFloat0(xmlNode.getAttribute("font-size"), 0.3);
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d")!;
          canvas.width = 512;
          canvas.height = 128;
          ctx.fillStyle = "transparent";
          ctx.fillRect(0, 0, 512, 128);
          ctx.font = `bold ${Math.round(fontSize * 100)}px Inter, Arial, sans-serif`;
          ctx.fillStyle = color.getStyle();
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(text, 256, 64);
          const texture = new THREE.CanvasTexture(canvas);
          const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
          const sprite = new THREE.Sprite(spriteMat);
          sprite.scale.set(fontSize * 8, fontSize * 2, 1);
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
        }

        // Process children for any element type
        for (const child of Array.from(xmlNode.children)) {
          processNode(child as Element, mesh && mesh instanceof THREE.Object3D ? mesh as THREE.Group : parentGroup);
        }
      };

      // Walk all elements in the parsed document body
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

      // Auto-frame camera on the generated content
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

  // Update scene when MML code changes
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
