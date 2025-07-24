# ⚡ Free Cluely (Enhanced Fork by @safecorndiet)

A cross-platform desktop app that helps you **instantly solve problems and generate answers using AI** — powered by **Gemini API**, built with **Electron**, **React**, **TailwindCSS**, and **Vite**.

> 🛠️ This is an actively maintained and enhanced fork of [Prat011/free-cluely](https://github.com/Prat011/free-cluely) with major improvements.

---

## ✨ What's New in This Fork

- 🚫 Removed large binaries using `git-filter-repo` for a clean commit history
- 🪟 Fixed Windows launcher behavior and bundling
- 🗃️ Refactored folder structure and asset loading
- 🐛 Bug fixes and UI polish
- 📦 Production builds now work out of the box (`release/` folder)
- 🔧 Prepped for long-term maintainability

---

## 🚀 Quick Start Guide

### 🔧 Prerequisites

- [Node.js](https://nodejs.org/) installed
- Git installed
- A Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### ⚙️ Installation

```bash
git clone https://github.com/safecorndiet/free-cluely.git
cd free-cluely
npm install
```

Then create a `.env` file in the root folder and add:

```env
GEMINI_API_KEY=your_api_key_here
```

---

## 🧪 Development Mode (Recommended)

Start the dev server:

```bash
npm run dev -- --port 5180
```

In a second terminal, launch the Electron window:

```bash
NODE_ENV=development npm run electron:dev
```

---

## 📦 Production Build

```bash
npm run build
```

The packaged desktop app will be created in the `release/` folder.

---

## 🎹 Keyboard Shortcuts

| Shortcut                | Function                  |
|------------------------|---------------------------|
| `Cmd/Ctrl + B`         | Toggle app window         |
| `Cmd/Ctrl + H`         | Take screenshot           |
| `Cmd + Enter`          | Submit & get solution     |
| `Cmd/Ctrl + Arrows`    | Move app window           |

---

## 🧠 Features

- 🧾 AI-generated answers using screenshots + text
- ⚙️ Built with Electron + React + TailwindCSS
- 🖼️ Gemini API integration via `.env`
- 🎯 Minimalist overlay UI with global shortcuts

---

## 🛠️ Troubleshooting

### If the app doesn’t start:

1. Make sure no other app is using port 5180:
   ```bash
   lsof -i :5180
   kill [PID]
   ```

2. Clean up and reinstall dependencies:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. Ensure `.env` has your Gemini API key.

---

## 📸 Screenshots

<p align="center">
  <img src="https://github.com/safecorndiet/free-cluely/assets/preview1.png" width="600" alt="App Screenshot">
  <br />
  <i>Smart floating overlay app with AI-powered solution fetching</i>
</p>

---

## 💬 About This Fork

This version is maintained by [@safecorndiet](https://github.com/safecorndiet), focused on:

- Performance + UX improvements
- Clean commit history
- Long-term project stability

> Feel free to connect: [shahdivy9@gmail.com](mailto:shahdivy9@gmail.com)

---

## 🤝 Contributing

PRs are welcome! Please:

- Fork this repo
- Create a feature branch
- Commit your changes
- Submit a Pull Request 🙌

---

## 📜 License

Licensed under the [Apache-2.0 License](LICENSE).

---

## 📌 Badges

![Platform](https://img.shields.io/badge/platform-electron-blue.svg)
![Maintained](https://img.shields.io/badge/maintained-yes-brightgreen)
![License](https://img.shields.io/github/license/safecorndiet/free-cluely)
![Forked](https://img.shields.io/badge/forked%20from-Prat011%2Ffree--cluely-yellow)
