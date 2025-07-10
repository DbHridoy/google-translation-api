import express, { Request, Response } from "express";
import axios from "axios";

const router = express.Router();

// Dummy object simulating a MongoDB document (can be dynamic/nested)
const dummyData = {
  title: "Hello World",
  description: "This is a test description.",
  note: "Translate this text.",
  count: 42,
  details: {
    author: "John Doe",
    tags: ["sample", "test"]
  },
  items: [
    { name: "Item 1", desc: "First item" },
    { name: "Item 2", desc: "Second item" }
  ]
};

// Recursively collect all string values and their paths
function collectStrings(obj: any, path: (string | number)[] = [], acc: { path: (string | number)[], value: string }[] = []): { path: (string | number)[], value: string }[] {
  if (typeof obj === 'string') {
    acc.push({ path, value: obj });
  } else if (Array.isArray(obj)) {
    obj.forEach((item, idx) => collectStrings(item, [...path, idx], acc));
  } else if (typeof obj === 'object' && obj !== null) {
    Object.keys(obj).forEach(key => collectStrings(obj[key], [...path, key], acc));
  }
  return acc;
}

// Recursively assign translated strings back to the object
function assignStrings(obj: any, stringPaths: { path: (string | number)[], value: string }[], translated: string[]) {
  stringPaths.forEach((entry, idx) => {
    let ref = obj;
    for (let i = 0; i < entry.path.length - 1; i++) {
      ref = ref[entry.path[i]];
    }
    ref[entry.path[entry.path.length - 1]] = translated[idx];
  });
}

// Helper to translate an array of strings
async function translateTexts(texts: string[], target: string): Promise<string[]> {
  const response = await axios.get(
    "https://translation.googleapis.com/language/translate/v2",
    {
      params: {
        q: texts,
        target,
        key: process.env.GOOGLE_API_KEY,
      },
      paramsSerializer: (params) => {
        const qs = [];
        if (Array.isArray(params.q)) {
          params.q.forEach((val: string) => {
            qs.push(`q=${encodeURIComponent(val)}`);
          });
        } else if (params.q) {
          qs.push(`q=${encodeURIComponent(params.q)}`);
        }
        if (params.target) qs.push(`target=${encodeURIComponent(params.target)}`);
        if (params.key) qs.push(`key=${encodeURIComponent(params.key)}`);
        return qs.join('&');
      },
    }
  );
  return response.data.data.translations.map((t: any) => t.translatedText);
}

// GET /api/translated-item?lang=bn
router.get("/translated-item", async (req: Request, res: Response) => {
  const targetLang = (req.query.lang as string) || "en";
  // Recursively collect all string values and their paths
  const stringPaths = collectStrings(dummyData);
  // Filter out empty strings and keep track of their indices
  const nonEmptyStringEntries = stringPaths
    .map((entry, idx) => ({ ...entry, idx }))
    .filter(entry => entry.value && entry.value.trim() !== "");
  const stringValues: string[] = nonEmptyStringEntries.map(entry => entry.value);

  try {
    if (targetLang === "en") {
      return res.json(dummyData);
    }
    // Debug: log what will be sent to the API
    console.log('stringValues to translate:', stringValues);
    if (!stringValues.length) {
      return res.status(400).json({ error: "No non-empty strings to translate." });
    }
    // Translate all string values
    const translatedValues = await translateTexts(stringValues, targetLang);
    // Deep clone dummyData to avoid mutating the original
    const translatedObj = JSON.parse(JSON.stringify(dummyData));
    // Assign translated values back only to non-empty string paths
    nonEmptyStringEntries.forEach((entry, idx) => {
      let ref = translatedObj;
      for (let i = 0; i < entry.path.length - 1; i++) {
        ref = ref[entry.path[i]];
      }
      ref[entry.path[entry.path.length - 1]] = translatedValues[idx];
    });
    res.json(translatedObj);
  } catch (error: any) {
    console.error("Translation error:", error.response?.data || error.message);
    res.status(500).json({ error: "Translation failed." });
  }
});

export default router;
