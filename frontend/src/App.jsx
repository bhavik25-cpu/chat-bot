import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/chat';

const STARTER_PROMPTS = [
  'Explain closures in JavaScript',
  'Write a haiku about debugging',
  'What is the difference between SQL and NoSQL?',
];

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const editRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (editingIndex !== null && editRef.current) {
      editRef.current.focus();
      editRef.current.style.height = 'auto';
      editRef.current.style.height = editRef.current.scrollHeight + 'px';
    }
  }, [editingIndex]);

  const autoGrow = (el) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  // Sends `history` (array of {role, content}) to the backend and appends the reply.
  const requestReply = async (history) => {
    setError(null);
    setLoading(true);
    try {
      const res = await axios.post(API_URL, { messages: history });
      setMessages([...history, { role: 'assistant', content: res.data.reply }]);
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not reach the AI service. Is the backend running?';
      setError(msg);
      setMessages(history); // keep the user's message even if the AI call failed
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    const updated = [...messages, { role: 'user', content: text }];
    setMessages(updated);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    await requestReply(updated);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ---- Edit & regenerate ----

  const startEdit = (index) => {
    if (loading) return;
    setEditingIndex(index);
    setEditText(messages[index].content);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditText('');
  };

  // Saving an edited user message discards everything after it and re-asks the AI.
  const saveEdit = async (index) => {
    const text = editText.trim();
    if (!text) return;

    const truncated = messages.slice(0, index);
    const updated = [...truncated, { role: 'user', content: text }];

    setEditingIndex(null);
    setEditText('');
    setMessages(updated);

    await requestReply(updated);
  };

  const handleEditKeyDown = (e, index) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEdit(index);
    }
    if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  // Regenerating drops the last assistant reply and re-sends the same history.
  const regenerate = async () => {
    if (loading) return;
    const lastAssistantIdx = messages.map((m) => m.role).lastIndexOf('assistant');
    if (lastAssistantIdx === -1) return;

    const history = messages.slice(0, lastAssistantIdx);
    setMessages(history);
    await requestReply(history);
  };

  // ---- Copy to clipboard ----

  const copyMessage = async (index, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((cur) => (cur === index ? null : cur)), 1500);
    } catch {
      setError('Could not copy to clipboard — your browser may have blocked it.');
    }
  };

  // ---- Export conversation ----

  const buildExportContent = (format) => {
    const stamp = new Date().toLocaleString();
    if (format === 'md') {
      const lines = [`# Chat export`, `_${stamp}_`, ''];
      messages.forEach((m) => {
        lines.push(`**${m.role === 'user' ? 'You' : 'AI'}:**`, '', m.content, '');
      });
      return lines.join('\n');
    }
    // plain txt
    const lines = [`Chat export — ${stamp}`, ''];
    messages.forEach((m) => {
      lines.push(`${m.role === 'user' ? 'You' : 'AI'}: ${m.content}`, '');
    });
    return lines.join('\n');
  };

  const exportChat = (format) => {
    setExportOpen(false);
    const content = buildExportContent(format);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const lastAssistantIdx = messages.map((m) => m.role).lastIndexOf('assistant');

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-dot" />
          <span className="brand-name">chat.local</span>
        </div>
        <div className="topbar-right">
          <span className="brand-model">llama-3.3-70b · groq</span>
          {messages.length > 0 && (
            <div className="export-wrap">
              <button className="icon-btn" onClick={() => setExportOpen((o) => !o)} title="Export chat">
                Export
              </button>
              {exportOpen && (
                <div className="export-menu">
                  <button onClick={() => exportChat('txt')}>as .txt</button>
                  <button onClick={() => exportChat('md')}>as .md</button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="chat-window">
        {messages.length === 0 && (
          <div className="empty-state">
            <p className="empty-eyebrow">// session start</p>
            <h1>Ask it anything.</h1>
            <p className="empty-sub">Runs on a free-tier LLM through your own backend proxy.</p>
            <div className="starter-row">
              {STARTER_PROMPTS.map((p) => (
                <button key={p} className="starter-chip" onClick={() => sendMessage(p)}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`row ${m.role}`}>
            <span className="tag">{m.role === 'user' ? 'you' : 'ai'}</span>

            {editingIndex === i ? (
              <div className="edit-wrap">
                <textarea
                  ref={editRef}
                  className="edit-textarea"
                  value={editText}
                  onChange={(e) => {
                    setEditText(e.target.value);
                    autoGrow(e.target);
                  }}
                  onKeyDown={(e) => handleEditKeyDown(e, i)}
                  rows={1}
                />
                <div className="edit-actions">
                  <button className="mini-btn primary" onClick={() => saveEdit(i)}>
                    Save &amp; resend
                  </button>
                  <button className="mini-btn" onClick={cancelEdit}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className={`bubble-wrap ${m.role}`}>
                <div className={`bubble ${m.role}`}>{m.content}</div>
                <div className="msg-actions">
                  {m.role === 'user' && (
                    <button className="icon-btn tiny" onClick={() => startEdit(i)}>
                      Edit
                    </button>
                  )}
                  {m.role === 'assistant' && (
                    <button className="icon-btn tiny" onClick={() => copyMessage(i, m.content)}>
                      {copiedIndex === i ? 'Copied' : 'Copy'}
                    </button>
                  )}
                  {m.role === 'assistant' && i === lastAssistantIdx && !loading && (
                    <button className="icon-btn tiny" onClick={regenerate}>
                      Regenerate
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="row assistant">
            <span className="tag">ai</span>
            <div className="bubble assistant typing">
              <span className="cursor" />
            </div>
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}

        <div ref={bottomRef} />
      </main>

      <footer className="composer">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            autoGrow(e.target);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message, press Enter to send..."
          rows={1}
        />
        <button className="send-btn" onClick={() => sendMessage()} disabled={loading || !input.trim()}>
          Send
        </button>
      </footer>
    </div>
  );
}

export default App;
