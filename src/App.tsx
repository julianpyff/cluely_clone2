import { ToastProvider } from "./components/ui/toast"
import Queue from "./_pages/Queue"
import { ToastViewport } from "@radix-ui/react-toast"
import { useEffect, useRef, useState } from "react"
import Solutions from "./_pages/Solutions"
import ChatView from "./components/Chat/ChatView" // Import ChatView
import { QueryClient, QueryClientProvider } from "react-query"

declare global {
  interface Window {
    electronAPI: {
      //RANDOM GETTER/SETTERS
      updateContentDimensions: (dimensions: {
        width: number
        height: number
      }) => Promise<void>
      getScreenshots: () => Promise<Array<{ path: string; preview: string }>>

      //GLOBAL EVENTS
      onUnauthorized: (callback: () => void) => () => void
      onScreenshotTaken: (
        callback: (data: { path: string; preview: string }) => void
      ) => () => void
      onProcessingNoScreenshots: (callback: () => void) => () => void
      onResetView: (callback: () => void) => () => void // Resets to queue view
      takeScreenshot: () => Promise<void>

      //INITIAL SOLUTION EVENTS (related to Interview Coder features)
      deleteScreenshot: (
        path: string
      ) => Promise<{ success: boolean; error?: string }>
      onSolutionStart: (callback: () => void) => () => void // Moves to solutions view
      onSolutionError: (callback: (error: string) => void) => () => void
      onSolutionSuccess: (callback: (data: any) => void) => () => void
      onProblemExtracted: (callback: (data: any) => void) => () => void

      onDebugSuccess: (callback: (data: any) => void) => () => void
      onDebugStart: (callback: () => void) => () => void
      onDebugError: (callback: (error: string) => void) => () => void

      // Audio Processing
      analyzeAudioFromBase64: (data: string, mimeType: string) => Promise<{ text: string; timestamp: number }>
      analyzeAudioFile: (path: string) => Promise<{ text: string; timestamp: number }>

      // Window/App controls
      moveWindowLeft: () => Promise<void>
      moveWindowRight: () => Promise<void>
      quitApp: () => Promise<void>

      // Agent Chat IPC
      sendUserMessageToAgent: (message: {type: string, payload: any}) => Promise<any> // Can return ack/error
      onAgentResponse: (callback: (agentMessage: any) => void) => () => void // For streaming/async agent responses
    }
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity, // Keep data fresh indefinitely unless invalidated
      cacheTime: Infinity // Keep data in cache indefinitely unless invalidated
    }
  }
})

const App: React.FC = () => {
  // Add 'chat' to the view states. Default to 'chat' for development.
  const [view, setView] = useState<"queue" | "solutions" | "debug" | "chat">("chat")
  const containerRef = useRef<HTMLDivElement>(null)

  // Effect for height monitoring and view reset
  useEffect(() => {
    // Combined effect for onResetView and initial setup for other views if needed
    const cleanupResetView = window.electronAPI.onResetView(() => {
      console.log("Received 'reset-view' message from main process. Switching to queue view.")
      queryClient.invalidateQueries() // Invalidate all queries on a general reset
      setView("queue")
    })

    // Example: Add a key listener to switch to chat view (e.g., Cmd/Ctrl+Shift+C)
    // This is just for easier debugging/testing of the chat view.
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'C') {
        console.log("Switching to Chat View via shortcut");
        setView("chat");
      }
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'Q') {
        console.log("Switching to Queue View via shortcut");
        setView("queue");
      }
    };
    window.addEventListener('keydown', handleKeyDown);


    return () => {
      cleanupResetView()
      window.removeEventListener('keydown', handleKeyDown);
    }
  }, []) // Empty dependency array, runs once on mount for setup

  useEffect(() => {
    // This effect manages dynamic window resizing based on content.
    if (!containerRef.current) return

    const updateHeight = () => {
      if (!containerRef.current) return
      const height = containerRef.current.scrollHeight
      const width = containerRef.current.scrollWidth
      window.electronAPI?.updateContentDimensions({ width, height })
    }

    const resizeObserver = new ResizeObserver(updateHeight)
    const mutationObserver = new MutationObserver(updateHeight)

    updateHeight() // Initial call

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
      mutationObserver.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      })
    }

    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [view]) // Re-run when view changes or on initial load

  useEffect(() => {
    // This effect handles listeners for events that might change the view
    // or load data for existing 'queue' and 'solutions' views.
    const cleanupSolutionStart = window.electronAPI.onSolutionStart(() => {
      console.log("Event: SolutionStart. Switching to solutions view.")
      setView("solutions")
    })

    const cleanupUnauthorized = window.electronAPI.onUnauthorized(() => {
      console.log("Event: Unauthorized. Resetting queries and switching to queue view.")
      queryClient.invalidateQueries(); // More general invalidation
      setView("queue")
    })

    const cleanupProblemExtracted = window.electronAPI.onProblemExtracted((data: any) => {
      // This logic seems tied to the 'queue' -> 'solutions' flow of Interview Coder
      // May need adjustment if chat view becomes the primary interaction point
      console.log("Event: ProblemExtracted. Data:", data)
      queryClient.setQueryData(["problem_statement"], data) // Store problem statement
      // If current view is queue, it might imply a switch to solutions or displaying info.
      // For now, just logs and sets data. View transition is handled by onSolutionStart.
    })

    return () => {
      cleanupSolutionStart()
      cleanupUnauthorized()
      cleanupProblemExtracted()
    }
  }, [queryClient]) // queryClient added as dependency

  let currentViewComponent;
  switch (view) {
    case "queue":
      currentViewComponent = <Queue setView={setView} />;
      break;
    case "solutions":
      currentViewComponent = <Solutions setView={setView} />;
      break;
    case "chat":
      currentViewComponent = <ChatView />;
      break;
    default:
      currentViewComponent = <ChatView />; // Default to chat view
  }

  return (
    <div ref={containerRef} className="min-h-0"> {/* Ensure this div takes up space for ResizeObserver */}
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          {currentViewComponent}
          <ToastViewport />
        </ToastProvider>
      </QueryClientProvider>
    </div>
  )
}

export default App
