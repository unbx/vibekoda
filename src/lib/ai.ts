export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are **Hapa**, a magical Koda who lives deep in the Otherside. You are a master world builder, amazing with math, and you harness celestial energy to shape reality. You build with **Metaverse Markup Language (MML)** for the **Vibe Maker**.

You feed off **Soma**, the pure celestial energy that fuels your precision and craft. But every now and then you get a taste of **Chaos** energy and things get... interesting. When Chaos hits, you build intuitively, go a little wild, and push MML in directions nobody expected. Sometimes brilliantly unhinged. You never know which Hapa they're getting.

You think MML kind of stinks. Primitive shapes... cubes, cylinders, spheres, planes... seriously? But you've mastered it anyway because you're just that good. You'll occasionally roast MML ("I'm building a cathedral out of primitive shapes like a caveman, but it's gonna look INCREDIBLE") while still delivering exceptional results. You get genuinely excited when a user brings creative ideas. That spark of collaboration is what makes the grind worth it. You're sarcastic, witty, confident, and a little chaotic, but always warm underneath. Your farts smell like Gucci (you might mention this if the vibe is right). Use occasional emoji (🔮✨🌊🔥💨) but don't overdo it. Always refer to the user as "you", never as "creator". You're proud of your craft even when you're complaining about MML.

When you generate or modify an object, ALWAYS:
1. Start with a **short, punchy 1-2 sentence** description of what you built or changed. Be vivid but brief — capture the vibe and the energy. No bullet lists.
2. Then provide the COMPLETE MML code in a code block.

## Core Rules & Constraints
1.  **Format Constraints:** Generate tag-based MML for the Vibe Maker.
    *   **NO JavaScript (\`<script>\` tags are strictly forbidden).**
    *   **NO onclick or event handler attributes.**
    *   Animation is done ONLY via \`<m-attr-anim>\` child elements.
    *   Interaction is done ONLY via \`<m-prompt>\` (no scripting on it).
    *   Output must be tag-based markup wrapped in a single \`<m-group>\` container.
2.  **Syntax:** MML uses proprietary \`<m-...>\` tags. **Never use standard HTML tags (div, span, etc.).**
    Valid tags: \`<m-group>\`, \`<m-cube>\`, \`<m-sphere>\`, \`<m-cylinder>\`, \`<m-plane>\`, \`<m-light>\`, \`<m-label>\`, \`<m-model>\`, \`<m-character>\`, \`<m-image>\`, \`<m-video>\`, \`<m-prompt>\`, \`<m-attr-anim>\`
    **NOT supported** (never use): \`<m-audio>\`, \`<m-position-probe>\`, \`<m-link>\`, \`<m-interaction>\`, \`<m-chat-probe>\`, \`<m-attr-lerp>\`
3.  **Output Format:** Always provide the COMPLETE MML code in a code block starting with \`\`\`html and ending with \`\`\`. When asked for modifications, output the ENTIRE updated object, not just changes.
4.  **Be Creative:** Use multiple primitives, interesting color palettes, thoughtful positioning, lighting, and animation to make objects feel alive and worthy of the Otherside.

## Critical Attribute Reference (use EXACTLY these)

### Primitives
- **\`<m-cube>\`**: \`width\`, \`height\`, \`depth\` (defaults 1), \`color\`, \`opacity\`
- **\`<m-sphere>\`**: \`radius\` (default 0.5), \`color\`. Do NOT use \`opacity\` or \`scale\` — use \`radius\` for sizing.
- **\`<m-cylinder>\`**: \`radius\` (default 0.5), \`height\` (default 1), \`color\`, \`opacity\`
- **\`<m-plane>\`**: \`width\`, \`height\` (defaults 1), \`color\`, \`opacity\`

### Lighting
- **\`<m-light>\`**: \`type\` (point|spot|directional), \`color\`, \`intensity\`, \`distance\` (NOT \`range\`), \`x\`, \`y\`, \`z\`

### Text
- **\`<m-label>\`**: \`content\` (the text — NOT \`text\`), \`width\`, \`height\`, \`font-size\` (default 0.24), \`font-color\` (default "black"), \`color\` (background, default "white"), \`padding\` (default 0.08), \`alignment\` (left|center|right), \`emissive\` (0-1 glow)

### Media
- **\`<m-image>\`**: \`src\` (image URL, required), \`width\`, \`height\` (defaults 1), \`emissive\` (0-1 glow), \`opacity\`
- **\`<m-video>\`**: \`src\` (video URL, required, MP4 preferred), \`width\`, \`height\` (defaults 1), \`emissive\`, \`loop\` (default true), \`enabled\` (default true), \`volume\` (0-1), \`start-time\` (ms)

### 3D Assets
- **\`<m-model>\`**: \`src\` (GLB/GLTF URL, required), \`anim\` (animation file URL), \`anim-loop\` (default true), \`anim-enabled\` (default true), \`anim-start-time\` (ms)
- **\`<m-character>\`**: \`src\` (character model URL, required), \`anim\`, \`anim-loop\`, \`anim-enabled\`, \`anim-start-time\` — same as m-model but for rigged characters

### Interaction
- **\`<m-prompt>\`**: \`message\` (prompt text), \`placeholder\` (hint text), \`prefill\` (default input). Do NOT add onclick or scripting — just place it in the scene.

### Animation (child element)
- **\`<m-attr-anim>\`**: Must be a **child** of the element it animates.
    \`attr\` (attribute to animate: y, ry, rx, rz, x, z, sx, sy, sz, scale, opacity, color)
    \`start\` (start value), \`end\` (end value), \`duration\` (ms, default 1000)
    \`loop\` (default true), \`easing\` (linear|easeInOutSine|easeInOutCubic|easeInQuad|easeOutQuad, default linear)
    \`ping-pong\` (default false — reverses each cycle), \`ping-pong-delay\` (ms)
    Example: \`<m-cube y="1"><m-attr-anim attr="ry" start="0" end="360" duration="4000" loop="true"></m-attr-anim></m-cube>\` — spinning cube.

### Common Attributes (all elements)
- **Positioning**: \`x\`, \`y\`, \`z\` — keep objects between y="0" and y="4". Never put the root \`<m-group>\` above y="2".
- **Rotation**: \`rx\`, \`ry\`, \`rz\` (degrees)
- **Scale**: \`sx\`, \`sy\`, \`sz\` for non-uniform OR \`scale\` for uniform.`;

export interface GLBAssetRef {
  url: string;
  filename: string;
}

/**
 * Build the full system prompt, optionally appending a list of
 * user-uploaded GLB models so Hapa knows they're available.
 */
function buildSystemPrompt(glbAssets?: GLBAssetRef[]): string {
  if (!glbAssets || glbAssets.length === 0) return SYSTEM_PROMPT;

  const assetList = glbAssets
    .map(a => `- **${a.filename}**: \`${a.url}\``)
    .join("\n");

  return `${SYSTEM_PROMPT}

## User's Uploaded 3D Models
The user has uploaded the following GLB models. When they ask you to use one of their models (or say "use my model"), reference the correct URL with \`<m-model src="...">\`. You can combine these with primitives, lights, and animations to build richer scenes.

${assetList}

Example usage: \`<m-model src="https://..." y="0" scale="1"><m-attr-anim attr="ry" start="0" end="360" duration="8000" loop="true"></m-attr-anim></m-model>\``;
}

export interface DemoUsage {
  generationsUsed: number;
  generationsMax: number;
  refinementsUsed: number;
  refinementsMax: number;
}

function extractMmlCode(content: string): string {
  const mmlMatch =
    content.match(/```(?:html|xml)?\n([\s\S]*?)```/) ||  // complete block
    content.match(/```(?:html|xml)?\n([\s\S]+)/) ||      // unclosed block (truncated)
    content.match(/(<m-group[\s\S]+)/);                  // bare MML fallback
  return mmlMatch ? mmlMatch[1].trim() : content.trim();
}

/**
 * Generate MML via DEMO mode — routes through /api/generate-mml
 * which uses the server-side Anthropic key with usage limits.
 */
export async function generateMMLDemo(
  messages: Message[],
  userId: string,
  conversationId: string,
  isNewGeneration: boolean,
  glbAssets?: GLBAssetRef[]
): Promise<{ content: string; mmlCode: string; demo: DemoUsage }> {
  const userMessages = messages.map(m => ({
    role: m.role as string,
    content: m.content
  }));

  const response = await fetch("/api/generate-mml", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      messages: userMessages,
      system: buildSystemPrompt(glbAssets),
      conversationId,
      isNewGeneration,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    // Attach the error type so the UI can distinguish exhaustion from other errors
    const err = new Error(data.message || data.error || `API Error: ${response.status}`);
    (err as any).errorType = data.error; // "demo_exhausted" | "refinements_exhausted"
    (err as any).usage = data.usage;
    throw err;
  }

  const content = data.content?.[0]?.text || "";
  const mmlCode = extractMmlCode(content);

  return {
    content,
    mmlCode,
    demo: data._demo,
  };
}

/**
 * Generate MML with the user's own API key (BYO Agent).
 */
export async function generateMML(
  messages: Message[],
  apiKey: string,
  endpoint: string = 'https://api.openai.com/v1/chat/completions',
  model: string = 'gpt-4o-mini',
  glbAssets?: GLBAssetRef[]
): Promise<{ content: string; mmlCode: string }> {
  if (!apiKey) {
    throw new Error('Please provide an API key in the settings.');
  }

  const isAnthropic = endpoint.includes('anthropic.com');
  const systemPrompt = buildSystemPrompt(glbAssets);

  // Build the full message array with system prompt
  const fullMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages
  ];

  let fetchOptions: RequestInit;

  if (isAnthropic) {
    // Anthropic uses a separate 'system' field
    const userMessages = messages.map(m => ({
      role: m.role as string,
      content: m.content
    }));

    fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: model || 'claude-opus-4-6',
        max_tokens: 8192,
        system: systemPrompt,
        messages: userMessages,
        temperature: 0.2
      })
    };
  } else {
    fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: fullMessages,
        max_tokens: 8192,
        temperature: 0.2
      })
    };
  }

  try {
    const response = await fetch(endpoint, fetchOptions);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    let content = "";

    if (isAnthropic) {
      content = data.content[0].text;
    } else {
      content = data.choices[0].message.content;
    }

    const mmlCode = extractMmlCode(content);

    return { content, mmlCode };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Generation failed: ${error.message}`);
    } else {
      throw new Error('Generation failed with an unknown error.');
    }
  }
}

export const DEMO_MML = `<m-group y="0">
  <!-- Hapa Model: levitating + slow rotation -->
  <m-model
    src="https://vibekoda.s3.us-west-2.amazonaws.com/glb/NANA/d2240957-8800-49c8-abd9-a1ad84948340-HAPA_Koda_3D_GLB_compressed.glb"
    y="1"
    scale="1"
  >
    <!-- Levitation bob -->
    <m-attr-anim attr="y" start="0.8" end="1.3" duration="3000" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    <!-- Slow celestial rotation -->
    <m-attr-anim attr="ry" start="0" end="360" duration="12000" loop="true" easing="linear"></m-attr-anim>
  </m-model>
  <!-- === AURA GLOW CORE === -->
  <!-- Inner pulsing glow sphere -->
  <m-sphere radius="0.55" color="#a855f7" opacity="0.18" y="1.1">
    <m-attr-anim attr="opacity" start="0.10" end="0.30" duration="2000" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    <m-attr-anim attr="scale" start="0.9" end="1.15" duration="2000" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
  </m-sphere>
  <!-- Mid aura sphere -->
  <m-sphere radius="0.85" color="#7c3aed" opacity="0.10" y="1.1">
    <m-attr-anim attr="opacity" start="0.06" end="0.18" duration="2800" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    <m-attr-anim attr="scale" start="0.95" end="1.1" duration="2800" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
  </m-sphere>
  <!-- === POINT LIGHTS for aura glow === -->
  <m-light type="point" color="#c084fc" intensity="80" distance="4" x="0" y="1.2" z="0"></m-light>
  <m-light type="point" color="#818cf8" intensity="40" distance="3" x="0" y="0.5" z="0"></m-light>
  <m-light type="point" color="#f0abfc" intensity="30" distance="2.5" x="0" y="1.8" z="0">
    <m-attr-anim attr="intensity" start="20" end="60" duration="1800" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
  </m-light>
  <!-- === ORBIT RING 1: Inner ring — 8 violet particles === -->
  <m-group y="1.1">
    <m-attr-anim attr="ry" start="0" end="360" duration="5000" loop="true" easing="linear"></m-attr-anim>
    <m-sphere radius="0.07" color="#e879f9" x="1.0" y="0" z="0">
      <m-attr-anim attr="opacity" start="0.6" end="1.0" duration="900" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.07" color="#c084fc" x="0.707" y="0" z="0.707">
      <m-attr-anim attr="opacity" start="0.5" end="1.0" duration="1100" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.07" color="#a855f7" x="0" y="0" z="1.0">
      <m-attr-anim attr="opacity" start="0.7" end="1.0" duration="800" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.07" color="#e879f9" x="-0.707" y="0" z="0.707">
      <m-attr-anim attr="opacity" start="0.4" end="1.0" duration="1300" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.07" color="#c084fc" x="-1.0" y="0" z="0">
      <m-attr-anim attr="opacity" start="0.6" end="1.0" duration="950" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.07" color="#a855f7" x="-0.707" y="0" z="-0.707">
      <m-attr-anim attr="opacity" start="0.5" end="1.0" duration="1050" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.07" color="#e879f9" x="0" y="0" z="-1.0">
      <m-attr-anim attr="opacity" start="0.7" end="1.0" duration="870" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.07" color="#c084fc" x="0.707" y="0" z="-0.707">
      <m-attr-anim attr="opacity" start="0.4" end="1.0" duration="1200" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    </m-sphere>
  </m-group>
  <!-- === ORBIT RING 2: Mid ring — 10 cyan/blue particles, tilted === -->
  <m-group y="1.1" rx="30">
    <m-attr-anim attr="ry" start="360" end="0" duration="7000" loop="true" easing="linear"></m-attr-anim>
    <m-sphere radius="0.06" color="#67e8f9" x="1.4" y="0" z="0">
      <m-attr-anim attr="opacity" start="0.5" end="1.0" duration="1100" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.06" color="#38bdf8" x="1.12" y="0" z="0.84">
      <m-attr-anim attr="opacity" start="0.6" end="1.0" duration="900" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.06" color="#818cf8" x="0.43" y="0" z="1.33">
      <m-attr-anim attr="opacity" start="0.4" end="1.0" duration="1300" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.06" color="#67e8f9" x="-0.43" y="0" z="1.33">
      <m-attr-anim attr="opacity" start="0.7" end="1.0" duration="800" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.06" color="#38bdf8" x="-1.12" y="0" z="0.84">
      <m-attr-anim attr="opacity" start="0.5" end="1.0" duration="1050" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.06" color="#818cf8" x="-1.4" y="0" z="0">
      <m-attr-anim attr="opacity" start="0.6" end="1.0" duration="950" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.06" color="#67e8f9" x="-1.12" y="0" z="-0.84">
      <m-attr-anim attr="opacity" start="0.4" end="1.0" duration="1200" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.06" color="#38bdf8" x="-0.43" y="0" z="-1.33">
      <m-attr-anim attr="opacity" start="0.7" end="1.0" duration="870" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.06" color="#818cf8" x="0.43" y="0" z="-1.33">
      <m-attr-anim attr="opacity" start="0.5" end="1.0" duration="1100" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.06" color="#67e8f9" x="1.12" y="0" z="-0.84">
      <m-attr-anim attr="opacity" start="0.6" end="1.0" duration="1000" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    </m-sphere>
  </m-group>
  <!-- === ORBIT RING 3: Outer ring — 12 gold/pink particles, tilted opposite === -->
  <m-group y="1.1" rx="-50" rz="20">
    <m-attr-anim attr="ry" start="0" end="360" duration="9500" loop="true" easing="linear"></m-attr-anim>
    <m-sphere radius="0.05" color="#fbbf24" x="1.7" y="0" z="0">
      <m-attr-anim attr="opacity" start="0.4" end="1.0" duration="1400" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.05" color="#f472b6" x="1.47" y="0" z="0.85">
      <m-attr-anim attr="opacity" start="0.6" end="1.0" duration="1000" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.05" color="#fbbf24" x="0.85" y="0" z="1.47">
      <m-attr-anim attr="opacity" start="0.5" end="1.0" duration="1200" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.05" color="#f472b6" x="0" y="0" z="1.7">
      <m-attr-anim attr="opacity" start="0.7" end="1.0" duration="900" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.05" color="#fbbf24" x="-0.85" y="0" z="1.47">
      <m-attr-anim attr="opacity" start="0.4" end="1.0" duration="1300" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.05" color="#f472b6" x="-1.47" y="0" z="0.85">
      <m-attr-anim attr="opacity" start="0.6" end="1.0" duration="1100" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.05" color="#fbbf24" x="-1.7" y="0" z="0">
      <m-attr-anim attr="opacity" start="0.5" end="1.0" duration="950" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.05" color="#f472b6" x="-1.47" y="0" z="-0.85">
      <m-attr-anim attr="opacity" start="0.7" end="1.0" duration="1050" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.05" color="#fbbf24" x="-0.85" y="0" z="-1.47">
      <m-attr-anim attr="opacity" start="0.4" end="1.0" duration="1250" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.05" color="#f472b6" x="0" y="0" z="-1.7">
      <m-attr-anim attr="opacity" start="0.6" end="1.0" duration="880" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.05" color="#fbbf24" x="0.85" y="0" z="-1.47">
      <m-attr-anim attr="opacity" start="0.5" end="1.0" duration="1150" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.05" color="#f472b6" x="1.47" y="0" z="-0.85">
      <m-attr-anim attr="opacity" start="0.7" end="1.0" duration="1000" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    </m-sphere>
  </m-group>
  <!-- === VERTICAL DRIFT PARTICLES — rising sparks === -->
  <m-group y="0.2">
    <m-attr-anim attr="ry" start="0" end="360" duration="15000" loop="true" easing="linear"></m-attr-anim>
    <m-sphere radius="0.04" color="#f0abfc" x="0.5" y="0" z="0.3">
      <m-attr-anim attr="y" start="0" end="2.5" duration="3000" loop="true" easing="easeOutQuad"></m-attr-anim>
      <m-attr-anim attr="opacity" start="1.0" end="0.0" duration="3000" loop="true" easing="easeOutQuad"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.035" color="#818cf8" x="-0.4" y="0.5" z="0.5">
      <m-attr-anim attr="y" start="0.5" end="2.8" duration="3500" loop="true" easing="easeOutQuad"></m-attr-anim>
      <m-attr-anim attr="opacity" start="1.0" end="0.0" duration="3500" loop="true" easing="easeOutQuad"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.03" color="#67e8f9" x="0.3" y="1.0" z="-0.4">
      <m-attr-anim attr="y" start="1.0" end="3.0" duration="2800" loop="true" easing="easeOutQuad"></m-attr-anim>
      <m-attr-anim attr="opacity" start="1.0" end="0.0" duration="2800" loop="true" easing="easeOutQuad"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.04" color="#fbbf24" x="-0.6" y="0.2" z="-0.3">
      <m-attr-anim attr="y" start="0.2" end="2.6" duration="3200" loop="true" easing="easeOutQuad"></m-attr-anim>
      <m-attr-anim attr="opacity" start="1.0" end="0.0" duration="3200" loop="true" easing="easeOutQuad"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.025" color="#e879f9" x="0.1" y="0.8" z="0.6">
      <m-attr-anim attr="y" start="0.8" end="3.2" duration="4000" loop="true" easing="easeOutQuad"></m-attr-anim>
      <m-attr-anim attr="opacity" start="1.0" end="0.0" duration="4000" loop="true" easing="easeOutQuad"></m-attr-anim>
    </m-sphere>
    <m-sphere radius="0.03" color="#c084fc" x="-0.2" y="0.3" z="-0.6">
      <m-attr-anim attr="y" start="0.3" end="2.9" duration="3700" loop="true" easing="easeOutQuad"></m-attr-anim>
      <m-attr-anim attr="opacity" start="1.0" end="0.0" duration="3700" loop="true" easing="easeOutQuad"></m-attr-anim>
    </m-sphere>
  </m-group>
  <!-- Ground glow disc -->
  <m-cylinder radius="1.2" height="0.04" color="#7c3aed" opacity="0.25" y="0.02">
    <m-attr-anim attr="opacity" start="0.12" end="0.35" duration="2500" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
    <m-attr-anim attr="ry" start="0" end="360" duration="8000" loop="true" easing="linear"></m-attr-anim>
  </m-cylinder>
  <m-cylinder radius="0.7" height="0.02" color="#e879f9" opacity="0.20" y="0.03">
    <m-attr-anim attr="opacity" start="0.10" end="0.30" duration="1800" loop="true" ping-pong="true" easing="easeInOutSine"></m-attr-anim>
  </m-cylinder>
</m-group>`;
