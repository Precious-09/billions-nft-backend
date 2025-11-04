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
console.log("Key length:", process.env.OPENAI_API_KEY?.length);

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/analyze", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.json({ error: "No file uploaded" });

    const base64 = req.file.buffer.toString("base64");
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;

    const prompt = `
Analyze this NFT.
Return ONLY JSON format exactly like this:

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
            { type: "input_image", image_url: dataUrl }
          ]
        }
      ]
    });

    const output = response.output_text || "";
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
    return res.json({ traits: "Error", personality: err.message });
  }
});

// ✅ Root route so Render doesn’t show "Cannot GET /"
app.get("/", (req, res) => {
  res.send("✅ Billions NFT backend is running");
});

// ✅ Required for deployment
app.listen(process.env.PORT || 5000, () => {
  console.log(`✅ Server running on ${process.env.PORT || 5000}`);
});
