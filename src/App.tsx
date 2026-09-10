import { useState, useRef, useCallback } from 'react'
import CircularGauge from './components/CircularGauge'
import AudioWaveform from './components/AudioWaveform'
import {
  runDemoAnalysis,
  analyzeLiveAudio,
  registerClientSpeaker,
  type AnalysisResult,
  type LiveResult,
  type DemoResult,
  type DemoScenario,
  type Status,
  type Decision,
} from './demoEngine'

function StatusBadge({ status }: { status: Status }) {
  const cfg: Record<Status, { bg: string; text: string; dot: string }> = {
    SAFE:       { bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-400' },
    SUSPICIOUS: { bg: 'bg-amber-500/10 border-amber-500/30',     text: 'text-amber-400',   dot: 'bg-amber-400' },
    CRITICAL:   { bg: 'bg-red-500/10 border-red-500/30',         text: 'text-red-400',     dot: 'bg-red-400' },
  }
  const c = cfg[status]
  return (
    <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide border ${c.bg} ${c.text}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot} animate-pulse`} />
      {status}
    </span>
  )
}

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

function ModeBadge({ mode }: { mode: 'live' | 'demo' }) {
  if (mode === 'live') {
    return (
      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/30">
        <span className="w-2 h-2 rounded-full bg-cyan-400 pulse-dot" />
        <span className="text-xs font-bold text-cyan-300 uppercase tracking-widest">Real-Time Analysis</span>
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

function LiveResultCard({ result }: { result: LiveResult }) {
  return (
    <section className="fade-in-up">
      <div className="bg-vs-card/80 backdrop-blur-xl rounded-2xl border border-vs-border p-6 mb-6 glow-ring">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 pulse-dot" />
                Voice Analysis Results
              </h2>
              <ModeBadge mode="live" />
            </div>
            <p className="text-lg font-bold text-white">{result.label}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Engine: {result.modelArchitecture} · Latency: {result.analysisTime} · Audio: {result.duration}s
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={result.status} />
            <DecisionBadge decision={result.decision} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          <div className="bg-vs-darker/40 rounded-xl p-5 flex flex-col items-center justify-center border border-vs-border/30 text-center">
            <CircularGauge
              value={result.spoofProbability}
              label="Spoof Probability"
              color={result.spoofProbability > 50 ? '#ef4444' : result.spoofProbability > 30 ? '#f59e0b' : '#10b981'}
            />
            <span className={`mt-2 text-xs font-bold px-3 py-1 rounded-full ${
              result.isSpoof ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {result.prediction}
            </span>
          </div>

          <div className="bg-vs-darker/40 rounded-xl p-5 flex flex-col items-center justify-center border border-vs-border/30 text-center">
            <CircularGauge
              value={result.speakerMatch}
              label="Speaker Match"
              color="#10b981"
            />
            <span className="mt-2 text-[11px] text-slate-400">
              {result.speakerRegistered ? '✓ Enrolled Voice Profile' : 'Baseline Speaker Profile'}
            </span>
          </div>

          <div className="bg-vs-darker/40 rounded-xl p-5 flex flex-col items-center justify-center border border-vs-border/30 text-center">
            <div className="w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-2xl font-bold mb-2">
              🌐
            </div>
            <p className="text-xl font-bold text-white">{result.detectedLanguage}</p>
            <p className="text-xs text-cyan-400/90 font-medium mt-0.5">
              Speech Analysis ({result.languageConfidence}% conf)
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              Pitch: {result.pitchMeanHz} Hz · Tempo: {result.speechTempoBpm} BPM
            </p>
          </div>
        </div>

        <div className="bg-vs-darker/40 rounded-xl p-5 border border-vs-border/30 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center border-b border-vs-border/20 pb-4">
            <div>
              <p className="text-xs text-slate-400 uppercase">Duration</p>
              <p className="text-base font-bold text-white">{result.duration}s</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Voice Activity</p>
              <p className="text-base font-bold text-white">{result.voiceActivity}%</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase">Quality Grade</p>
              <p className="text-base font-bold text-emerald-400">{result.audioQuality}</p>
            </div>
          </div>
          <RiskBar score={result.riskScore} />
        </div>
      </div>
    </section>
  )
}

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

      <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4 text-center">
        <p className="text-[11px] text-amber-400/80 font-medium">
          Scenario Analysis Completed
        </p>
      </div>
    </section>
  )
}

export default function App() {
  const [isRecording, setIsRecording] = useState(false)
  const [hasAudio, setHasAudio] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzingMode, setAnalyzingMode] = useState<'live' | 'demo' | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [activeDemo, setActiveDemo] = useState<DemoScenario | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [enrolling, setEnrolling] = useState(false)
  const [enrollMessage, setEnrollMessage] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioBlobRef = useRef<Blob | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const startRecording = async () => {
    try {
      setErrorMessage(null)
      setEnrollMessage(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        audioBlobRef.current = audioBlob
        setHasAudio(true)
        setResult(null)
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start(100)
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Microphone access error:', err)
      setErrorMessage('Microphone access denied or unavailable.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null)
    setEnrollMessage(null)
    const file = event.target.files?.[0]
    if (file) {
      audioBlobRef.current = file
      setHasAudio(true)
      setResult(null)
    }
  }

  const analyzeVoice = useCallback(async () => {
    const blob = audioBlobRef.current
    if (!blob) return

    setAnalyzing(true)
    setAnalyzingMode('live')
    setActiveDemo(null)
    setResult(null)
    setErrorMessage(null)

    try {
      const res = await analyzeLiveAudio(blob)
      setResult(res)
    } catch (err: any) {
      setErrorMessage(err.message || 'Analysis failed.')
    } finally {
      setAnalyzing(false)
      setAnalyzingMode(null)
    }
  }, [])

  const registerSpeaker = useCallback(async () => {
    const blob = audioBlobRef.current
    if (!blob) return

    setEnrolling(true)
    setEnrollMessage(null)
    setErrorMessage(null)

    try {
      const res = await registerClientSpeaker(blob)
      setEnrollMessage(`✓ Voice Profile Successfully Enrolled for Speaker Verification! (Pitch: ${res.pitchHz} Hz)`)
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to register speaker profile.')
    } finally {
      setEnrolling(false)
    }
  }, [])

  const runDemo = useCallback(async (scenario: DemoScenario) => {
    setAnalyzing(true)
    setAnalyzingMode('demo')
    setActiveDemo(scenario)
    setResult(null)
    setErrorMessage(null)

    const res = await runDemoAnalysis(scenario)
    setResult(res)
    setAnalyzing(false)
    setAnalyzingMode(null)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-vs-dark text-slate-100 font-sans selection:bg-vs-accent selection:text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col sm:flex-row items-center justify-between pb-6 mb-8 border-b border-vs-border gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-vs-dark rounded-[10px] flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="22"/>
                  <line x1="8" y1="22" x2="16" y2="22"/>
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                VoiceShield <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">AI</span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">AI Voice Deepfake Detection & Speaker Verification Security</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 pulse-dot" />
            <span className="text-xs font-semibold text-slate-300">System Active</span>
          </div>
        </header>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠</span>
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-white font-bold ml-4">✕</button>
          </div>
        )}

        {enrollMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">✓</span>
              <span>{enrollMessage}</span>
            </div>
            <button onClick={() => setEnrollMessage(null)} className="text-emerald-400 hover:text-white font-bold ml-4">✕</button>
          </div>
        )}

        <section className="bg-vs-card/80 backdrop-blur-xl rounded-2xl border border-vs-border p-6 mb-6 glow-ring">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Live Audio Input
            </h2>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-widest">Real Audio</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <button
              id="btn-record-voice"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={analyzing}
              className={`flex items-center justify-center gap-3 p-4 rounded-xl border font-semibold text-sm transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isRecording
                  ? 'bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30 animate-pulse'
                  : 'bg-vs-darker/60 border-vs-border/60 text-slate-200 hover:bg-cyan-500/10 hover:border-cyan-500/30'
              }`}
            >
              <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-400 animate-ping' : 'bg-cyan-400'}`} />
              <span>{isRecording ? `Recording... (${formatTime(recordingTime)}) — Click to Stop` : 'Record Voice'}</span>
            </button>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
                id="audio-upload-input"
              />
              <button
                id="btn-upload-audio"
                onClick={() => fileInputRef.current?.click()}
                disabled={analyzing}
                className="w-full flex items-center justify-center gap-3 p-4 rounded-xl border border-vs-border/60 bg-vs-darker/60 text-slate-200 font-semibold text-sm hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <span>Upload Audio</span>
              </button>
            </div>
          </div>

          <div className="mb-6">
            <AudioWaveform isRecording={isRecording} hasAudio={hasAudio} />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              id="btn-analyze"
              onClick={analyzeVoice}
              disabled={!hasAudio || analyzing || isRecording}
              className="flex-1 w-full py-4 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-vs-dark font-black text-base uppercase tracking-wider hover:opacity-90 transition-all duration-300 shadow-lg shadow-cyan-500/25 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
            >
              Analyze Voice
            </button>

            <button
              id="btn-enroll"
              onClick={registerSpeaker}
              disabled={!hasAudio || analyzing || enrolling || isRecording}
              className="w-full sm:w-auto py-4 px-5 rounded-xl bg-vs-darker border border-emerald-500/40 text-emerald-400 font-bold text-xs uppercase tracking-wider hover:bg-emerald-500/10 transition-all duration-300 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {enrolling ? 'Enrolling...' : 'Register Speaker Voice'}
            </button>
          </div>

          {hasAudio && !analyzing && !result && (
            <p className="mt-3 text-xs text-emerald-400/70 flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              Audio loaded — Click "Analyze Voice" to begin analysis
            </p>
          )}
        </section>

        <section className="bg-vs-card/80 backdrop-blur-xl rounded-2xl border border-vs-border p-6 mb-6 glow-ring">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 pulse-dot" />
              Demo Scenarios
            </h2>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-widest">Preset Profiles</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

        {analyzing && !result && (
          <section className="bg-vs-card/80 backdrop-blur-xl rounded-2xl border border-vs-border p-10 mb-6 text-center">
            <div className="inline-flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-vs-accent-light" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <span className={`font-semibold text-sm ${analyzingMode === 'live' ? 'text-cyan-400' : 'text-amber-400'}`}>
                {analyzingMode === 'live' ? 'Analyzing Voice & Audio Features…' : 'Running demo simulation…'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {analyzingMode === 'live'
                ? 'Processing audio waveform and spectral features'
                : 'Loading deterministic demo fixtures'
              }
            </p>
          </section>
        )}

        {result && result.mode === 'live' && <LiveResultCard result={result} />}
        {result && result.mode === 'demo' && <DemoResultCard result={result} />}

        <footer className="text-center mt-10 pb-6">
          <p className="text-xs text-slate-500">
            VoiceShield AI Security System · Audio Deepfake Detector & Speaker Verification Engine
          </p>
        </footer>
      </div>
    </div>
  )
}
