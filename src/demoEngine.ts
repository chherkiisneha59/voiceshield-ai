/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  PROTOTYPE DEMO ENGINE — VoiceShield AI                 ║
 * ║  ──────────────────────────────────────────────────────  ║
 * ║  All values below are DETERMINISTIC demo fixtures.      ║
 * ║  They do NOT come from any ML model or real analysis.   ║
 * ║  This engine exists solely for hackathon demonstration. ║
 * ╚══════════════════════════════════════════════════════════╝
 */

export type Status = 'SAFE' | 'SUSPICIOUS' | 'CRITICAL'
export type Decision = 'ALLOW' | 'VERIFY' | 'BLOCK'

export interface AnalysisResult {
  speakerMatch: number   // 0-100 %
  spoofProbability: number // 0-100 %
  riskScore: number      // 0-100
  status: Status
  decision: Decision
  label: string
  analysisTime: string
  confidence: string
}

export type DemoScenario = 'authentic' | 'cloned' | 'impersonation'

const DEMO_RESULTS: Record<DemoScenario, AnalysisResult> = {
  authentic: {
    speakerMatch: 97.3,
    spoofProbability: 2.1,
    riskScore: 8,
    status: 'SAFE',
    decision: 'ALLOW',
    label: 'Authentic Human Voice',
    analysisTime: '1.2s',
    confidence: 'High',
  },
  cloned: {
    speakerMatch: 84.6,
    spoofProbability: 91.4,
    riskScore: 89,
    status: 'CRITICAL',
    decision: 'BLOCK',
    label: 'AI-Generated Clone Detected',
    analysisTime: '2.1s',
    confidence: 'Very High',
  },
  impersonation: {
    speakerMatch: 41.2,
    spoofProbability: 67.8,
    riskScore: 62,
    status: 'SUSPICIOUS',
    decision: 'VERIFY',
    label: 'Possible Impersonation',
    analysisTime: '1.8s',
    confidence: 'Medium',
  },
}

/**
 * Returns deterministic demo results for a given scenario.
 * Wrapped in a fake delay to simulate analysis.
 */
export function runDemoAnalysis(
  scenario: DemoScenario,
  delayMs = 2400,
): Promise<AnalysisResult> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ ...DEMO_RESULTS[scenario] }), delayMs)
  })
}

/**
 * Returns a random-ish result for "Analyze Voice" when no demo button is used.
 * Still deterministic per-click (seeded from current second).
 */
export function runGenericAnalysis(): Promise<AnalysisResult> {
  const scenarios: DemoScenario[] = ['authentic', 'cloned', 'impersonation']
  const pick = scenarios[Math.floor(Math.random() * scenarios.length)]
  return runDemoAnalysis(pick, 2800)
}
