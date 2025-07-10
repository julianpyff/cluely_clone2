// ProcessingHelper.ts

import { AppState } from "./main"
import { LLMHelper } from "./LLMHelper"
import dotenv from "dotenv"

dotenv.config()

const isDev = process.env.NODE_ENV === "development"
const isDevTest = process.env.IS_DEV_TEST === "true"
const MOCK_API_WAIT_TIME = Number(process.env.MOCK_API_WAIT_TIME) || 500

export class ProcessingHelper {
  private appState: AppState
  private llmHelper: LLMHelper
  private currentProcessingAbortController: AbortController | null = null
  private currentExtraProcessingAbortController: AbortController | null = null

  constructor(appState: AppState) {
    this.appState = appState
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not found in environment variables")
    }
    this.llmHelper = new LLMHelper(apiKey)
  }

  public async processScreenshots(): Promise<void> {
    const mainWindow = this.appState.getMainWindow()
    if (!mainWindow) return

    const view = this.appState.getView()

    if (view === "queue") {
      const screenshotQueue = this.appState.getScreenshotHelper().getScreenshotQueue()
      if (screenshotQueue.length === 0) {
        mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.NO_SCREENSHOTS)
        return
      }

      // Check if last screenshot is an audio file
      const allPaths = this.appState.getScreenshotHelper().getScreenshotQueue();
      const lastPath = allPaths[allPaths.length - 1];
      if (lastPath.endsWith('.mp3') || lastPath.endsWith('.wav')) {
        mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.INITIAL_START);
        this.appState.setView('solutions');
        try {
          const audioResult = await this.llmHelper.analyzeAudioFile(lastPath);
          mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.PROBLEM_EXTRACTED, audioResult);
          this.appState.setProblemInfo({ problem_statement: audioResult.text, input_format: {}, output_format: {}, constraints: [], test_cases: [] });
          return;
        } catch (err: any) {
          console.error('Audio processing error:', err);
          mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, err.message);
          return;
        }
      }

      // NEW: Send screenshot to Agent-S via Python bridge
      mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.INITIAL_START); // Indicate processing started
      // No longer setting view to "solutions" here automatically, agent response will dictate UI changes.
      // this.appState.setView("solutions")

      const success = this.appState.sendToPython({
        type: "process_screenshot",
        payload: { image_path: lastPath }
      });

      if (!success) {
        console.error("Failed to send screenshot to Python process from ProcessingHelper.");
        mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, "Failed to send screenshot to agent for processing.");
      }
      // The response from Agent-S will be handled by the stdout listener in main.ts
      // and sent to the renderer via AGENT_EVENTS.AGENT_RESPONSE.
      // The old problemInfo setting and PROBLEM_EXTRACTED event here are now superseded by agent's response.
      return;

    } else { // Corresponds to view === "solutions" (Debug mode in original app)
      // This part is for the original app's "debug" functionality.
      // For now, we'll simplify or bypass this, as Agent-S will handle its own "debugging" or iterative processing.
      // Later, this could be a specific instruction to Agent-S.
      console.log("ProcessingHelper: 'solutions' (debug) view screenshot processing via Agent-S is TBD.");
      const extraScreenshotQueue = this.appState.getScreenshotHelper().getExtraScreenshotQueue();
      if (extraScreenshotQueue.length > 0) {
        const lastDebugImagePath = extraScreenshotQueue[extraScreenshotQueue.length - 1];
        mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.DEBUG_START);

        const success = this.appState.sendToPython({
          type: "process_screenshot", // Could be a more specific type like "debug_with_screenshot"
          payload: {
            image_path: lastDebugImagePath,
            context: "debug_mode", // Add more context if Agent-S needs it
            problem_info: this.appState.getProblemInfo() // Send existing problem context
          }
        });

        if (!success) {
          console.error("Failed to send debug screenshot to Python process.");
          mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.DEBUG_ERROR, "Failed to send debug image to agent.");
        }
        // Response handled by stdout listener.
      } else {
        console.log("No extra screenshots to process for debug view.");
        mainWindow.webContents.send(this.appState.PROCESSING_EVENTS.NO_SCREENSHOTS);
      }
      return;
    }
  }

  public cancelOngoingRequests(): void {
    if (this.currentProcessingAbortController) {
      this.currentProcessingAbortController.abort()
      this.currentProcessingAbortController = null
    }

    if (this.currentExtraProcessingAbortController) {
      this.currentExtraProcessingAbortController.abort()
      this.currentExtraProcessingAbortController = null
    }

    this.appState.setHasDebugged(false)
  }

  public async processAudioBase64(data: string, mimeType: string) {
    // For now, keep direct LLMHelper call for audio, or route through Agent-S
    // Route through Agent-S
    const success = this.appState.sendToPython({
      type: "process_audio_base64",
      payload: { data, mimeType }
    });
    if (!success) {
      console.error("Failed to send audio (base64) to Python process.");
      // Communicate error back to renderer if there's a direct promise to fulfill
      // For now, agent_response will handle async errors from Python.
      // This function is async, so it should return a promise.
      // The actual result will come via agent_response. This handler might need to change
      // if a direct response is expected by the caller.
      // For now, we'll assume the caller handles async response via AGENT_RESPONSE event.
      throw new Error("Failed to send audio (base64) to agent for processing.");
    }
    // Placeholder: return a promise that resolves when AGENT_RESPONSE is received for this specific request.
    // This is complex to implement here directly. The UI should rely on AGENT_RESPONSE event.
    // For now, return a simple acknowledgement or rely on the UI listening to AGENT_RESPONSE.
    console.log("Audio (base64) data sent to agent. Waiting for async response via AGENT_RESPONSE event.");
    // This function's return type is Promise<{text: string, timestamp: number}>
    // This will need to be refactored if we wait for a response from Python here.
    // For now, let's return a dummy promise, actual data comes via AGENT_RESPONSE.
    return Promise.resolve({text: "Audio (base64) sent to agent for processing.", timestamp: Date.now()});
  }

  public async processAudioFile(filePath: string) {
    // Route through Agent-S
     const success = this.appState.sendToPython({
      type: "process_audio_file",
      payload: { path: filePath }
    });
    if (!success) {
      console.error("Failed to send audio file to Python process.");
      throw new Error("Failed to send audio file to agent for processing.");
    }
    console.log("Audio file data sent to agent. Waiting for async response via AGENT_RESPONSE event.");
    // Similar to above, return a dummy promise.
    return Promise.resolve({text: "Audio file sent to agent for processing.", timestamp: Date.now()});
  }

  public getLLMHelper() {
    return this.llmHelper;
  }
}
