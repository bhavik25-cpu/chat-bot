require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

if (!GROQ_API_KEY) {
  console.warn('WARNING: GROQ_API_KEY is not set. Add it to backend/.env before making requests.');
}

// POST /api/chat
// Body: { messages: [{ role: 'user' | 'assistant', content: string }, ...] }
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Request body must include a non-empty "messages" array.' });
  }

  try {
    const response = await axios.post(
      GROQ_URL,
      {
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful, concise AI assistant embedded in a demo chat app. Keep answers clear and to the point.',
          },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 1024,
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const reply = response.data?.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(502).json({ error: 'AI service returned an unexpected response.' });
    }

    res.json({ reply });
  } catch (err) {
    const status = err.response?.status;
    const detail = err.response?.data?.error?.message || err.message;
    console.error('Groq API error:', status, detail);

    if (status === 401) {
      return res.status(401).json({ error: 'Invalid or missing GROQ_API_KEY on the server.' });
    }
    if (status === 429) {
      return res.status(429).json({ error: 'Rate limit hit on the free tier. Wait a moment and try again.' });
    }

    res.status(500).json({ error: 'Something went wrong talking to the AI service.' });
  }
});

app.get('/', (_req, res) => {
  res.send('AI Chatbot backend is running. POST to /api/chat to talk to it.');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
