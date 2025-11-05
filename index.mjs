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
      return res.json({ error: "No file uploaded" });
    }

    const base64 = req.file.buffer.toString("base64");
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;

    const prompt = `
Analyze this NFT image and return JSON only:

{
"traits": ["trait1", "trait2", "trait3"],
"personality": "short human personality vibe"
}
Strict JSON format. Do not add explanation text.
`;

    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: dataUrl }
          ]
        }
      ]
    });

    const output = response.choices?.[0]?.message?.content || "";
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
    return res.json({ traits: "Error", personality: err.message });
  }
});

// ✅ Route to verify backend is live
app.get("/", (req, res) => {
  res.send("✅ Billions NFT backend is running");
});

// ✅ Start server
app.listen(process.env.PORT || 5000, () => {
  console.log(`✅ Server running on ${process.env.PORT || 5000}`);
});
