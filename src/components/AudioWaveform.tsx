import { useEffect, useState } from 'react'

interface AudioWaveformProps {
  isRecording: boolean
  hasAudio: boolean
}

export default function AudioWaveform({ isRecording, hasAudio }: AudioWaveformProps) {
  const [heights, setHeights] = useState<number[]>(Array(36).fill(15))

  useEffect(() => {
    if (!isRecording) {
      setHeights(Array(36).fill(hasAudio ? 25 : 12))
      return
    }

    const interval = setInterval(() => {
      setHeights(
        Array(36)
          .fill(0)
          .map(() => Math.floor(Math.random() * 75) + 15)
      )
    }, 120)

    return () => clearInterval(interval)
  }, [isRecording, hasAudio])

  return (
    <div className="h-20 bg-vs-darker/60 rounded-xl border border-vs-border/40 p-4 flex items-center justify-center gap-1 overflow-hidden">
      {heights.map((h, idx) => (
        <div
          key={idx}
          className={`w-1 rounded-full transition-all duration-150 ${
            isRecording
              ? 'bg-gradient-to-t from-cyan-500 to-emerald-400'
              : hasAudio
              ? 'bg-cyan-500/40'
              : 'bg-slate-700/40'
          }`}
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  )
}
