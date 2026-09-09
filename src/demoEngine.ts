/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  PROTOTYPE DEMO ENGINE — VoiceShield AI                 ║
 * ║  ──────────────────────────────────────────────────────  ║
 * ║  DEMO results are DETERMINISTIC fixtures.               ║
 * ║  LIVE results use real Web Audio API analysis but        ║
 * ║  NO ML model is running — clearly labelled as such.     ║
 * ╚══════════════════════════════════════════════════════════╝
 */

/* ─── Shared types ─── */
export type Status = 'SAFE' | 'SUSPICIOUS' | 'CRITICAL'
export type Decision = 'ALLOW' | 'VERIFY' | 'BLOCK'

/* ─── DEMO mode types ─── */
export interface DemoResult {
  mode: 'demo'
  speakerMatch: number
  spoofProbability: number
  riskScore: number
  status: Status
  decision: Decision
  label: string
  analysisTime: string
  confidence: string
}

export type DemoScenario = 'authentic' | 'cloned' | 'impersonation'

const DEMO_RESULTS: Record<DemoScenario, Omit<DemoResult, 'mode'>> = {
  authentic: {
    speakerMatch: 97.3,
    spoofProbability: 4.0,
    riskScore: 8,
    status: 'SAFE',
    decision: 'ALLOW',
    label: 'Authentic Human Voice',
    analysisTime: '1.2s',
    confidence: 'High',
  },
  cloned: {
    speakerMatch: 84.6,
    spoofProbability: 91.0,
    riskScore: 92,
    status: 'CRITICAL',
    decision: 'BLOCK',
    label: 'AI-Generated Clone Detected — BLOCK CALL',
    analysisTime: '2.1s',
    confidence: 'Very High',
  },
  impersonation: {
    speakerMatch: 41.2,
    spoofProbability: 62.0,
    riskScore: 78,
    status: 'CRITICAL',
    decision: 'BLOCK',
    label: 'Impersonation Detected — BLOCK CALL',
    analysisTime: '1.8s',
    confidence: 'High',
  },
}

export function runDemoAnalysis(
  scenario: DemoScenario,
  delayMs = 2400,
): Promise<DemoResult> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ mode: 'demo', ...DEMO_RESULTS[scenario] }), delayMs)
  })
}

/* ─── LIVE mode types ─── */
export interface LiveResult {
  mode: 'live'
  duration: number         // seconds
  voiceActivity: number    // 0-100 % of frames with voice
  audioQuality: 'Poor' | 'Fair' | 'Good' | 'Excellent'
  peakAmplitude: number    // 0-1
  avgRMS: number           // 0-1
  riskScore: number        // 0-100  (prototype heuristic)
  status: Status
  decision: Decision
  label: string
  analysisTime: string
}

/**
 * Analyze REAL audio from the microphone or uploaded file.
 *
 * Uses the Web Audio API to compute genuine signal metrics.
 * The risk score is a simple energy-based heuristic — it is NOT
 * a spoofing detector. It is labelled "Prototype Audio Analysis".
 */
export async function analyzeLiveAudio(blob: Blob): Promise<LiveResult> {
  const t0 = performance.now()

  const arrayBuffer = await blob.arrayBuffer()
  const audioCtx = new AudioContext()
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
  await audioCtx.close()

  const channelData = audioBuffer.getChannelData(0)
  const sampleRate = audioBuffer.sampleRate
  const duration = audioBuffer.duration

  // ── RMS energy ──
  let sumSquares = 0
  for (let i = 0; i < channelData.length; i++) {
    sumSquares += channelData[i] * channelData[i]
  }
  const avgRMS = Math.sqrt(sumSquares / channelData.length)

  // ── Peak amplitude ──
  let peak = 0
  for (let i = 0; i < channelData.length; i++) {
    const abs = Math.abs(channelData[i])
    if (abs > peak) peak = abs
  }

  // ── Voice Activity Detection (energy-threshold) ──
  const frameSize = Math.floor(sampleRate * 0.025) // 25ms frames
  const hopSize = Math.floor(sampleRate * 0.01)    // 10ms hop
  const threshold = avgRMS * 0.5
  let voiceFrames = 0
  let totalFrames = 0

  for (let start = 0; start + frameSize < channelData.length; start += hopSize) {
    let frameEnergy = 0
    for (let j = start; j < start + frameSize; j++) {
      frameEnergy += channelData[j] * channelData[j]
    }
    frameEnergy = Math.sqrt(frameEnergy / frameSize)
    totalFrames++
    if (frameEnergy > threshold) voiceFrames++
  }

  const voiceActivity = totalFrames > 0
    ? Math.round((voiceFrames / totalFrames) * 100)
    : 0

  // ── Audio quality (simple heuristic) ──
  const audioQuality: LiveResult['audioQuality'] =
    avgRMS < 0.005 ? 'Poor'
    : avgRMS < 0.02 ? 'Fair'
    : avgRMS < 0.1 ? 'Good'
    : 'Excellent'

  // ── Prototype risk score ──
  // Low risk if good voice activity + reasonable energy.
  // This is NOT a spoof detector — it's a signal quality heuristic.
  let riskScore = 15 // baseline: assume low risk for real audio
  if (voiceActivity < 20) riskScore += 25  // very little voice → suspicious
  if (avgRMS < 0.005) riskScore += 20      // near-silent → suspicious
  if (duration < 0.5) riskScore += 15      // too short to assess
  riskScore = Math.min(100, Math.max(0, riskScore))

  const status: Status = riskScore < 30 ? 'SAFE' : riskScore < 60 ? 'SUSPICIOUS' : 'CRITICAL'
  const decision: Decision = riskScore < 30 ? 'ALLOW' : riskScore < 60 ? 'VERIFY' : 'BLOCK'

  const analysisMs = performance.now() - t0
  const label =
    status === 'SAFE' ? 'Voice Signal Looks Normal'
    : status === 'SUSPICIOUS' ? 'Low Signal Quality — Manual Review Suggested'
    : 'Very Poor Signal — Cannot Assess'

  return {
    mode: 'live',
    duration: Math.round(duration * 10) / 10,
    voiceActivity,
    audioQuality,
    peakAmplitude: Math.round(peak * 1000) / 1000,
    avgRMS: Math.round(avgRMS * 10000) / 10000,
    riskScore,
    status,
    decision,
    label,
    analysisTime: `${(analysisMs / 1000).toFixed(2)}s`,
  }
}

export type AnalysisResult = DemoResult | LiveResult
