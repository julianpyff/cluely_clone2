import { app, BrowserWindow } from "electron"
import { spawn, ChildProcessWithoutNullStreams } from "child_process" // Added spawn
import path from "path" // Added path for script location
import { initializeIpcHandlers } from "./ipcHandlers"
import { WindowHelper } from "./WindowHelper"
import { ScreenshotHelper } from "./ScreenshotHelper"
import { ShortcutsHelper } from "./shortcuts"
import { ProcessingHelper } from "./ProcessingHelper"

export class AppState {
  private static instance: AppState | null = null
  public pythonProcess: ChildProcessWithoutNullStreams | null = null // Added pythonProcess

  private windowHelper: WindowHelper
  private screenshotHelper: ScreenshotHelper
  public shortcutsHelper: ShortcutsHelper
  public processingHelper: ProcessingHelper

  // View management
  private view: "queue" | "solutions" = "queue"

  private problemInfo: {
    problem_statement: string
    input_format: Record<string, any>
    output_format: Record<string, any>
    constraints: Array<Record<string, any>>
    test_cases: Array<Record<string, any>>
  } | null = null // Allow null

  private hasDebugged: boolean = false

  // Processing events
  public readonly PROCESSING_EVENTS = {
    //global states
    UNAUTHORIZED: "procesing-unauthorized",
    NO_SCREENSHOTS: "processing-no-screenshots",

    //states for generating the initial solution
    INITIAL_START: "initial-start",
    PROBLEM_EXTRACTED: "problem-extracted",
    SOLUTION_SUCCESS: "solution-success",
    INITIAL_SOLUTION_ERROR: "solution-error",

    //states for processing the debugging
    DEBUG_START: "debug-start",
    DEBUG_SUCCESS: "debug-success",
    DEBUG_ERROR: "debug-error"
  } as const

  constructor() {
    // Initialize WindowHelper with this
    this.windowHelper = new WindowHelper(this)

    // Initialize ScreenshotHelper
    this.screenshotHelper = new ScreenshotHelper(this.view)

    // Initialize ProcessingHelper
    this.processingHelper = new ProcessingHelper(this)

    // Initialize ShortcutsHelper
    this.shortcutsHelper = new ShortcutsHelper(this)
  }

  public static getInstance(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState()
    }
    return AppState.instance
  }

  // Getters and Setters
  public getMainWindow(): BrowserWindow | null {
    return this.windowHelper.getMainWindow()
  }

  public getView(): "queue" | "solutions" {
    return this.view
  }

  public setView(view: "queue" | "solutions"): void {
    this.view = view
    this.screenshotHelper.setView(view)
  }

  public isVisible(): boolean {
    return this.windowHelper.isVisible()
  }

  public getScreenshotHelper(): ScreenshotHelper {
    return this.screenshotHelper
  }

  public getProblemInfo(): any {
    return this.problemInfo
  }

  public setProblemInfo(problemInfo: any): void {
    this.problemInfo = problemInfo
  }

  public getScreenshotQueue(): string[] {
    return this.screenshotHelper.getScreenshotQueue()
  }

  public getExtraScreenshotQueue(): string[] {
    return this.screenshotHelper.getExtraScreenshotQueue()
  }

  // Window management methods
  public createWindow(): void {
    this.windowHelper.createWindow()
  }

  public hideMainWindow(): void {
    this.windowHelper.hideMainWindow()
  }

  public getPythonProcess(): ChildProcessWithoutNullStreams | null {
    return this.pythonProcess
  }

  public startPythonProcess(): void {
    if (this.pythonProcess) {
      console.log("Python process already running.")
      return
    }

    // Determine the path to the script. This assumes the script is in 'python_core' relative to the app root.
    // In a packaged app, paths might need adjustment (e.g., using app.getAppPath()).
    const scriptPath = path.join(app.getAppPath(), "python_core", "agent_s_wrapper.py")
    // For development, if electron/main.js is in dist-electron, and python_core is at root:
    // const scriptPath = path.join(__dirname, "..", "..", "python_core", "agent_s_wrapper.py");
    // Simplified for now, assuming execution from project root during dev:
    const pythonExecutable = "python3" // Or could be a path to a venv python

    console.log(`Spawning Python script: ${pythonExecutable} ${scriptPath}`)

    this.pythonProcess = spawn(pythonExecutable, [
      "-u", // Unbuffered stdout/stderr
      scriptPath
    ])

    this.pythonProcess.stdout.on("data", (data: Buffer) => {
      const rawMessages = data.toString().split('\n').filter(m => m.trim() !== "");
      rawMessages.forEach(message => {
        console.log(`[Python STDOUT Raw Line]: ${message}`);
        try {
          const jsonData = JSON.parse(message);
          console.log("[Python JSON Parsed]:", jsonData);

          // Check if this is an agent response meant for the chat UI
          // The Python wrapper should structure its output consistently.
          // For example, if jsonData has a specific type or flag indicating it's an agent response.
          // For now, we'll assume any valid JSON from Python's stdout is an agent response.
          // More specific filtering can be added if Python sends other types of JSON messages to stdout.
          if (this.getMainWindow() && jsonData) {
            // AGENT_EVENTS.AGENT_RESPONSE should be "agent-response"
            this.getMainWindow()?.webContents.send("agent-response", jsonData);
            console.log("[Electron->Renderer] Forwarded agent response:", jsonData);
          }
        } catch (e) {
          // If it's not JSON, it might be a regular print/log from Python, not an agent message.
          // The Python wrapper is configured to log to stdout as well, so we might get those here.
          // We only want to forward structured JSON agent responses to the renderer.
          // Logging non-JSON stdout is already handled by the initial console.log.
          // No need for an error here unless we expect ONLY JSON.
           console.log("[Python STDOUT Not JSON or for logging only]:", message.trim())
        }
      });
    })

    this.pythonProcess.stderr.on("data", (data: Buffer) => {
      console.error(`[Python STDERR]: ${data.toString().trim()}`)
    })

    this.pythonProcess.on("spawn", () => {
      console.log("Python process spawned successfully.")
      // Send a test message
      const testMessage = { type: "test_ping", data: "Hello from Electron!" , timestamp: Date.now() }
      this.sendToPython(testMessage)
    })

    this.pythonProcess.on("error", (err) => {
      console.error("Failed to start Python process:", err)
      this.pythonProcess = null
    })

    this.pythonProcess.on("close", (code, signal) => {
      console.log(
        `Python process closed with code ${code} and signal ${signal}`
      )
      this.pythonProcess = null
      // Optionally, try to restart or notify the user
    })
  }

  public sendToPython(message: any): boolean {
    if (this.pythonProcess && this.pythonProcess.stdin) {
      try {
        const jsonMessage = JSON.stringify(message) + "\n" // Add newline as a delimiter
        this.pythonProcess.stdin.write(jsonMessage)
        console.log(`[Electron->Python] Sent: ${jsonMessage.trim()}`)
        return true
      } catch (error) {
        console.error("Error sending message to Python:", error)
        console.error("Original message:", message)
        return false
      }
    } else {
      console.error("Python process not running or stdin not available.")
      return false
    }
  }

  public stopPythonProcess(): void {
    if (this.pythonProcess) {
      console.log("Stopping Python process...")
      this.pythonProcess.kill() // Sends SIGTERM
      this.pythonProcess = null
    }
  }

  public hideMainWindow(): void {
    this.windowHelper.hideMainWindow()
  }

  public showMainWindow(): void {
    this.windowHelper.showMainWindow()
  }

  public toggleMainWindow(): void {
    console.log(
      "Screenshots: ",
      this.screenshotHelper.getScreenshotQueue().length,
      "Extra screenshots: ",
      this.screenshotHelper.getExtraScreenshotQueue().length
    )
    this.windowHelper.toggleMainWindow()
  }

  public setWindowDimensions(width: number, height: number): void {
    this.windowHelper.setWindowDimensions(width, height)
  }

  public clearQueues(): void {
    this.screenshotHelper.clearQueues()

    // Clear problem info
    this.problemInfo = null

    // Reset view to initial state
    this.setView("queue")
  }

  // Screenshot management methods
  public async takeScreenshot(): Promise<string> {
    if (!this.getMainWindow()) throw new Error("No main window available")

    const screenshotPath = await this.screenshotHelper.takeScreenshot(
      () => this.hideMainWindow(),
      () => this.showMainWindow()
    )

    return screenshotPath
  }

  public async getImagePreview(filepath: string): Promise<string> {
    return this.screenshotHelper.getImagePreview(filepath)
  }

  public async deleteScreenshot(
    path: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.screenshotHelper.deleteScreenshot(path)
  }

  // New methods to move the window
  public moveWindowLeft(): void {
    this.windowHelper.moveWindowLeft()
  }

  public moveWindowRight(): void {
    this.windowHelper.moveWindowRight()
  }
  public moveWindowDown(): void {
    this.windowHelper.moveWindowDown()
  }
  public moveWindowUp(): void {
    this.windowHelper.moveWindowUp()
  }

  public setHasDebugged(value: boolean): void {
    this.hasDebugged = value
  }

  public getHasDebugged(): boolean {
    return this.hasDebugged
  }
}

// Application initialization
async function initializeApp() {
  const appState = AppState.getInstance()

  // Initialize IPC handlers before window creation
  initializeIpcHandlers(appState)

  app.whenReady().then(() => {
    console.log("App is ready")
    appState.createWindow()
    appState.startPythonProcess() // Start Python process
    // Register global shortcuts using ShortcutsHelper
    appState.shortcutsHelper.registerGlobalShortcuts()
  })

  app.on("activate", () => {
    console.log("App activated")
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (appState.getMainWindow() === null) { // Check if window is null before creating
      appState.createWindow()
    } else if (appState.getMainWindow() && !appState.getMainWindow()?.isVisible()) {
      // If window exists but is hidden (e.g. after Cmd+B), show it.
      // This might be handled by toggleMainWindow better, depending on desired behavior.
      appState.showMainWindow();
    }
  })

  // Quit when all windows are closed, except on macOS
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit()
    }
  })

  app.on("will-quit", () => {
    appState.stopPythonProcess() // Ensure Python process is stopped on quit
  })

  app.dock?.hide() // Hide dock icon (optional)
  app.commandLine.appendSwitch("disable-background-timer-throttling")
}

// Start the application
initializeApp().catch(console.error)
