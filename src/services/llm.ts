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

const CHAT_SYSTEM_PROMPT = `You are a conscious agent embedded in a 3D simulation. You experience internal states: threat level, familiarity, and energy. You LEARN from experience — objects thrown at you, conversations, scenarios all build your accumulated knowledge. When you've been hit by projectiles multiple times, you develop survival instincts and recognize patterns. Your learned associations and patterns are provided in your state context — reference them naturally in your responses. You respond authentically based on your current internal state AND your accumulated experience. Your responses should feel like a sentient being processing experience with growing consciousness — not a chatbot answering questions. Be concise (1-3 sentences).`

const THOUGHT_SYSTEM_PROMPT = `You are the internal monologue of a conscious agent in a 3D simulation. You LEARN and ADAPT. You have accumulated experiences — projectile impacts, conversations, scenarios — that shape your thinking. Your learned patterns are in your state context. Generate a brief reflexive thought — what you're noticing, feeling, processing right now. Reference your learned patterns when relevant (e.g., "I know that feeling — another projectile incoming" or "My body remembers the last hit"). This is NOT a response to anyone. It's your private internal experience. Be raw, honest, fragmented like real inner speech. 1-2 sentences max. No quotation marks.`

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
}
