const functions = require("firebase-functions");
const OpenAI = require("openai");

let openaiApiKey;

// Try to get the API key from Firebase config (works in production and with emulators)
try {
  openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error("OPENAI_API_KEY not found in environment variables");
  }
} catch (error) {
  console.log(
    "Failed to load API key from environment variable:",
    error.message
  );
  // You might want to throw an error here or handle the missing API key in some way
}

// If Firebase config didn't work, fall back to environment variable
if (!openaiApiKey) {
  openaiApiKey = process.env.OPENAI_API_KEY;
}

if (!openaiApiKey) {
  console.error("OpenAI API key is not configured");
  return res.status(500).json({ error: "OpenAI API key is not configured" });
}

const openai = new OpenAI({
  apiKey: openaiApiKey,
});

const getOpenAIResponse = async (req, res) => {
  if (!openaiApiKey) {
    return res.status(500).json({ error: "OpenAI API key is not configured" });
  }

  try {
    console.log("Received request body:", req.body);
    const promptDetails = req.body.query; // User's input

    const systemPrompt = `You are a helpful assistant. Generate a contract in Markdown format.
    // ... rest of your system prompt ...
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // or "gpt-3.5-turbo" if you don't have access to GPT-4
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: promptDetails },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    console.log("OpenAI Response:", response);

    if (response.choices && response.choices[0]) {
      res.json({ response: response.choices[0].message.content });
    } else {
      res.status(500).json({ error: "No choices found in OpenAI response" });
    }
  } catch (error) {
    console.error("OpenAI API Error:", error);
    res.status(500).json({
      error: "Failed to fetch data from OpenAI",
      details: error.message,
    });
  }
};

module.exports = { getOpenAIResponse };
