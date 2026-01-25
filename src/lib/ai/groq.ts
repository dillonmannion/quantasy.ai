import Groq from 'groq-sdk'

let client: Groq | null = null

function getClient(): Groq {
  if (!client) {
    client = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })
  }
  return client
}

export interface GenerateExplanationParams {
  playerName: string
  position: string
  vbd: number
  projectedPoints: number
  baselinePlayerName: string
  baselinePoints: number
  scoringFormat: string
}

export async function generateExplanation(
  params: GenerateExplanationParams
): Promise<string> {
  const {
    playerName,
    position,
    vbd,
    projectedPoints,
    baselinePlayerName,
    baselinePoints,
    scoringFormat,
  } = params

  const prompt = `You are a fantasy football expert. Explain why ${playerName} (${position}) has a VBD of ${vbd.toFixed(1)}.

Context:
- Projected points: ${projectedPoints.toFixed(1)}
- Baseline (${baselinePlayerName}): ${baselinePoints.toFixed(1)}
- Scoring: ${scoringFormat}

Provide a 2-3 sentence explanation focusing on why this player is valuable relative to replacement level.`

  const completion = await getClient().chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 300,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    throw new Error('No response from Groq API')
  }

  return content.trim()
}

export const GROQ_MODEL = 'llama-3.3-70b-versatile'
