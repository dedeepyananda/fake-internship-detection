import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware for JSON and Large Payloads (for Base64 images)
app.use(express.json({ limit: '10mb' }));

// Gemini Integration
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.post("/api/analyze-poster", async (req, res) => {
  try {
    const { image } = req.body; // Expecting base64 string

    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    const prompt = `
      Act as a Cybersecurity Expert specializing in Internship Scam Detection.
      Analyze the attached internship poster image for the following:
      1. Extract all text (OCR).
      2. Identify red flags: Payment requests, lack of interview, suspicious contact (Gmail/WhatsApp only), urgent language (Limited seats), high salary for no skills.
      3. Categorize as "FAKE" or "REAL".
      4. Provide a confidence score (0-100%).
      5. List specific suspicious phrases found.
      6. Provide a short explanation of the verdict.

      Respond ONLY in JSON format:
      {
        "verdict": "FAKE" | "REAL",
        "confidence": number,
        "extractedText": "string",
        "redFlags": ["string"],
        "suspiciousPhrases": ["string"],
        "explanation": "string",
        "grammarScore": number (0-100)
      }
    `;

    // Process image data (remove header if present)
    const base64Data = image.split(",")[1] || image;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const responseText = response.text || "";
    // Extract JSON from response (handling potential markdown blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(responseText);

    res.json(analysis);
  } catch (error: any) {
    console.error("Analysis Error:", error);
    
    let errorMessage = "Failed to analyze poster";
    let suggestion = "Try uploading a clearer image with readable text.";

    if (error.message?.includes("Safety")) {
      errorMessage = "Content blocked by safety filters";
      suggestion = "Ensure the image does not contain sensitive or prohibited content.";
    } else if (error.message?.includes("quota") || error.message?.includes("429")) {
      errorMessage = "Server busy (Quota exceeded)";
      suggestion = "Please wait a moment and try again.";
    } else if (error.message?.includes("invalid") || error.message?.includes("argument")) {
      errorMessage = "Invalid image format";
      suggestion = "Please use a common image format like JPG or PNG.";
    }

    res.status(500).json({ 
      error: errorMessage, 
      suggestion: suggestion,
      details: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
