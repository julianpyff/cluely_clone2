import React, { useState, useEffect, useRef } from "react"
import { IoLogOutOutline } from "react-icons/io5"
import { Dialog, DialogContent, DialogClose } from "../ui/dialog"

interface QueueCommandsProps {
  onTooltipVisibilityChange: (visible: boolean, height: number) => void
  screenshots: Array<{ path: string; preview: string }>
  onChatToggle: () => void
}

const QueueCommands: React.FC<QueueCommandsProps> = ({
  onTooltipVisibilityChange,
  screenshots: _screenshots,
  onChatToggle
}) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioResult, setAudioResult] = useState<string | null>(null)
  const chunks = useRef<Blob[]>([])
  // Remove all chat-related state, handlers, and the Dialog overlay from this file.

  useEffect(() => {
    let tooltipHeight = 0
    if (tooltipRef.current && isTooltipVisible) {
      tooltipHeight = tooltipRef.current.offsetHeight + 10
    }
    onTooltipVisibilityChange(isTooltipVisible, tooltipHeight)
  }, [isTooltipVisible])

  const handleMouseEnter = () => {
    setIsTooltipVisible(true)
  }

  const handleMouseLeave = () => {
    setIsTooltipVisible(false)
  }

  const handleRecordClick = async () => {
    if (!isRecording) {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const recorder = new MediaRecorder(stream)
        recorder.ondataavailable = (e) => chunks.current.push(e.data)
        recorder.onstop = async () => {
          const blob = new Blob(chunks.current, { type: chunks.current[0]?.type || 'audio/webm' })
          chunks.current = []
          // Stop all tracks to release microphone
          stream.getTracks().forEach(track => track.stop())
          const reader = new FileReader()
          reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(',')[1]
            try {
              const result = await window.electronAPI.analyzeAudioFromBase64(base64Data, blob.type)
              setAudioResult(result.text)
            } catch (err) {
              console.error('Audio analysis error:', err)
              setAudioResult('Audio analysis failed.')
            }
          }
          reader.readAsDataURL(blob)
        }
        setMediaRecorder(recorder)
        recorder.start()
        setIsRecording(true)
      } catch (err) {
        console.error('Recording error:', err)
        setAudioResult('Could not start recording.')
      }
    } else {
      // Stop recording
      mediaRecorder?.stop()
      setIsRecording(false)
      setMediaRecorder(null)
    }
  }

  // Remove handleChatSend function

  return (
    <div className="w-fit">
      <div className="text-xs text-white/90 liquid-glass-bar py-1 px-4 flex items-center justify-center gap-4 draggable-area">
        {/* Removed show/hide and screenshot controls for web */}

        {/* Voice Recording Button */}
        <div className="flex items-center gap-2">
          <button
            className={`bg-white/10 hover:bg-white/20 transition-colors rounded-md px-2 py-1 text-[11px] leading-none text-white/70 flex items-center gap-1 ${isRecording ? 'bg-red-500/70 hover:bg-red-500/90' : ''}`}
            onClick={handleRecordClick}
            type="button"
          >
            {isRecording ? (
              <span className="animate-pulse">● Stop Recording</span>
            ) : (
              <span>🎤 Record Voice</span>
            )}
          </button>
        </div>

        {/* Chat Button */}
        <div className="flex items-center gap-2">
          <button
            className="bg-white/10 hover:bg-white/20 transition-colors rounded-md px-2 py-1 text-[11px] leading-none text-white/70 flex items-center gap-1"
            onClick={onChatToggle}
            type="button"
          >
            💬 Chat
          </button>
        </div>

        {/* Add this button in the main button row, before the separator and sign out */}
        {/* Remove the Chat button */}

        {/* Removed keyboard shortcuts tooltip for web */}

        {/* Separator */}
        <div className="mx-2 h-4 w-px bg-white/20" />

        {/* Sign Out Button - Moved to end */}
        <button
          className="text-red-500/70 hover:text-red-500/90 transition-colors hover:cursor-pointer"
          title="Sign Out"
          onClick={() => window.electronAPI.quitApp()}
        >
          <IoLogOutOutline className="w-4 h-4" />
        </button>
      </div>
      {/* Audio Result Display */}
      {audioResult && (
        <div className="mt-2 p-2 bg-white/10 rounded text-white text-xs max-w-md">
          <span className="font-semibold">Audio Result:</span> {audioResult}
        </div>
      )}
      {/* Chat Dialog Overlay */}
      {/* Remove the Dialog component */}
    </div>
  )
}

export default QueueCommands
