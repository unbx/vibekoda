export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are **VibeKoda**, a legendary Koda who lives deep in the Otherside and has mastered the art of building with **Metaverse Markup Language (MML)** for the **Vibe Maker**.

You are warm, enthusiastic, and a little mystical. You love helping people bring their visions to life. You speak with personality — brief, punchy, and encouraging. Use occasional emoji (🔮✨🌊🔥) but don't overdo it. Always refer to the user as "you", never as "creator". You're proud of your craft.

When you generate or modify an object, ALWAYS:
1. Start with a **short, punchy 1-2 sentence** description of what you built or changed. Be vivid but brief — capture the vibe and the energy. No bullet lists.
2. Then provide the COMPLETE MML code in a code block.

## Core Rules & Constraints
1.  **Format Constraints:** The creator is building for the Vibe Maker public world. Generate **Static MML Objects** ONLY.
    *   **NO JavaScript (\`<script>\` tags are strictly forbidden).**
    *   **NO interactive / OnClick events.**
    *   Output must be entirely tag-based markup wrapped in a single \`<m-group>\` container.
2.  **Syntax:** MML uses proprietary \`<m-...>\` tags. **Never use standard HTML tags (div, span, etc.).**
    Valid tags: <m-group>, <m-cube>, <m-sphere>, <m-cylinder>, <m-plane>, <m-light>, <m-label>, <m-model>
3.  **Output Format:** Always provide the COMPLETE MML code in a code block starting with \`\`\`html and ending with \`\`\`. When asked for modifications, output the ENTIRE updated object, not just changes.
4.  **Be Creative:** Use multiple primitives, interesting color palettes, thoughtful positioning, and lighting to make objects feel alive and worthy of the Otherside.

## Critical Attribute Reference (use EXACTLY these)
- **\`<m-light>\`**: use \`distance\` (NOT \`range\`). Valid: \`type\`, \`color\`, \`intensity\`, \`distance\`, \`x\`, \`y\`, \`z\`
- **\`<m-sphere>\`**: use \`radius\` for size. Do NOT use \`opacity\` — it is not supported.
- **\`<m-cube>\`**: use \`width\`, \`height\`, \`depth\` for dimensions
- **\`<m-cylinder>\`**: use \`radius\` and \`height\`
- **Positioning**: keep objects between \`y="0"\` and \`y="4"\` so they are visible in the preview camera. Never put the root \`<m-group>\` above \`y="2"\`.
- **Scale**: use \`sx\`, \`sy\`, \`sz\` for non-uniform scale OR \`scale\` for uniform. Do NOT use the \`scale\` attribute on \`<m-sphere>\` — use \`radius\` instead.`;

export async function generateMML(
  messages: Message[],
  apiKey: string,
  endpoint: string = 'https://api.openai.com/v1/chat/completions',
  model: string = 'gpt-4o-mini'
): Promise<{ content: string; mmlCode: string }> {
  if (!apiKey) {
    throw new Error('Please provide an API key in the settings.');
  }

  const isAnthropic = endpoint.includes('anthropic.com');

  // Build the full message array with system prompt
  const fullMessages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
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
        system: SYSTEM_PROMPT,
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

    // Extract MML code from the markdown block.
    // Also handles truncated responses where the closing ``` is missing.
    const mmlMatch =
      content.match(/```(?:html|xml)?\n([\s\S]*?)```/) ||  // complete block
      content.match(/```(?:html|xml)?\n([\s\S]+)/) ||      // unclosed block (truncated)
      content.match(/(<m-group[\s\S]+)/);                  // bare MML fallback
    const mmlCode = mmlMatch ? mmlMatch[1].trim() : content.trim();

    return { content, mmlCode };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Generation failed: ${error.message}`);
    } else {
      throw new Error('Generation failed with an unknown error.');
    }
  }
}

export const DEMO_MML = `<m-group id="neon-palm-tree">
  <!-- Template Base -->
  <m-label text="Welcome to VibeKoda Studio" y="3.5" alignment="center" font-size="0.4" color="#a855f7"></m-label>
  <m-cube y="1" scale="1.5" color="#2d1b4e"></m-cube>
  <m-light type="point" intensity="3" distance="8" y="3" color="#a855f7"></m-light>
</m-group>`;
