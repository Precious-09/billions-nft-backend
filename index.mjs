import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// ✅ Multer (memory storage)
const upload = multer({ storage: multer.memoryStorage() });

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✅ 1. ANALYZE NFT
app.post("/analyze", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.json({ error: "No file uploaded" });
    }

    const base64 = req.file.buffer.toString("base64");
    const imageData = `data:${req.file.mimetype};base64,${base64}`;

    const prompt = `
Analyze this NFT artwork.

Return ONLY valid JSON:

{
 "traits": ["trait1", "trait2", "trait3"],
 "personality": "short human personality vibe"
}
`;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: imageData }
          ]
        }
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

    if (!json) return res.json({ error: "Invalid model output", raw: output });

    res.json(json);

  } catch (err) {
    console.error(err);
    res.json({
      traits: "Error",
      personality: err.message
    });
  }
});

// ✅ 2. UPLOAD IMAGE (needed for Safari/mobile canvas export)
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.json({ error: "No file uploaded" });

    // ✅ Convert buffer → SAFARI-SAFE base64 URL
    const base64 = req.file.buffer.toString("base64");
    const url = `data:${req.file.mimetype};base64,${base64}`;

    res.json({ url });

  } catch (err) {
    console.log(err);
    res.json({ error: "Upload failed" });
  }
});

// ✅ Default route
app.get("/", (req, res) => res.send("✅ Billions NFT backend running"));

app.listen(process.env.PORT || 5000, () =>
  console.log(`✅ Server live on ${process.env.PORT || 5000}`)
);
