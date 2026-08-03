import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini Client
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({ apiKey: key });
    }
  }
  return aiClient;
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Context-aware AI Chat responder using Gemini
app.post("/api/gemini-respond", async (req: express.Request, res: express.Response) => {
  try {
    const { history, replierDesc, patientName, bloodGroupNeeded } = req.body;
    const ai = getAIClient();

    if (!ai) {
      // Safe fallback if key is not declared yet
      return res.status(200).json({
        reply: "I am ready to donate. Let me know which hospital desk or blood bank counter I should meet you at."
      });
    }

    // Prepare system instructions and conversation context
    const conversationPrompt = (history || [])
      .map((m: any) => `${m.senderName}: ${m.text}`)
      .join("\n");

    const fullPrompt = `
You are acting as${replierDesc} in an Emergency Blood Donor Finder application.
A user has contacted you regarding an active emergency.
Patient Name: ${patientName}
Blood Group Needed: ${bloodGroupNeeded}

Here is the conversation history so far:
${conversationPrompt}

Write a brief, direct, and compassionate response as the person you are simulating (limit to 1 or 2 short sentences).
If you are simulating a DONOR, be incredibly willing to help, ask where to register or meet, and keep the tone urgent but calm.
If you are simulating a SEEKER (Patient relative), express massive gratitude and mention hospital instructions like ICU/blood banks.
Reply directly as the person. Do NOT write "Donor:" or "Seeker:" prefix. Make sure they are supportive.
`;

    // Modern SDK model call
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: fullPrompt,
    });

    const replyText = response.text?.trim() || "Understood. I'm heading over and will contact you when I arrive.";
    res.json({ reply: replyText });
  } catch (err: any) {
    console.error("Gemini generateContent error handled gracefully", err);
    res.json({
      reply: "Thank you for the message. Let's arrange details at the blood bank reception."
    });
  }
});

// Vite middleware setup
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production file serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (all, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupVite();
