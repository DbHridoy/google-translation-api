import express, { Request, Response } from "express";
import axios from "axios";

const router = express.Router();

interface TranslateRequest {
  text: string;
  target: string;
}

interface Message {
  id: number;
  text: string;
}

// POST /api/translate
router.post("/translate", async (req: Request<{}, {}, TranslateRequest>, res: Response) => {
  const { text, target } = req.body;

  if (!text || !target) {
    return res.status(400).json({ error: "Missing text or target language" });
  }

  try {
    const response = await axios.post(
      "https://translation.googleapis.com/language/translate/v2",
      {},
      {
        params: {
          q: text,
          target,
          key: process.env.GOOGLE_API_KEY,
        },
      }
    );

    const translatedText = response.data.data.translations[0].translatedText;
    res.json({ translatedText });
  } catch (error: any) {
    console.error("Translation error:", error.message);
    res.status(500).json({ error: "Failed to translate text" });
  }
});

// GET /api/messages?lang=bn
router.get("/messages", async (req: Request, res: Response) => {
  const targetLang: string = (req.query.lang as string) || "en";

  try {
    const messages: Message[] = [
      { id: 1, text: "Welcome to our app!" },
      { id: 2, text: "Click here to continue." },
    ];

    if (targetLang === "en") {
      return res.json(messages);
    }

    const translated = await Promise.all(
      messages.map(async (msg) => {
        const response = await axios.post(
          "https://translation.googleapis.com/language/translate/v2",
          {},
          {
            params: {
              q: msg.text,
              target: targetLang,
              key: process.env.GOOGLE_API_KEY,
            },
          }
        );

        return {
          id: msg.id,
          text: response.data.data.translations[0].translatedText,
        };
      })
    );

    res.json(translated);
  } catch (error: any) {
    console.error("Translation error:", error.message);
    res.status(500).json({ error: "Translation failed." });
  }
});

export default router;
