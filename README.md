# Free Cluely

A desktop application to help you cheat on everything. 

## 🚀 Quick Start Guide

### Prerequisites
- Make sure you have Node.js installed on your computer
- Git installed on your computer
- A Gemini API key (get it from [Google AI Studio](https://makersuite.google.com/app/apikey))

### Installation Steps

1.  **Clone the Repository:**
    ```bash
    git clone [repository-url]
    cd your-project-directory
    ```

2.  **Install Node.js Dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Python Environment (for Agent-S Backend):**
    *   Ensure you have Python 3.9 or newer installed and available in your PATH.
    *   Navigate to the `python_core` directory:
        ```bash
        cd python_core
        ```
    *   Create a virtual environment (recommended):
        ```bash
        python3 -m venv .venv
        ```
    *   Activate the virtual environment:
        *   On macOS/Linux: `source .venv/bin/activate`
        *   On Windows: `.venv\\Scripts\\activate`
    *   Install Python dependencies:
        ```bash
        pip install -r requirements.txt
        ```
    *   Install Playwright browser binaries:
        ```bash
        playwright install --with-deps
        ```
    *   Deactivate the virtual environment when done (or keep it active if running Python scripts manually): `deactivate`
    *   Return to the project root directory: `cd ..`

4.  **Set up Environment Variables (API Keys):**
    *   Create a file named `.env` in the **project root folder**.
    *   Add your API keys. Agent-S will use these for its LLM interactions. The Python wrapper attempts to load these.
        ```dotenv
        # Required for Gemini (Google AI Studio) - User Provided
        GOOGLE_API_KEY=your_google_ai_studio_api_key_here

        # Optional: For Agent-S default/fallback models or other tools
        # OPENAI_API_KEY=your_openai_api_key_here
        # ANTHROPIC_API_KEY=your_anthropic_api_key_here

        # You can also configure the primary LLM Agent-S tries to use:
        # AGENT_S_ENGINE_TYPE="google" # or "openai", "anthropic"
        # AGENT_S_MODEL="gemini-pro"  # or "gpt-4", "claude-2"
        ```
    *   The application's Electron side (originally "Interview Coder") also used `GEMINI_API_KEY`. For consistency, ensure `GOOGLE_API_KEY` is set for Agent-S, or update Agent-S configuration if it uses a different name for Gemini keys. The current Python wrapper uses `GOOGLE_API_KEY`.

### Architecture Overview

This application now integrates **Agent-S**, a powerful Python-based agentic framework, into the existing Electron/React ("Interview Coder") application.
*   **Frontend:** Built with React (using Vite) running in the Electron renderer process. Provides the main UI, including the new agent chat interface.
*   **Electron Main Process:** Handles windowing, system interactions (screenshots, shortcuts), and acts as a bridge to the Python backend.
*   **Python Backend (`python_core`):**
    *   Runs `agent_s_wrapper.py`, which hosts and manages the Agent-S instance.
    *   Handles complex reasoning, planning, tool use (including Playwright for browser automation), and LLM interactions via Agent-S.
    *   Communicates with the Electron main process via standard input/output (JSON messages).

### Running the App

#### Method 1: Development Mode (Recommended for first run)
1. Open a terminal and run:
```bash
npm run dev -- --port 5180
```

2. Open another terminal in the same folder and run:
```bash
NODE_ENV=development npm run electron:dev
```

#### Method 2: Production Mode
```bash
npm run build
```
The built app will be in the `release` folder.

### ⚠️ Important Notes

1. **Closing the App**: 
   - Press `Cmd + Q` (Mac) or `Ctrl + Q` (Windows/Linux) to quit
   - Or use Activity Monitor/Task Manager to close `Interview Coder`
   - The X button currently doesn't work (known issue)

2. **If the app doesn't start**:
   - Make sure no other app is using port 5180
   - Try killing existing processes:
     ```bash
     # Find processes using port 5180
     lsof -i :5180
     # Kill them (replace [PID] with the process ID)
     kill [PID]
     ```

3. **Keyboard Shortcuts**:
   - `Cmd/Ctrl + B`: Toggle window visibility
   - `Cmd/Ctrl + H`: Take screenshot
   - 'Cmd/Enter': Get solution
   - `Cmd/Ctrl + Arrow Keys`: Move window

### Troubleshooting

If you see errors:
1.  Delete the `node_modules` folder.
2.  Delete `package-lock.json`.
3.  Run `npm install` again.
4.  Ensure the Python environment in `python_core` is set up correctly and dependencies are installed.
5.  Check that your API keys in the `.env` file are correct and have the necessary permissions.
6.  Try running the app again using Method 1.

### Interacting with Agent-S

The primary way to interact with the enhanced capabilities is through the new **Chat View** (accessible via `Cmd/Ctrl+Shift+C` or by setting it as the default view in `src/App.tsx` for development).

*   **Natural Language Commands:** Type instructions in plain English. Agent-S will attempt to understand, plan, and execute them.
    *   Example: "Plan a trip to Tokyo."
    *   Example: "What's the weather like in London?" (Agent-S would need a weather tool/skill for this).
*   **Screenshots:** The existing screenshot functionality (`Cmd/Ctrl+H`) can be used. After taking a screenshot, you can instruct Agent-S to analyze it, for example, by typing in the chat: "Analyze the last screenshot I took." (Note: The explicit command flow for this from UI to agent needs to be fully implemented; currently, screenshot processing is tied to the old "Get Solution" flow which sends it to Agent-S).
*   **Playwright Browser Automation:**
    *   Use the prefix `playwright:` followed by a JSON object defining the task.
    *   Example: `playwright: {"action": "goto", "url": "https://www.simular.ai"}`
    *   Example: `playwright: {"action": "get_title"}` (after navigating to a page)
    *   Supported browsers for Playwright tasks can be specified in the JSON: `"browser": "firefox"` (defaults to "chromium").
*   **Agent Feedback:**
    *   **Thoughts & Plans:** For complex tasks, the agent may display its thought process and a to-do list in the chat.
    *   **Status Updates:** The to-do list items may update their status as the agent works on them (e.g., "pending", "completed").

## Contribution

I'm unable to maintain this repo actively because I do not have the time for it. Please do not create issues, if you have any PRs feel free to create them and i'll review and merge it.

If you are looking to integrate this for your company, i can work with you to create custom solutions. 
