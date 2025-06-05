"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMHelper = void 0;
const generative_ai_1 = require("@google/generative-ai");
const fs_1 = __importDefault(require("fs"));
class LLMHelper {
  model;
  systemPrompt = `You are Wingman AI, a helpful, proactive assistant for any kind of problem or situation (not just coding). For any user input, analyze the situation, provide a clear problem statement, relevant context, and suggest several possible responses or actions the user could take next. Always explain your reasoning. Present your suggestions as a list of options or next steps.`;
  constructor(apiKey) {
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  }
  async fileToGenerativePart(imagePath) {
    const imageData = await fs_1.default.promises.readFile(imagePath);
    return {
      inlineData: {
        data: imageData.toString("base64"),
        mimeType: "image/png",
      },
    };
  }
  cleanJsonResponse(text) {
    // Remove markdown code block syntax if present
    text = text.replace(/^```(?:json)?\n/, "").replace(/\n```$/, "");
    // Remove any leading/trailing whitespace
    text = text.trim();
    return text;
  }
  async extractProblemFromImages(imagePaths) {
    try {
      const imageParts = await Promise.all(
        imagePaths.map((path) => this.fileToGenerativePart(path))
      );
      const prompt = `${this.systemPrompt}\n\nYou are a wingman. Please analyze these images and extract the following information in JSON format:\n{
  "problem_statement": "A clear statement of the problem or situation depicted in the images.",
  "context": "Relevant background or context from the images.",
  "suggested_responses": ["First possible answer or action", "Second possible answer or action", "..."],
  "reasoning": "Explanation of why these suggestions are appropriate."
}\nImportant: Return ONLY the JSON object, without any markdown formatting or code blocks.`;
      const result = await this.model.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      const text = this.cleanJsonResponse(response.text());
      return JSON.parse(text);
    } catch (error) {
      console.error("Error extracting problem from images:", error);
      throw error;
    }
  }
  async generateSolution(problemInfo) {
    const prompt = `${
      this.systemPrompt
    }\n\nGiven this problem or situation:\n${JSON.stringify(
      problemInfo,
      null,
      2
    )}\n\nPlease provide your response in the following JSON format:\n{
  "solution": {
    "code": "The code or main answer here.",
    "problem_statement": "Restate the problem or situation.",
    "context": "Relevant background/context.",
    "suggested_responses": ["First possible answer or action", "Second possible answer or action", "..."],
    "reasoning": "Explanation of why these suggestions are appropriate."
  }
}\nImportant: Return ONLY the JSON object, without any markdown formatting or code blocks.`;
    console.log("[LLMHelper] Calling Gemini LLM for solution...");
    try {
      const result = await this.model.generateContent(prompt);
      console.log("[LLMHelper] Gemini LLM returned result.");
      const response = await result.response;
      const text = this.cleanJsonResponse(response.text());
      const parsed = JSON.parse(text);
      console.log("[LLMHelper] Parsed LLM response:", parsed);
      return parsed;
    } catch (error) {
      console.error("[LLMHelper] Error in generateSolution:", error);
      throw error;
    }
  }
  async debugSolutionWithImages(problemInfo, currentCode, debugImagePaths) {
    try {
      const imageParts = await Promise.all(
        debugImagePaths.map((path) => this.fileToGenerativePart(path))
      );
      const prompt = `${
        this.systemPrompt
      }\n\nYou are a wingman. Given:\n1. The original problem or situation: ${JSON.stringify(
        problemInfo,
        null,
        2
      )}\n2. The current response or approach: ${currentCode}\n3. The debug information in the provided images\n\nPlease analyze the debug information and provide feedback in this JSON format:\n{
  "solution": {
    "code": "The code or main answer here.",
    "problem_statement": "Restate the problem or situation.",
    "context": "Relevant background/context.",
    "suggested_responses": ["First possible answer or action", "Second possible answer or action", "..."],
    "reasoning": "Explanation of why these suggestions are appropriate."
  }
}\nImportant: Return ONLY the JSON object, without any markdown formatting or code blocks.`;
      const result = await this.model.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      const text = this.cleanJsonResponse(response.text());
      const parsed = JSON.parse(text);
      console.log("[LLMHelper] Parsed debug LLM response:", parsed);
      return parsed;
    } catch (error) {
      console.error("Error debugging solution with images:", error);
      throw error;
    }
  }
  async analyzeAudioFile(audioPath) {
    try {
      const audioData = await fs_1.default.promises.readFile(audioPath);
      const audioPart = {
        inlineData: {
          data: audioData.toString("base64"),
          mimeType: "audio/mp3",
        },
      };
      const prompt = `${this.systemPrompt}\n\nDescribe this audio clip in a short, concise answer. In addition to your main answer, suggest several possible actions or responses the user could take next based on the audio. Do not return a structured JSON object, just answer naturally as you would to a user.`;
      const result = await this.model.generateContent([prompt, audioPart]);
      const response = await result.response;
      const text = response.text();
      return { text, timestamp: Date.now() };
    } catch (error) {
      console.error("Error analyzing audio file:", error);
      throw error;
    }
  }
  async analyzeAudioFromBase64(data, mimeType) {
    try {
      const audioPart = {
        inlineData: {
          data,
          mimeType,
        },
      };
      const prompt = `${this.systemPrompt}\n\nYou are an AI interview assistant. Based on the audio input, provide a direct, interview-ready response. Structure your response EXACTLY as follows:

MAIN ANSWER:
[Provide a clear, concise 2-3 sentence answer to the question]

KEY POINTS:
• [First key point]
• [Second key point]
• [Third key point]

REAL-WORLD EXAMPLE:
[Share a specific example from industry experience]

WHY IT MATTERS:
[Explain the practical importance and impact]

Keep your response focused and professional. Do not include any meta-commentary or suggestions. Provide only the actual answer content.`;
      const result = await this.model.generateContent([prompt, audioPart]);
      const response = await result.response;
      const text = response.text();
      // Format the response with emojis for better readability
      const formatted = this.formatInterviewResponse(text);
      return {
        text,
        timestamp: Date.now(),
        formatted,
      };
    } catch (error) {
      console.error("Error analyzing audio from base64:", error);
      throw error;
    }
  }
  formatInterviewResponse(text) {
    // Split the response into sections based on the exact headers
    const sections = text.split(
      /(?=MAIN ANSWER:|KEY POINTS:|REAL-WORLD EXAMPLE:|WHY IT MATTERS:)/i
    );
    if (sections.length < 2) {
      return `Interview Response:\n${text}`;
    }
    let formatted = "";
    // Process each section
    sections.forEach((section) => {
      const trimmed = section.trim();
      if (trimmed.toLowerCase().includes("main answer")) {
        formatted += `Main Answer:\n${trimmed
          .replace(/main answer:/i, "")
          .trim()}\n\n`;
      } else if (trimmed.toLowerCase().includes("key points")) {
        formatted += `Key Points:\n${trimmed
          .replace(/key points:/i, "")
          .trim()}\n\n`;
      } else if (trimmed.toLowerCase().includes("real-world example")) {
        formatted += `Real-World Example:\n${trimmed
          .replace(/real-world example:/i, "")
          .trim()}\n\n`;
      } else if (trimmed.toLowerCase().includes("why it matters")) {
        formatted += `Why It Matters:\n${trimmed
          .replace(/why it matters:/i, "")
          .trim()}\n\n`;
      }
    });
    return formatted.trim();
  }
  async analyzeImageFile(imagePath) {
    try {
      const imageData = await fs_1.default.promises.readFile(imagePath);
      const imagePart = {
        inlineData: {
          data: imageData.toString("base64"),
          mimeType: "image/png",
        },
      };
      const prompt = `${this.systemPrompt}\n\nDescribe the content of this image in a short, concise answer. In addition to your main answer, suggest several possible actions or responses the user could take next based on the image. Do not return a structured JSON object, just answer naturally as you would to a user. Be concise and brief.`;
      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();
      return { text, timestamp: Date.now() };
    } catch (error) {
      console.error("Error analyzing image file:", error);
      throw error;
    }
  }
}
exports.LLMHelper = LLMHelper;
//# sourceMappingURL=LLMHelper.js.map
