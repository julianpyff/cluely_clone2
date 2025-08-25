import React, { useCallback, useEffect, useRef, useState } from "react"

type Tip = { text: string; timestamp: number }

interface SalesCoachProps {
  isEnabled: boolean
  playbookText: string
}

const CHUNK_MS = 3500

const SalesCoach: React.FC<SalesCoachProps> = ({ isEnabled, playbookText }) => {
  const [tips, setTips] = useState<Tip[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)

  const stopRecorder = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!isEnabled) {
      stopRecorder()
      return
    }

    let cancelled = false
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const recorder = new MediaRecorder(stream)
        mediaRecorderRef.current = recorder
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
        }
        recorder.onstop = () => {
          // flush remaining
          chunksRef.current = []
        }
        recorder.start()

        // Interval-based chunking
        timerRef.current = window.setInterval(async () => {
          if (!mediaRecorderRef.current || chunksRef.current.length === 0) return
          const blob = new Blob(chunksRef.current.splice(0), { type: chunksRef.current[0]?.type || "audio/webm" })
          const reader = new FileReader()
          reader.onloadend = async () => {
            if (cancelled) return
            const base64Data = (reader.result as string).split(",")[1]
            try {
              const res = await window.electronAPI.coachAnalyzeAudioFromBase64?.(base64Data, blob.type, playbookText)
              if (res?.text) {
                setTips((prev) => [{ text: res.text, timestamp: res.timestamp }, ...prev].slice(0, 20))
              }
            } catch (err) {
              // ignore chunk errors
            }
          }
          reader.readAsDataURL(blob)
        }, CHUNK_MS)
      } catch (e) {
        // microphone blocked or unavailable; disable silently
      }
    }

    start()
    return () => {
      cancelled = true
      stopRecorder()
    }
  }, [isEnabled, playbookText, stopRecorder])

  if (!isEnabled) return null

  return (
    <div className="mt-3 p-3 rounded-md bg-white/10 text-white/90 border border-white/20 space-y-2 max-w-xl">
      <div className="text-[12px] font-medium">Live Coaching Tips</div>
      {tips.length === 0 ? (
        <div className="text-[12px] opacity-70">Listening… tips will appear here.</div>
      ) : (
        <ul className="space-y-2">
          {tips.map((t, i) => (
            <li key={t.timestamp + ":" + i} className="text-[12px] leading-[1.4]">{t.text}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default SalesCoach

