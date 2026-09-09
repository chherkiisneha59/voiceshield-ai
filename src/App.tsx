import { useState, useRef, useCallback, useEffect } from 'react'
import {
  runDemoAnalysis,
  analyzeLiveAudio,
  type AnalysisResult,
  type LiveResult,
  type DemoResult,
  type DemoScenario,
  type Status,
  type Decision,
} from './demoEngine'

/* ─── Waveform Visualizer ─── */
function Waveform({ active, intensity }: { active: boolean; intensity: number }) {
  const bars = 48
  return (
    <div className="flex items-center justify-center gap-[2px] h-20">
      {Array.from({ length: bars }).map((_, i) => {
        const delay = `${(i * 0.04).toFixed(2)}s`
        const maxH = active ? 12 + Math.sin(i * 0.5) * 8 * intensity : 4
        return (
          <div
            key={i}
            className={`w-[3px] rounded-full transition-all duration-300 ${
              active
                ? 'bg-gradient-to-t from-vs-accent to-vs-glow-cyan wave-bar'
                : 'bg-vs-border'
            }`}
            style={{
              height: `${maxH}px`,
              animationDelay: active ? delay : '0s',
              animationPlayState: active ? 'running' : 'paused',
            }}
          />
        )
      })}
    </div>
  )
}

/* ─── Circular Gauge ─── */
function CircularGauge({
  value,
  label,
  color,
  suffix = '%',
}: {
  value: number
  label: string
  color: string
  suffix?: string
}) {
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const progress = (value / 100) * circumference
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke="rgba(30,41,59,0.6)"
            strokeWidth="6"
          />
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            className="transition-all duration-1000 ease-out"
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-white count-up">
            {value.toFixed(1)}{suffix}
          </span>
        </div>
      </div>
      <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</span>
    </div>
  )
}

/* ─── Status Badge ─── */
function StatusBadge({ status }: { status: Status }) {
  const cfg: Record<Status, { bg: string; text: string; glow: string }> = {
    SAFE:       { bg: 'bg-emerald-500/15', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
    SUSPICIOUS: { bg: 'bg-amber-500/15',   text: 'text-amber-400',   glow: 'shadow-amber-500/20' },
    CRITICAL:   { bg: 'bg-red-500/15',     text: 'text-red-400',     glow: 'shadow-red-500/20' },
  }
  const c = cfg[status]
  return (
    <span className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold tracking-wider ${c.bg} ${c.text} shadow-lg ${c.glow}`}>
      <span className={`w-2 h-2 rounded-full ${status === 'SAFE' ? 'bg-emerald-400' : status === 'SUSPICIOUS' ? 'bg-amber-400' : 'bg-red-400'} pulse-dot`} />
      {status}
    </span>
  )
}

/* ─── Decision Badge ─── */
function DecisionBadge({ decision }: { decision: Decision }) {
  const cfg: Record<Decision, { bg: string; text: string; icon: string }> = {
    ALLOW:  { bg: 'bg-emerald-500/20 border-emerald-500/30', text: 'text-emerald-300', icon: '✓' },
    VERIFY: { bg: 'bg-amber-500/20 border-amber-500/30',   text: 'text-amber-300',   icon: '⚠' },
    BLOCK:  { bg: 'bg-red-500/20 border-red-500/30',       text: 'text-red-300',     icon: '✕' },
  }
  const c = cfg[decision]
  return (
    <span className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold tracking-wider border ${c.bg} ${c.text}`}>
      <span className="text-lg">{c.icon}</span>
      {decision}
    </span>
  )
}

/* ─── Risk Bar ─── */
function RiskBar({ score }: { score: number }) {
  const color =
    score < 30 ? 'from-emerald-500 to-emerald-400'
    : score < 60 ? 'from-amber-500 to-amber-400'
    : 'from-red-500 to-red-400'
  return (
    <div className="w-full">
      <div className="flex justify-between mb-1.5">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Risk Score</span>
        <span className="text-xs font-bold text-white">{score}/100</span>
      </div>
      <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} animate-fill`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}

/* ─── Mode Badge (LIVE AUDIO vs DEMO SIMULATION) ─── */
function ModeBadge({ mode }: { mode: 'live' | 'demo' }) {
  if (mode === 'live') {
    return (
      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/30">
        <span className="w-2 h-2 rounded-full bg-cyan-400 pulse-dot" />
        <span className="text-xs font-bold text-cyan-300 uppercase tracking-widest">Live Audio</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30">
      <span className="w-2 h-2 rounded-full bg-amber-400 pulse-dot" />
      <span className="text-xs font-bold text-amber-300 uppercase tracking-widest">Demo Simulation</span>
    </span>
  )
}

/* ─── Live Result Display ─── */
function LiveResultCard({ result }: { result: LiveResult }) {
  return (
    <section className="fade-in-up">
      <div className="bg-vs-card/80 backdrop-blur-xl rounded-2xl border border-vs-border p-6 mb-6 glow-ring">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 pulse-dot" />
                Prototype Audio Analysis
              </h2>
              <ModeBadge mode="live" />
            </div>
            <p className="text-lg font-bold text-white">{result.label}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Processed in {result.analysisTime} · Duration: {result.duration}s
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={result.status} />
            <DecisionBadge decision={result.decision} />
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-vs-darker/40 rounded-xl p-4 border border-vs-border/30 text-center">
            <p className="text-2xl font-bold text-white">{result.duration}s</p>
            <p className="text-[11px] text-slate-400 uppercase tracking-wider mt-1">Duration</p>
          </div>
          <div className="bg-vs-darker/40 rounded-xl p-4 border border-vs-border/30 text-center">
            <p className="text-2xl font-bold text-white">{result.voiceActivity}%</p>
            <p className="text-[11px] text-slate-400 uppercase tracking-wider mt-1">Voice Activity</p>
          </div>
          <div className="bg-vs-darker/40 rounded-xl p-4 border border-vs-border/30 text-center">
            <p className={`text-2xl font-bold ${
              result.audioQuality === 'Excellent' ? 'text-emerald-400' :
              result.audioQuality === 'Good' ? 'text-cyan-400' :
              result.audioQuality === 'Fair' ? 'text-amber-400' : 'text-red-400'
            }`}>{result.audioQuality}</p>
            <p className="text-[11px] text-slate-400 uppercase tracking-wider mt-1">Audio Quality</p>
          </div>
          <div className="bg-vs-darker/40 rounded-xl p-4 border border-vs-border/30 text-center">
            <p className="text-2xl font-bold text-white">{result.peakAmplitude}</p>
            <p className="text-[11px] text-slate-400 uppercase tracking-wider mt-1">Peak Amplitude</p>
          </div>
        </div>

        {/* Risk bar */}
        <div className="bg-vs-darker/40 rounded-xl p-5 border border-vs-border/30">
          <RiskBar score={result.riskScore} />
        </div>
      </div>

      {/* Live disclaimer */}
      <div className="bg-cyan-500/5 border border-cyan-500/15 rounded-xl p-4 text-center">
        <p className="text-[11px] text-cyan-400/80 font-medium">
          🎙 PROTOTYPE AUDIO ANALYSIS — Metrics are computed from real audio via Web Audio API.
          Risk score is a signal-quality heuristic, not a spoof/deepfake detector. No ML model is running.
        </p>
      </div>
    </section>
  )
}

/* ─── Demo Result Display ─── */
function DemoResultCard({ result }: { result: DemoResult }) {
  return (
    <section className="fade-in-up">
      <div className="bg-vs-card/80 backdrop-blur-xl rounded-2xl border border-vs-border p-6 mb-6 glow-ring">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 pulse-dot" />
                Demo Analysis Result
              </h2>
              <ModeBadge mode="demo" />
            </div>
            <p className="text-lg font-bold text-white">{result.label}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Processed in {result.analysisTime} · Confidence: {result.confidence}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={result.status} />
            <DecisionBadge decision={result.decision} />
          </div>
        </div>

        {/* Gauges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-vs-darker/40 rounded-xl p-5 flex justify-center border border-vs-border/30">
            <CircularGauge
              value={result.speakerMatch}
              label="Speaker Match"
              color="#10b981"
            />
          </div>
          <div className="bg-vs-darker/40 rounded-xl p-5 flex justify-center border border-vs-border/30">
            <CircularGauge
              value={result.spoofProbability}
              label="Spoof Probability"
              color={result.spoofProbability > 70 ? '#ef4444' : result.spoofProbability > 40 ? '#f59e0b' : '#10b981'}
            />
          </div>
          <div className="bg-vs-darker/40 rounded-xl p-5 flex flex-col items-center justify-center border border-vs-border/30 gap-4">
            <RiskBar score={result.riskScore} />
          </div>
        </div>
      </div>

      {/* Demo disclaimer */}
      <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4 text-center">
        <p className="text-[11px] text-amber-400/80 font-medium">
          ⚠ DEMO SIMULATION — These values are hard-coded fixtures for demonstration purposes only. They do not represent real ML predictions or actual audio analysis.
        </p>
      </div>
    </section>
  )
}

/* ─══════════════════════════════════════════════════════════─
   MAIN APP
   ─══════════════════════════════════════════════════════════─ */
export default function App() {
  const [isRecording, setIsRecording] = useState(false)
  const [hasAudio, setHasAudio] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzingMode, setAnalyzingMode] = useState<'live' | 'demo' | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [activeDemo, setActiveDemo] = useState<DemoScenario | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioBlobRef = useRef<Blob | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* ── Recording ── */
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []
      audioBlobRef.current = null

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        audioBlobRef.current = blob
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
      setResult(null)
      setRecordingTime(0)
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000)
    } catch {
      alert('Microphone access denied. Please allow microphone access and try again.')
    }
  }, [])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop())
    setIsRecording(false)
    setHasAudio(true)
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  /* ── Upload ── */
  const handleUpload = useCallback(() => {
    fileInputRef.current?.click()
  }, [])
  const onFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      audioBlobRef.current = e.target.files[0]
      setHasAudio(true)
      setResult(null)
    }
  }, [])

  /* ── Analyze LIVE audio ── */
  const analyzeVoice = useCallback(async () => {
    const blob = audioBlobRef.current
    if (!blob) {
      alert('No audio captured. Please record or upload audio first.')
      return
    }
    setAnalyzing(true)
    setAnalyzingMode('live')
    setResult(null)
    try {
      const res = await analyzeLiveAudio(blob)
      setResult(res)
    } catch (err) {
      console.error('Live analysis error:', err)
      alert('Could not analyze audio. The recording may be too short or in an unsupported format.')
    }
    setAnalyzing(false)
    setAnalyzingMode(null)
  }, [])

  /* ── Demo scenario buttons ── */
  const runDemo = useCallback(async (scenario: DemoScenario) => {
    setActiveDemo(scenario)
    setAnalyzing(true)
    setAnalyzingMode('demo')
    setResult(null)
    const res = await runDemoAnalysis(scenario)
    setResult(res)
    setAnalyzing(false)
    setAnalyzingMode(null)
    setActiveDemo(null)
  }, [])

  /* Cleanup timer */
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="scanlines relative min-h-screen">
      <div className="bg-mesh" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        {/* ── Header ── */}
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-vs-accent to-vs-glow-cyan flex items-center justify-center shadow-lg shadow-vs-accent/30">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-vs-accent-light via-vs-glow-cyan to-vs-glow-purple bg-clip-text text-transparent">
                VoiceShield
              </span>
              <span className="text-white ml-1">AI</span>
            </h1>
          </div>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Real-time voice authentication &amp; deepfake detection dashboard
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 pulse-dot" />
            <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-widest">Hackathon Prototype</span>
          </div>
        </header>

        {/* ── Voice Input Card (LIVE MODE) ── */}
        <section className="bg-vs-card/80 backdrop-blur-xl rounded-2xl border border-vs-border p-6 mb-6 glow-ring">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 pulse-dot" />
              Live Voice Input
            </h2>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-widest">Analyzes Real Audio</span>
            </span>
          </div>

          {/* Waveform */}
          <div className="bg-vs-darker/60 rounded-xl p-4 mb-5 border border-vs-border/50">
            <Waveform active={isRecording || (analyzing && analyzingMode === 'live')} intensity={analyzing ? 0.6 : 1} />
            {isRecording && (
              <div className="text-center mt-2">
                <span className="text-xs font-mono text-red-400 flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 pulse-dot" />
                  REC {formatTime(recordingTime)}
                </span>
              </div>
            )}
            {analyzing && analyzingMode === 'live' && (
              <div className="text-center mt-2">
                <span className="text-xs font-mono text-cyan-400">Analyzing real audio signal...</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              id="btn-record"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={analyzing}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isRecording
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                  : 'bg-vs-accent/15 text-vs-accent-light border border-vs-accent/30 hover:bg-vs-accent/25 hover:shadow-lg hover:shadow-vs-accent/10'
              }`}
            >
              {isRecording ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="6"/></svg>
              )}
              {isRecording ? 'Stop Recording' : 'Record Voice'}
            </button>

            <button
              id="btn-upload"
              onClick={handleUpload}
              disabled={analyzing || isRecording}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-800/60 text-slate-300 border border-vs-border hover:bg-slate-700/60 hover:text-white transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
              </svg>
              Upload Audio
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={onFileSelected}
              className="hidden"
            />

            <button
              id="btn-analyze"
              onClick={analyzeVoice}
              disabled={!hasAudio || analyzing || isRecording}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-500 to-vs-glow-cyan text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              Analyze Voice
            </button>
          </div>

          {hasAudio && !analyzing && !result && (
            <p className="mt-3 text-xs text-emerald-400/70 flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              Audio ready — click Analyze Voice for real audio analysis
            </p>
          )}
        </section>

        {/* ── Demo Scenarios ── */}
        <section className="bg-vs-card/80 backdrop-blur-xl rounded-2xl border border-vs-border p-6 mb-6 glow-ring">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 pulse-dot" />
              Demo Scenarios
            </h2>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-widest">Simulated Data</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mb-4">
            ⚠ These buttons show deterministic demo fixtures — no real audio is analyzed
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Authentic */}
            <button
              id="btn-demo-authentic"
              onClick={() => runDemo('authentic')}
              disabled={analyzing}
              className="group relative overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-left hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-lg">✓</div>
                <span className="font-bold text-emerald-300 text-sm">Authentic Voice</span>
              </div>
              <p className="text-[11px] text-slate-500">4% spoof · SAFE · ALLOW</p>
              {activeDemo === 'authentic' && <div className="absolute inset-0 shimmer rounded-xl" />}
            </button>

            {/* AI Cloned */}
            <button
              id="btn-demo-cloned"
              onClick={() => runDemo('cloned')}
              disabled={analyzing}
              className="group relative overflow-hidden rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-left hover:bg-red-500/10 hover:border-red-500/40 transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400 text-lg">⚡</div>
                <span className="font-bold text-red-300 text-sm">AI Cloned Voice</span>
              </div>
              <p className="text-[11px] text-slate-500">91% spoof · CRITICAL · BLOCK CALL</p>
              {activeDemo === 'cloned' && <div className="absolute inset-0 shimmer rounded-xl" />}
            </button>

            {/* Impersonation */}
            <button
              id="btn-demo-impersonation"
              onClick={() => runDemo('impersonation')}
              disabled={analyzing}
              className="group relative overflow-hidden rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-left hover:bg-amber-500/10 hover:border-amber-500/40 transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 text-lg">👤</div>
                <span className="font-bold text-amber-300 text-sm">Impersonation</span>
              </div>
              <p className="text-[11px] text-slate-500">62% spoof · CRITICAL · BLOCK CALL</p>
              {activeDemo === 'impersonation' && <div className="absolute inset-0 shimmer rounded-xl" />}
            </button>
          </div>
        </section>

        {/* ── Analyzing Spinner ── */}
        {analyzing && !result && (
          <section className="bg-vs-card/80 backdrop-blur-xl rounded-2xl border border-vs-border p-10 mb-6 text-center">
            <div className="inline-flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-vs-accent-light" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <span className={`font-semibold text-sm ${analyzingMode === 'live' ? 'text-cyan-400' : 'text-amber-400'}`}>
                {analyzingMode === 'live' ? 'Analyzing real audio…' : 'Running demo simulation…'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {analyzingMode === 'live'
                ? 'Processing actual audio signal with Web Audio API'
                : 'Loading deterministic demo fixtures'
              }
            </p>
          </section>
        )}

        {/* ── Results ── */}
        {result && result.mode === 'live' && <LiveResultCard result={result} />}
        {result && result.mode === 'demo' && <DemoResultCard result={result} />}

        {/* ── Footer ── */}
        <footer className="text-center mt-10 pb-6">
          <p className="text-[11px] text-slate-600">
            VoiceShield AI · Hackathon Prototype · {new Date().getFullYear()}
          </p>
        </footer>
      </div>
    </div>
  )
}
