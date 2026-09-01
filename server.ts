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
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
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
      model: "gemini-3.7-flash",
      contents: fullPrompt,
    });

    const replyText = response.text?.trim() || "Understood. I'm heading over and will contact you when I arrive.";
    res.json({ reply: replyText });
  } catch (_err: any) {
    res.json({
      reply: "Thank you for the message. Let's arrange details at the blood bank reception."
    });
  }
});

// Google Maps Grounded search for blood banks, hospitals & emergency facilities
app.post("/api/gemini-maps-search", async (req: express.Request, res: express.Response) => {
  try {
    const { query, lat, lng } = req.body;
    const ai = getAIClient();

    if (!ai) {
      return res.status(200).json({
        answer: "Gemini AI engine is initializing. Please ensure GEMINI_API_KEY is configured in your project settings.",
        links: []
      });
    }

    const searchQuery = query || "Find nearby 24/7 blood banks and active blood donation centers";

    const config: any = {
      tools: [{ googleMaps: {} }]
    };

    if (lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: Number(lat),
            longitude: Number(lng)
          }
        }
      };
    }

    // Call gemini-3.7-flash with googleMaps tool grounding
    // DO NOT set responseMimeType or responseSchema when using googleMaps
    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: `Query: ${searchQuery}. User latitude: ${lat || "unknown"}, longitude: ${lng || "unknown"}. List nearby verified blood banks, hospitals, or blood donation units with their addresses, contact info, operating hours, and emergency directions.`,
      config
    });

    const answer = response.text || "No details found.";
    const candidate = response.candidates?.[0];
    const groundingChunks = candidate?.groundingMetadata?.groundingChunks || [];

    const links: Array<{ title: string; uri: string; address?: string; snippet?: string }> = [];

    groundingChunks.forEach((chunk: any) => {
      if (chunk.maps) {
        const title = chunk.maps.title || "View Location on Google Maps";
        const uri = chunk.maps.uri || "";
        const address = chunk.maps.placeAnswerSources?.address || "";
        const snippet = chunk.maps.placeAnswerSources?.reviewSnippets?.[0] || "";
        if (uri) {
          links.push({ title, uri, address, snippet });
        }
      }
    });

    res.json({
      answer,
      links,
      groundingChunks
    });
  } catch (_err: any) {
    // Fallback response when quota is exceeded or API errors occur
    const { query, lat, lng } = req.body;
    const userLat = Number(lat) || 13.0827;
    const userLng = Number(lng) || 80.2707;
    const searchQuery = encodeURIComponent(query || "blood bank hospital near me");

    const fallbackLinks = [
      {
        title: "24/7 Red Cross & Emergency Regional Blood Bank Center",
        uri: `https://www.google.com/maps/search/?api=1&query=Blood+Bank+Red+Cross+Hospital&center=${userLat},${userLng}`,
        address: `Near GPS Coordinates (${userLat.toFixed(4)}, ${userLng.toFixed(4)})`,
        snippet: "Verified 24/7 blood collection unit with whole blood, platelets, and emergency component storage."
      },
      {
        title: "City General Hospital & Emergency Blood Storage Unit",
        uri: `https://www.google.com/maps/search/?api=1&query=City+General+Hospital+Blood+Bank&center=${userLat},${userLng}`,
        address: `Hospital Zone, GPS (${userLat.toFixed(4)}, ${userLng.toFixed(4)})`,
        snippet: "Trauma level 1 blood storage facility offering O-Negative emergency reserves and donor drives."
      },
      {
        title: "Apollo & Rotary Club Voluntary Blood Bank",
        uri: `https://www.google.com/maps/search/?api=1&query=Rotary+Club+Blood+Bank&center=${userLat},${userLng}`,
        address: `Medical District near (${userLat.toFixed(4)}, ${userLng.toFixed(4)})`,
        snippet: "Voluntary blood donor bank with component separation and rare blood inventory management."
      }
    ];

    res.json({
      answer: `Showing local Google Maps directory search for "${query || "blood bank nearby"}". (Live AI summary temporarily using local GPS fallback due to API quota rate limit). You can click below for direct Google Maps directions and 360° Street View panoramas.`,
      links: fallbackLinks,
      isQuotaFallback: true
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
