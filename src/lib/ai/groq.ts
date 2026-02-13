import Groq from 'groq-sdk'

let client: Groq | null = null
let apiKeyWarningLogged = false

function getClient(): Groq {
  if (!client) {
    client = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })
  }
  return client
}

function logApiKeyWarning(): void {
  if (!apiKeyWarningLogged) {
    console.warn('[AI] GROQ_API_KEY not set — AI explanations disabled')
    apiKeyWarningLogged = true
  }
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

export interface GenerateTradeRecommendationParams {
  leagueId: string
  myRosterId: number
  myPlayers: Array<{ name: string; position: string; value: number }>
  targetRosterId: number
  targetPlayers: Array<{ name: string; position: string; value: number }>
  myNeeds: string[]
  theirNeeds: string[]
  scoringFormat: string
}

export async function generateExplanation(
  params: GenerateExplanationParams
): Promise<string> {
  if (!process.env.GROQ_API_KEY) {
    logApiKeyWarning()
    return 'AI explanations are currently unavailable.'
  }

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
    model: 'llama-3.1-8b-instant',
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

export async function generateTradeRecommendation(
  params: GenerateTradeRecommendationParams
): Promise<string> {
  if (!process.env.GROQ_API_KEY) {
    logApiKeyWarning()
    return 'AI trade recommendations are currently unavailable.'
  }

  const {
    myRosterId,
    myPlayers,
    targetRosterId,
    targetPlayers,
    myNeeds,
    theirNeeds,
    scoringFormat,
  } = params

  const myPlayersStr = myPlayers
    .map((p) => `${p.name} (${p.position}, value: ${p.value})`)
    .join(', ')
  const theirPlayersStr = targetPlayers
    .map((p) => `${p.name} (${p.position}, value: ${p.value})`)
    .join(', ')

  const prompt = `You are a fantasy football expert. Analyze this potential trade and provide specific recommendations.

My Roster (ID: ${myRosterId}):
- Players: ${myPlayersStr}
- Needs: ${myNeeds.join(', ')}

Their Roster (ID: ${targetRosterId}):
- Players: ${theirPlayersStr}
- Needs: ${theirNeeds.join(', ')}

Scoring Format: ${scoringFormat}

Provide 2-3 specific trade proposals that would benefit both teams. For each proposal, explain:
1. Which players would be exchanged
2. Why it helps both rosters
3. The value balance of the trade`

  const completion = await getClient().chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 500,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    throw new Error('No response from Groq API')
  }

  return content.trim()
}

export const GROQ_MODEL = 'llama-3.1-8b-instant'
