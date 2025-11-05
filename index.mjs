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
    if (!req.file) return res.json({ error: "No file uploaded" });

    const base64Image = req.file.buffer.toString("base64");

    const prompt = `
Analyze this NFT artwork.

Return ONLY valid JSON:

{
  "traits": ["trait1", "trait2", "trait3"],
  "personality": "short human personality vibe"
}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You analyze NFT metadata and personalities." },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: `data:${req.file.mimetype};base64,${base64Image}`
            }
          ]
        }
      ],
      max_tokens: 200
    });

    const output = completion.choices[0].message.content;

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
    console.error(err);
    res.json({ traits: "Error", personality: err.message });
  }
});

app.get("/", (req, res) => res.send("✅ Billions NFT backend running"));

app.listen(process.env.PORT || 5000, () =>
  console.log(`✅ Server running on ${process.env.PORT || 5000}`)
);
