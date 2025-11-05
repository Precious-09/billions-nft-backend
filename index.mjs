import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json()); // <= important!

const upload = multer({ storage: multer.memoryStorage() });
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/analyze", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.json({ error: "No file uploaded" });
    }

    const base64 = req.file.buffer.toString("base64");
    const imageUrl = `data:${req.file.mimetype};base64,${base64}`;

    const prompt = `
Analyze this NFT and respond ONLY with JSON in this format:

{
  "traits": ["trait1", "trait2", "trait3"],
  "personality": "short human personality vibe"
}
    `.trim();

    // ✅ CORRECT request format for responses.create
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { type: "input_text", text: prompt },
        { type: "input_image", image_url: imageUrl }
      ]
    });

    const output = response.output_text;
    let json;

    try {
      json = JSON.parse(output);
    } catch {
      const match = output.match(/\{[\s\S]*\}/);
      json = match ? JSON.parse(match[0]) : null;
    }

    if (!json) {
      return res.json({ error: "Invalid model output", raw: output });
    }

    res.json(json);
  } catch (err) {
    console.error("Backend error:", err);
    res.json({ traits: "Error", personality: err.message });
  }
});

// ✅ Root check
app.get("/", (req, res) => {
  res.send("✅ Billions NFT backend is running");
});

// ✅ Railway port support
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`✅ Server running on ${port}`));
