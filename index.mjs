import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/analyze", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const base64 = req.file.buffer.toString("base64");
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;

    const promptText = `
Analyze this NFT image and return ONLY JSON format exactly like:

{
  "traits": ["trait1", "trait2", "trait3"],
  "personality": "short human personality vibe"
}
`;
    // Build inputs array
    const inputs = [
      { type: "input_text", text: promptText },
      { type: "input_image", image_url: dataUrl }
    ];

    // Call OpenAI
    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: inputs
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
      return res.status(500).json({ error: "Invalid model output", raw: output });
    }

    res.json(json);

  } catch (err) {
    console.error("Backend error:", err);
    res.status(500).json({ traits: "Error", personality: err.message });
  }
});

// Health route
app.get("/", (req, res) => {
  res.send("✅ Billions NFT backend is running");
});

// Start server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`✅ Server running on ${port}`);
});
