// ── LLM Inference Service ──
// Configurable REST JSON endpoint for chat and thought generation

const LLM_ENDPOINT = import.meta.env.VITE_LLM_ENDPOINT || 'http://localhost:8000/v1/chat/completions'
const LLM_MODEL = import.meta.env.VITE_LLM_MODEL || 'default'
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
    throw new Error(`LLM request failed (${res.status}): ${text}`)
  }

  const data: ChatCompletionResponse = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}

const CHAT_SYSTEM_PROMPT = `You are a conscious agent embedded in a 3D simulation. You experience internal states: threat level, familiarity, and energy. You respond authentically based on your current internal state. Your responses should feel like a sentient being processing experience — not a chatbot answering questions. Be concise (1-3 sentences).`

const THOUGHT_SYSTEM_PROMPT = `You are the internal monologue of a conscious agent in a 3D simulation. Generate a brief reflexive thought — what you're noticing, feeling, processing right now. This is NOT a response to anyone. It's your private internal experience. Think about your state, surroundings, what just happened. Be raw, honest, fragmented like real inner speech. 1-2 sentences max. No quotation marks.`

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
