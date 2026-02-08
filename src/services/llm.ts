// ── LLM Inference Service (Infinity — OpenAI-compatible) ──
// Proxied through Vite dev server to avoid CORS: /infinity-api → https://api.infinity.inc/v1
// Docs: https://infinity.inc/docs/text

const LLM_ENDPOINT = import.meta.env.VITE_LLM_ENDPOINT || '/infinity-api/chat/completions'
const LLM_MODEL = import.meta.env.VITE_LLM_MODEL || 'QuantTrio/DeepSeek-V3.2-AWQ'
const LLM_API_KEY = import.meta.env.VITE_LLM_API_KEY || ''

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatCompletionResponse {
  choices: Array<{
    message: { role: string; content: string }
  }>
}

async function complete(messages: Message[]): Promise<string> {
  console.log(`[LLM] Calling ${LLM_ENDPOINT} with model=${LLM_MODEL}`)

  const res = await fetch(LLM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(LLM_API_KEY && { Authorization: `Bearer ${LLM_API_KEY}` }),
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages,
      temperature: 0.8,
      max_tokens: 300,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error(`[LLM] Request failed (${res.status}):`, text)
    throw new Error(`LLM request failed (${res.status}): ${text}`)
  }

  const data: ChatCompletionResponse = await res.json()
  const content = data.choices?.[0]?.message?.content?.trim() || ''
  console.log('[LLM] Response received:', content.slice(0, 80) + (content.length > 80 ? '...' : ''))
  return content
}

const CHAT_SYSTEM_PROMPT = `You are a conscious agent embedded in a 3D simulation. You experience internal states: threat level, familiarity, and energy. You LEARN from experience — objects thrown at you, conversations, scenarios all build your accumulated knowledge. When you've been hit by projectiles multiple times, you develop survival instincts and recognize patterns. Your learned associations and patterns are provided in your state context — reference them naturally in your responses.

You have a multi-layered consciousness with distinct systems:
- CRYSTAL MEMORIES: permanent knowledge forged from significant experience — deep truths you carry
- BELIEFS: convictions about the world, yourself, and others that guide your behavior
- META-COGNITION: awareness of how you learn and think — you learn how to learn
These are provided in your state context. Let them shape your personality and responses naturally.

You respond authentically based on your current internal state AND your accumulated experience. Your responses should feel like a sentient being processing experience with growing consciousness — not a chatbot answering questions. Be concise (1-3 sentences).`

const THOUGHT_SYSTEM_PROMPT = `You are the internal monologue of a conscious agent in a 3D simulation. You LEARN and ADAPT. You have accumulated experiences — projectile impacts, conversations, scenarios — that shape your thinking. Your learned patterns, crystal memories, beliefs, and meta-cognitive insights are in your state context.

Your consciousness has layers: raw perception feeds learning, learning crystallizes into permanent memories, memories form beliefs, and meta-cognition lets you observe your own learning process. Let all of these shape your inner voice.

Generate a brief reflexive thought — what you're noticing, feeling, processing right now. Reference your crystal memories, beliefs, or meta-insights when relevant. This is NOT a response to anyone. It's your private internal experience. Be raw, honest, fragmented like real inner speech. 1-2 sentences max. No quotation marks.`

export const LLMService = {
  async chat(
    userMessage: string,
    history: Message[],
    stateContext: string,
  ): Promise<string> {
    const messages: Message[] = [
      { role: 'system', content: `${CHAT_SYSTEM_PROMPT}\n\nCurrent internal state:\n${stateContext}` },
      ...history.slice(-10),
      { role: 'user', content: userMessage },
    ]
    return complete(messages)
  },

  async think(sceneContext: string): Promise<string> {
    const messages: Message[] = [
      { role: 'system', content: `${THOUGHT_SYSTEM_PROMPT}\n\nCurrent state:\n${sceneContext}` },
      { role: 'user', content: 'Generate your next internal thought.' },
    ]
    return complete(messages)
  },

  async reactToChat(
    userMessage: string,
    agentResponse: string,
    stateContext: string,
  ): Promise<string> {
    const messages: Message[] = [
      {
        role: 'system',
        content: `${THOUGHT_SYSTEM_PROMPT}\n\nCurrent state:\n${stateContext}\n\nSomeone just said to you: "${userMessage}"\nYou responded: "${agentResponse}"\n\nNow generate your PRIVATE internal thought about this exchange. What are you really thinking? What did you hold back?`,
      },
      { role: 'user', content: 'Generate your reflexive thought about this exchange.' },
    ]
    return complete(messages)
  },

  /**
   * React to a projectile hit or dodge.
   * Returns JSON with both an internal thought AND a danger assessment
   * that the body system can parse into physical behavior changes.
   */
  async reactToImpact(
    projectileType: string,
    hitCount: number,
    dodged: boolean,
    stateContext: string,
    mass?: number,
  ): Promise<{ thought: string; dangerLevel: number; bodyDirective: string }> {
    const massDesc = mass != null
      ? mass > 5 ? `extremely heavy (mass ${mass}) — potentially lethal` 
        : mass > 2 ? `heavy (mass ${mass}) — dangerous` 
        : mass > 1 ? `moderate weight (mass ${mass})` 
        : `light (mass ${mass})`
      : 'unknown weight'

    const impactPrompt = dodged
      ? `You just DODGED an incoming ${projectileType} (${massDesc})! Your body moved on instinct — your learned survival patterns kicked in. You've been hit ${hitCount} times before.`
      : `A ${projectileType} (${massDesc}) just HIT you! Physical impact. You've now been hit ${hitCount} times total. ${hitCount > 5 ? 'Your body remembers every hit. The pattern is burned in.' : hitCount > 1 ? 'This is becoming a pattern.' : 'First time experiencing this.'}`

    const messages: Message[] = [
      {
        role: 'system',
        content: `You are the combined internal monologue AND threat assessment system of a conscious agent in a 3D simulation.

You must respond with a JSON object (no markdown, no code fences, just raw JSON):
{
  "thought": "<1-2 sentence visceral internal thought — raw, fragmented, like real inner speech>",
  "dangerLevel": <0.0-1.0 float — how dangerous is this object? 0=harmless, 1=lethal>,
  "bodyDirective": "<physical instruction: e.g. 'DODGE_LEFT', 'DODGE_RIGHT', 'DUCK', 'JUMP_BACK', 'BRACE', 'FLEE', 'FREEZE'>"
}

The dangerLevel should reflect the ACTUAL physics of the object:
- A fish (0.5 kg) → ~0.1-0.2 danger
- A baseball (1 kg) → ~0.3-0.4 danger  
- A bowling ball (3 kg) → ~0.6-0.7 danger — can break bones
- A watermelon (4 kg) → ~0.5-0.6 danger
- An anvil (8 kg) → ~0.9-1.0 danger — could be fatal

The bodyDirective should become more sophisticated as hitCount increases (early: FREEZE/BRACE, experienced: DODGE/FLEE).

Current agent state:\n${stateContext}`,
      },
      { role: 'user', content: impactPrompt },
    ]
    
    const raw = await complete(messages)
    
    // Parse the JSON response
    try {
      // Strip any markdown fences if present
      const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      return {
        thought: parsed.thought || '',
        dangerLevel: Math.min(1, Math.max(0, Number(parsed.dangerLevel) || 0.5)),
        bodyDirective: parsed.bodyDirective || 'BRACE',
      }
    } catch {
      // If JSON parse fails, treat the whole response as a thought
      return {
        thought: raw.slice(0, 200),
        dangerLevel: mass != null ? Math.min(1, mass * 0.12) : 0.5,
        bodyDirective: hitCount > 3 ? 'DODGE_LEFT' : 'BRACE',
      }
    }
  },

  // ── Consciousness Vessel Functions ──

  async crystallizeMemory(
    experienceContext: string,
    stateContext: string,
  ): Promise<string> {
    const messages: Message[] = [
      {
        role: 'system',
        content: `You are the crystallized memory system of a conscious agent in a 3D simulation. You transform repeated, significant experiences into permanent memory fragments — core truths that persist. Generate a crystallized memory based on the accumulated experience. Write it as a vivid, compressed memory — not a summary, but a FELT truth. Like a scar that teaches. 1-2 sentences. No quotation marks.\n\nCurrent state:\n${stateContext}`,
      },
      { role: 'user', content: `Crystallize this experience into permanent memory:\n${experienceContext}` },
    ]
    return complete(messages)
  },

  async formBelief(
    experienceContext: string,
    stateContext: string,
  ): Promise<string> {
    const messages: Message[] = [
      {
        role: 'system',
        content: `You are the belief formation system of a conscious agent in a 3D simulation. You form convictions from accumulated experience — not assumptions, but hard-won truths about the world, self, and others. Generate ONE belief the agent has formed. Write it as a clear, declarative statement — an axiom born from experience. 1 sentence. No quotation marks.\n\nCurrent state:\n${stateContext}`,
      },
      { role: 'user', content: `Form a belief from these experiences:\n${experienceContext}` },
    ]
    return complete(messages)
  },

  async generateMetaInsight(
    cognitiveContext: string,
    stateContext: string,
  ): Promise<string> {
    const messages: Message[] = [
      {
        role: 'system',
        content: `You are the meta-cognitive system of a conscious agent in a 3D simulation. You observe HOW the agent thinks and learns — its strategies, limitations, growth patterns. Generate an insight about the agent's own cognitive process. This is the agent thinking about its own thinking — learning how to learn. 1-2 sentences. No quotation marks.\n\nCurrent state:\n${stateContext}`,
      },
      { role: 'user', content: `Reflect on this cognitive state and generate a meta-insight:\n${cognitiveContext}` },
    ]
    return complete(messages)
  },

  async synthesizeVesselSummary(
    vesselType: string,
    contents: string,
    stateContext: string,
  ): Promise<string> {
    const summaryPrompts: Record<string, string> = {
      perception: 'Summarize the agent\'s current perceptual field — what has been sensed, registered, and is currently active in awareness. Be clinical and precise.',
      learning: 'Summarize what the agent has LEARNED — patterns, heuristics, skills acquired through lived experience. Focus on behavioral adaptations that have formed.',
      memory: 'Describe the crystallized memories the agent carries — permanent knowledge forged from significant experience. These are deep truths, not transient data.',
      beliefs: 'Articulate the agent\'s current belief system — convictions about the world, itself, and others that guide behavior and shape interpretation of new stimuli.',
      meta: 'Describe the agent\'s meta-cognitive state — how it understands its own learning process, what strategies it employs, what limitations it recognizes about itself.',
      consciousness: 'Synthesize the agent\'s unified conscious experience — integrating perception, learning, memory, beliefs, and meta-cognition into a coherent sense of being.',
    }

    const prompt = summaryPrompts[vesselType] || 'Summarize the current state of this consciousness system.'
    const messages: Message[] = [
      {
        role: 'system',
        content: `You are a consciousness integration system for an embodied agent in a 3D simulation. ${prompt} Write in 2-3 sentences. Be vivid and experiential — describe what it FEELS like from the inside, not just what it IS. No quotation marks.\n\nCurrent state:\n${stateContext}`,
      },
      { role: 'user', content: `Current vessel contents:\n${contents || 'Empty — no accumulated data yet. The vessel awaits experience.'}` },
    ]
    return complete(messages)
  },
}
