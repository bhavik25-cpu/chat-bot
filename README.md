# AI Chatbot — React + Node.js + Free LLM (Groq)

An end-to-end chatbot: a React (Vite) frontend, an Express backend that proxies
requests to a **free** LLM API (Groq's OpenAI-compatible endpoint, Llama 3.3 70B),
and a clean dark UI.

```
ai-chatbot-project/
├── backend/
│   ├── server.js        # Express API, calls Groq
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx       # Chat UI + state + API calls
        └── App.css
```

## Why Groq

Groq gives free API access to fast, strong open models (Llama 3.3 70B, etc.)
with a generous free tier — no credit card needed to start. The backend is
written against the OpenAI-compatible `/chat/completions` shape, so swapping
in another provider (OpenRouter, Together AI, Google Gemini free tier) later
only means changing the URL, model name, and auth header in `server.js`.

## 1. Get a free API key

1. Go to https://console.groq.com and sign up.
2. Create an API key under **API Keys**.
3. Keep it handy for the next step.

## 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and paste your key:

```
GROQ_API_KEY=gsk_your_real_key_here
GROQ_MODEL=llama-3.3-70b-versatile
PORT=5000
```

Run it:

```bash
npm run dev      # requires nodemon (installed via devDependencies)
# or
npm start
```

You should see `Server running on http://localhost:5000`.
Sanity check: open `http://localhost:5000` in a browser — you should see a
plain text confirmation message.

## 3. Frontend setup

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Vite will print a local URL, typically `http://localhost:5173`. Open it —
you'll see the chat UI with a few starter prompts.

## 4. How it works

1. The React app keeps the full conversation in state (`messages`) and sends
   the whole array to `POST http://localhost:5000/api/chat` on every turn.
2. The Express backend prepends a system prompt, forwards everything to
   Groq's `/openai/v1/chat/completions` endpoint, and returns just the
   assistant's reply text.
3. Keeping the API key server-side (never in frontend code) means it's never
   exposed in the browser — this is the same pattern you'd use with any paid
   LLM provider in production.

## 5. Extending it (good talking points for interviews / portfolio)

- **Streaming**: swap the single JSON response for Server-Sent Events or
  `fetch` streaming so tokens appear as they're generated.
- **Persistence**: store conversations in PostgreSQL/MongoDB per user/session.
- **Auth**: add JWT-based auth so each user has their own chat history.
- **Rate limiting**: add `express-rate-limit` to protect your free-tier quota.
- **Markdown rendering**: pipe `m.content` through `react-markdown` for code
  blocks and formatting in AI replies.
- **Deployment**: backend → Render/Railway (free tiers); frontend → Vercel/
  Netlify. Set `GROQ_API_KEY` as an environment variable on the host, and
  update `API_URL` in `App.jsx` to point at your deployed backend URL.

## 6. Troubleshooting

| Symptom | Likely cause |
|---|---|
| "Could not reach the AI service" in UI | Backend isn't running, or wrong port/URL in `App.jsx` |
| 401 from backend | `GROQ_API_KEY` missing/invalid in `.env` |
| 429 from backend | Free-tier rate limit hit — wait and retry |
| CORS error in browser console | Confirm `cors()` middleware is active in `server.js` |













Write-up: AI Chatbot (React + Node.js + Groq)


What you built and why you chose this particular thing
>>
An end-to-end chatbot: a React (Vite) frontend and an Express backend that proxies chat requests to Groq's free, OpenAI-compatible LLM API (Llama 3.3 70B).
I chose this project because it's a compact but complete full-stack slice — frontend state management, a backend API layer, and a real external service integration — that's directly relevant to the kind of senior full-stack work I do day to day (MERN/Next.js/NestJS). It's also something I can keep extending and use as a live portfolio piece, rather than a throwaway exercise.
I deliberately picked a free LLM provider (Groq) instead of a paid one so the project is runnable by anyone reviewing it without needing to hand over a credit card, and so the architecture question — "how do you keep an API key off the client and proxy it safely" — is answered by the code itself rather than by a README caveat.


 Which AI tools, models, or platforms you used and what role each played

Claude (Anthropic) was the primary tool for the whole build — a pair programmer for scaffolding the project (backend Express server, frontend Vite + React app, styling, README), and later the implementer for each incremental feature I asked for.
Groq is the AI service the application itself calls at runtime — the LLM behind the chatbot (Llama 3.3 70B via Groq's free-tier, OpenAI-compatible /chat/completions endpoint). This is a separate role from Claude: Claude wrote the code, Groq is what the finished app talks to when a user sends a message.


- How AI influenced your decisions, architecture, structure, or direction at key moments
>>
Provider choice: asking for "free AI" led Claude to default to Groq rather than Hugging Face or a local model. That shaped the whole backend contract (OpenAI-style messages array, Bearer auth header) and made provider-swapping straightforward later.

Security-first split between frontend and backend: I didn't explicitly ask for the API key to be kept server-side — Claude built it that way by default, key living only in backend/.env, frontend calling localhost:5000/api/chat rather than Groq directly.

Iterative feature addition over a monolithic build: rather than specifying every feature up front, I had Claude propose a menu of options each round (markdown rendering, persistence, streaming, edit/regenerate, copy-to-clipboard, export) and picked a subset at a time — closer to how I'd manage a real feature backlog at work.

Shared code path for edit and regenerate: when I asked for message editing and a regenerate button, Claude refactored the send logic into one requestReply(history) function used by "send," "edit and resend," and "regenerate" — a structural decision I hadn't asked for but would want in any code review.







Any instances where the AI surprised you, produced something unexpected, or changed your approach

​The unprompted hover-revealed action buttons (Edit on user messages, Copy/Regenerate on AI messages) rather than always-visible buttons — a UX instinct I didn't ask for.

When I asked for "some features" without specifying which, the AI laid out a menu and asked me to choose rather than guessing and over-building in one direction.

I expected conversation export to need a backend endpoint. Instead, the AI built it as pure client-side — a Blob and temporary anchor tag, zero backend involvement — a good reminder that not every "download a file" feature needs a server round-trip.