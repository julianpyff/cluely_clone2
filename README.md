# Free Cluely (Web)

Audio-only web application. Screen capture/recording features are removed for browser compatibility. It’s fine if the app is visible while screensharing.

## 🚀 Web Quick Start

### Prerequisites
- Node.js and Git
- A Gemini API key (get it from Google AI Studio)

### Installation

```bash
git clone [repository-url]
cd free-cluely
npm ci
```

Create `.env.local` (or `.env`) in the project root:

```
VITE_GEMINI_API_KEY=your_api_key_here
```

### Run (Vite)

```bash
npm run dev
```

### Build and Preview

```bash
npm run build
npm run preview
```

## Notes
- `window.electronAPI` is provided in the browser by `src/web/electron-shim.ts`.
- Screenshot and window management APIs are stubbed (no-ops).
- Audio is captured via `MediaRecorder` and analyzed with Gemini using `VITE_GEMINI_API_KEY` in the browser.