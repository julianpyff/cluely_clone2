// Minimal web shim to replace Electron APIs for the browser build
// Provides no-op handlers for window management and screenshot features,
// and implements audio analysis and chat via Gemini in the browser.

import { GoogleGenerativeAI } from "@google/generative-ai"

type Unsubscribe = () => void

const noop = async () => {}
const onNoop = (_cb: any): Unsubscribe => () => {}

function getGeminiClient() {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY
  if (!apiKey) {
    console.warn("VITE_GEMINI_API_KEY not set; Gemini features disabled.")
    return null
  }
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    return genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
  } catch (err) {
    console.error("Failed to initialize GoogleGenerativeAI:", err)
    return null
  }
}

async function analyzeAudioFromBase64(data: string, mimeType: string) {
  const model = getGeminiClient()
  if (!model) {
    throw new Error("Gemini not configured")
  }
  const audioPart = {
    inlineData: {
      data,
      mimeType
    }
  } as const
  const prompt = `You are Wingman AI, a helpful, proactive assistant for any kind of problem or situation (not just coding). Describe this audio clip briefly and suggest a few next actions.`
  const result = await model.generateContent([prompt, audioPart])
  const response = await result.response
  const text = response.text()
  return { text, timestamp: Date.now() }
}

async function coachAnalyzeAudioFromBase64(data: string, mimeType: string, playbookText: string) {
  const model = getGeminiClient()
  if (!model) {
    throw new Error("Gemini not configured")
  }
  const audioPart = {
    inlineData: {
      data,
      mimeType
    }
  } as const
  const prompt = `You are an expert sales coach. You will receive short live audio segments from an ongoing sales call and a sales playbook.

Sales Playbook (verbatim):\n\n${playbookText.slice(0, 120000)}\n\nTask: For the given audio segment, output 2-3 concise, actionable coaching tips the rep can apply immediately. Reference relevant playbook guidance briefly (quote or section names if present). Keep total under 60 words. Plain text only.`
  const result = await model.generateContent([prompt, audioPart])
  const response = await result.response
  const text = response.text()
  return { text, timestamp: Date.now() }
}

async function chatWithGemini(message: string) {
  const model = getGeminiClient()
  if (!model) {
    throw new Error("Gemini not configured")
  }
  const result = await model.generateContent(message)
  const response = await result.response
  return response.text()
}

// Expose a browser-safe shim
;(window as any).electronAPI = {
  // Window/layout no-ops
  updateContentDimensions: noop,
  moveWindowLeft: noop,
  moveWindowRight: noop,
  moveWindowUp: noop,
  moveWindowDown: noop,
  quitApp: async () => {},

  // Screenshot-related stubs (removed capability)
  getScreenshots: async () => [],
  deleteScreenshot: async (_path: string) => ({ success: true }),
  takeScreenshot: async () => {},

  // Event listener stubs
  onUnauthorized: onNoop,
  onScreenshotTaken: onNoop,
  onProcessingNoScreenshots: onNoop,
  onResetView: onNoop,
  onSolutionStart: onNoop,
  onSolutionError: onNoop,
  onSolutionSuccess: onNoop,
  onProblemExtracted: onNoop,
  onDebugStart: onNoop,
  onDebugSuccess: onNoop,
  onDebugError: onNoop,
  onSolutionsReady: onNoop,

  // Audio-only capabilities
  analyzeAudioFromBase64,
  coachAnalyzeAudioFromBase64,
  analyzeAudioFile: async (_path: string) => {
    throw new Error("analyzeAudioFile is not supported in web")
  },

  // Generic invoke shim for selected channels
  invoke: async (channel: string, ...args: any[]) => {
    if (channel === "gemini-chat") {
      return chatWithGemini(String(args[0] ?? ""))
    }
    if (channel === "analyze-image-file") {
      throw new Error("Image analysis from file is not supported in web")
    }
    throw new Error(`Unsupported channel in web: ${channel}`)
  }
}

