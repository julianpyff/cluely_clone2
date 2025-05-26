# Interview Coder

![Interview Coder Screenshot](image.png)

Interview Coder is a desktop application that uses AI to help you understand and solve problems. You can take a screenshot of a question or piece of code, and the app will use Google's Gemini AI to provide explanations, solutions, or analysis. It's designed to work on Windows, macOS, and Linux.

## Getting Started (for Users)

Follow these steps to download, install, and set up Interview Coder.

### 1. Download Interview Coder

*   Go to the **[Interview Coder Releases Page](https://github.com/ibttf/interview-coder/releases)** on GitHub.
*   You'll see a list of versions. Usually, you'll want the newest one at the top, marked "Latest".
*   Under the release notes, look for "Assets". Click to expand it if it's not already.
*   Download the correct file for your computer:
    *   **Windows:** Look for a file ending in `.exe` (e.g., `Interview-Coder-Setup-x.x.x.exe`) or a portable version if available.
    *   **macOS (Mac):** Look for a file ending in `.dmg`. The `x.x.x` in filenames like `Interview-Coder-x.x.x.dmg` stands for the version number. For newer Macs with Apple Silicon (M1, M2, M3, etc.), prefer `Interview-Coder-arm64.dmg`. For Intel-based Macs, use `Interview-Coder-x64.dmg`. If a generic version (e.g., `Interview-Coder-mac.dmg`) is available, that should also work.
    *   **Linux:** Look for a file ending in `.AppImage`, `.deb`, or `.snap` (e.g., `Interview-Coder-x.x.x.AppImage`).

### 2. Install Interview Coder

*   **Windows:** Double-click the downloaded `.exe` file and follow the installation instructions.
*   **macOS:** Double-click the downloaded `.dmg` file. A window should open showing the Interview Coder app icon and your Applications folder. Drag the Interview Coder icon into your Applications folder.
*   **Linux:**
    *   `.AppImage` files: Make the file executable (e.g., `chmod +x Interview-Coder-x.x.x.AppImage`) and then run it.
    *   `.deb` files: You can usually install these by double-clicking or using a command like `sudo dpkg -i Interview-Coder-x.x.x.deb` followed by `sudo apt-get install -f` if there are dependency issues.

### 3. Set Up Your Gemini API Key

Interview Coder needs a Google Gemini API key to work. This key allows the application to use Google's AI.

*   **Get your API Key:**
    1.  Go to the [Google AI Studio website](https://makersuite.google.com/app/apikey).
    2.  You might need to sign in with your Google account.
    3.  Follow the instructions to create a new API key. Copy this key to your clipboard.
*   **Add the API Key to Interview Coder:**
    *   Launch Interview Coder.
    *   Look for a settings menu or an API key section within the application. (The exact steps might vary slightly depending on the app version).
    *   Paste your Gemini API key into the designated field.
    *   *(Note: For developers, an `.env` file method is described below. For regular users, the application should provide a way to enter this key in its interface. If you don't see an option, please check the application's help menu or contact support.)*

## How to Use Interview Coder

1.  **Launch** the Interview Coder application.
2.  **Take a Screenshot:** Press `Cmd + H` (on Mac) or `Ctrl + H` (on Windows/Linux). This will capture a portion of your screen.
3.  **View Screenshot Queue:** The captured screenshot will appear in the app's queue.
4.  **Get Solution/Explanation:** Select the screenshot you want to process and press `Cmd + Enter` (on Mac) or `Ctrl + Enter` (on Windows/Linux). The AI will analyze the screenshot and provide a response.
5.  **Window Management:**
    *   Press `Cmd + B` (Mac) or `Ctrl + B` (Windows/Linux) to show or hide the app window.
    *   Use `Cmd + Arrow Keys` (Mac) or `Ctrl + Arrow Keys` (Windows/Linux) to move the window around your screen.

## Troubleshooting

*   **The 'X' (close) button doesn't close the app:** This is a known issue. To fully quit the application:
    *   Press `Cmd + Q` on macOS.
    *   Press `Ctrl + Q` on Windows/Linux (if implemented), or
    *   Use your system's Task Manager (Windows) or Activity Monitor (macOS) to force quit "Interview Coder".
*   **Problems with Gemini API Key:** Ensure your API key is correctly entered and that it's a valid key from Google AI Studio.
*   **Reporting Issues:** If you find a bug or have a problem not listed here, please report it on the [GitHub Issues page](https://github.com/ibttf/interview-coder/issues).

---

## Developer Guide

(This section contains the original README content for developers.)

# Free Cluely

A desktop application to help you cheat on everything. 

![Cluely Screenshot](image.png)

## 🚀 Quick Start Guide

### Prerequisites
- Make sure you have Node.js installed on your computer
- Git installed on your computer
- A Gemini API key (get it from [Google AI Studio](https://makersuite.google.com/app/apikey))

### Installation Steps

1. Clone the repository:
```bash
git clone [repository-url]
cd free-cluely
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Create a file named `.env` in the root folder
   - Add your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
   - Save the file

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
1. Delete the `node_modules` folder
2. Delete `package-lock.json`
3. Run `npm install` again
4. Try running the app again using Method 1

## Contribution

If you have any feature requests or bugs, feel free to create PRs and Issues.
