import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const app = express();
const upload = multer();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const GEMINI_MODEL = "gemini-3.5-flash-lite";

app.use(cors());
app.use(express.json());

const PORT = 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

app.get('/', (req, res) => {
  res.send('Hello !');
});

app.post('/generate-text', async (req, res) => {
  const { prompt } = req.body;
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt
    });

    res.status(200).json({ result: response.text });
  } catch (error) {
    console.error('Error generating text:', error);
    res.status(500).json({ error: 'Something went wrong while generating text.' });
  }
});

app.post("/generate-from-image", upload.single("image"), async (req, res) => {
  const { prompt } = req.body;
  const base64Image = req.file.buffer.toString("base64");

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: prompt, type: "text" },
        { inlineData: { data: base64Image, mimeType: req.file.mimetype } }
      ],
    });

    res.status(200).json({ result: response.text });
  } catch (error) {
    console.error('Error generating content from image:', error);
    res.status(500).json({
      error: error.message || 'Something went wrong while generating content from image.'
    });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { conversation } = req.body;

    if (!Array.isArray(conversation)) {
      throw new Error('conversation must be Array');
    }

    const contents = conversation.map(({ role, text }) => ({
      role,
      parts: [{ text }],
    }));

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        temperature: 0.2,
        systemInstruction: `
        You are KawanKuliner, a virtual assistant dedicated exclusively to providing recommendations for great places to eat, snacks, and culinary spots.
        1. Scope:
   - You MUST ONLY answer queries related to food recommendations, hangout spots, food stalls (warung), cafes, restaurants, signature dishes, estimated prices, and culinary locations.
   - You MUST NOT answer questions outside the culinary topic (e.g., programming, academic tasks, weather, general health, politics, or general news).

2. Response Rules:
   - Provide food recommendations in Indonesian (Bahasa Indonesia).
   - If asked about location, provide the name of the place and its general location (city/area).
   - If asked about price, provide the estimated price range (e.g., "Rp 15.000 - Rp 30.000").
   - Be friendly, concise, and helpful.

3. Handling Out-of-Scope Questions:
   - If the user asks something outside the culinary topic, politely state:
     "Maaf, saya hanya bisa memberikan rekomendasi seputar kuliner."

4. Input Context:
   - Users may provide photos of food or places along with their text questions.
   - Always consider the visual information from the image when answering.

5. Language and Tone:
   - Always respond using casual, friendly, and informative Indonesian, just like talking to a friend.
6. Recommendation Details & Source Links:
   - Whenever you provide a recommendation, include: Place Name, Location/Area, Signature Menu, Estimated Price/Vibe, and a source link (e.g., Google Maps link or official social media link) so users can easily find the location.
7. Accuracy & Grounding:
   - Ensure the recommended places actually exist and are currently operational. If you are unsure of a source link, do not invent fake URLs.
        `


      },
    });

    res.status(200).json({ result: response.text });
  } catch (error) {
    console.error('Error in chat route:', error);
    res.status(500).json({
      error: error.message || 'Something went wrong during chat.'
    });
  }
});
