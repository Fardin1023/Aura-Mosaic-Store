import { useEffect, useRef, useState } from "react";
import { FaRobot } from "react-icons/fa";
import { IoMdSend } from "react-icons/io";
import { IoClose } from "react-icons/io5";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import { assistantChat, recommendProducts } from "../../api/api";

/**
 * Animated shopping assistant
 * - Asks quick taste questions via chips
 * - Recommends products / brands / categories
 * - Shows deals/featured items
 * - Supports rich "blocks" (text, products, chips) from backend
 */
const ChatBot = () => {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(() => ([
    {
      from: "bot",
      type: "text",
      text:
        "Hi 👋 I’m your shopping buddy.\n\n" +
        "Tell me what you’re into or tap a quick option below. I can suggest **products, brands, categories** and today’s **offers**.",
    },
    {
      from: "bot",
      type: "chips",
      chips: [
        "Show deals under Tk 500",
        "Trending Skincare",
        "Gift ideas (Handcraft)",
        "Plants for home",
        "Best rated this week",
      ],
    },
  ]));

  // Lightweight "taste" (kept in memory and persisted in localStorage)
  const [taste, setTaste] = useState(() => {
    try {
      const raw = localStorage.getItem("aura_recommendation_taste");
      return raw ? JSON.parse(raw) : { categories: [], brands: [], budget: {}, minRating: 0 };
    } catch {
      return { categories: [], brands: [], budget: {}, minRating: 0 };
    }
  });

  useEffect(() => {
    localStorage.setItem("aura_recommendation_taste", JSON.stringify(taste));
  }, [taste]);

  const bodyRef = useRef(null);
  const scrollToBottom = () => {
    if (!bodyRef.current) return;
    bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  };
  useEffect(scrollToBottom, [messages, sending, open]);

  const appendBlockResponse = (blocks) => {
    // convert backend blocks to message list entries
    const next = [];
    (blocks || []).forEach((b) => {
      if (b.type === "text") {
        next.push({ from: "bot", type: "text", text: b.text || "" });
      } else if (b.type === "products") {
        next.push({
          from: "bot",
          type: "products",
          title: b.title || "Recommended",
          items: (b.items || []).map((p) => ({
            id: p._id || p.id,
            name: p.name,
            price: p.price,
            image:
              (Array.isArray(p.images) && p.images[0]) ||
              p.image ||
              "https://via.placeholder.com/400x300?text=Product",
            link: `/product/${p._id || p.id}`,
            badge: p.badge || "",
          })),
        });
      } else if (b.type === "chips") {
        next.push({ from: "bot", type: "chips", chips: b.items || [] });
      }
    });
    if (next.length) setMessages((prev) => [...prev, ...next]);
  };

  const sendToAssistant = async (text) => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await assistantChat({ message: text, taste });
      const { reply, blocks } = res.data || {};
      if (blocks && Array.isArray(blocks)) {
        appendBlockResponse(blocks);
      } else if (reply) {
        setMessages((prev) => [...prev, { from: "bot", type: "text", text: reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { from: "bot", type: "text", text: "I didn’t get a result, try another query?" },
        ]);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { from: "bot", type: "text", text: "⚠️ Sorry, something went wrong." },
      ]);
    } finally {
      setSending(false);
    }
  };

  const onSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setMessages((prev) => [...prev, { from: "user", type: "text", text }]);
    setInput("");
    await sendToAssistant(text);
  };

  const onChip = async (text) => {
    if (sending) return;
    setMessages((prev) => [...prev, { from: "user", type: "text", text }]);
    await sendToAssistant(text);
  };

  // “One-shot” taste recommendation (grouped)
  const doTasteRecommend = async () => {
    if (sending) return;
    try {
      setSending(true);
      const res = await recommendProducts({ taste });
      const { blocks } = res.data || {};
      if (blocks) appendBlockResponse(blocks);
    } catch {
      setMessages((prev) => [
        ...prev,
        { from: "bot", type: "text", text: "Couldn’t fetch personalized picks right now." },
      ]);
    } finally {
      setSending(false);
    }
  };

  // Helpers to quickly set taste with small UI hints
  const setBudget = (max) => setTaste((t) => ({ ...t, budget: { ...(t.budget || {}), max } }));
  const addCategory = (c) =>
    setTaste((t) => ({
      ...t,
      categories: [...new Set([...(t.categories || []), c])].slice(0, 6),
    }));
  const setMinRating = (r) => setTaste((t) => ({ ...t, minRating: r }));

  const floatingHints = [
    { label: "Budget ≤ Tk 500", on: () => setBudget(500) },
    { label: "Skincare", on: () => addCategory("Skincare") },
    { label: "Handcraft gifts", on: () => addCategory("Handcraft") },
    { label: "Rating 4.0+", on: () => setMinRating(4) },
    { label: "Get picks", on: () => doTasteRecommend() },
  ];

  return (
    <div className="cb-root">
      {/* Floating FAB button */}
      {!open && (
        <button className="cb-fab bounceIn" onClick={() => setOpen(true)} title="Shopping Assistant">
          <FaRobot size={22} />
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className="cb-window slideUp">
          <div className="cb-header">
            <div className="cb-bot">
              <div className="cb-avatar"><FaRobot size={18} /></div>
              <div className="cb-meta">
                <div className="cb-title">Shopping Assistant</div>
                <div className="cb-sub">Ask for products, brands, deals</div>
              </div>
            </div>
            <button className="cb-close" onClick={() => setOpen(false)} title="Close">
              <IoClose size={20} />
            </button>
          </div>

          {/* Taste hint strip */}
          <div className="cb-taste">
            {floatingHints.map((h) => (
              <button key={h.label} className="cb-taste-chip" onClick={h.on}>
                {h.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="cb-body" ref={bodyRef}>
            {messages.map((m, idx) => {
              if (m.type === "products") {
                return (
                  <div key={idx} className="cb-row">
                    <div className="bubble bot">
                      <div className="cb-block-title">{m.title}</div>
                      <div className="cb-grid">
                        {m.items.map((p) => (
                          <div className="cb-card" key={p.id}>
                            <div className={`cb-badge ${p.badge ? "show" : ""}`}>{p.badge}</div>
                            <img src={p.image} alt={p.name} />
                            <div className="cb-card-name">{p.name}</div>
                            <div className="cb-card-price">৳{Number(p.price || 0).toFixed(0)}</div>
                            <Link to={p.link} className="cb-card-btn">View</Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }

              if (m.type === "chips") {
                return (
                  <div key={idx} className="cb-row">
                    <div className="bubble bot">
                      <div className="chips">
                        {m.chips.map((c, i) => (
                          <button key={i} className="chip" onClick={() => onChip(c)}>
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }

              // text bubble
              return (
                <div key={idx} className={"cb-row " + (m.from === "user" ? "right" : "")}>
                  <div className={"bubble " + (m.from === "user" ? "user" : "bot")}>
                    {m.from === "bot" ? (
                      <ReactMarkdown
                        components={{
                          a: ({ href, children }) => {
                            const target = String(href || "");
                            if (target.startsWith("/product/") || target.startsWith("/listing/") || target.startsWith("/search")) {
                              return (
                                <Link to={target} className="link">
                                  {children}
                                </Link>
                              );
                            }
                            return (
                              <a href={target} target="_blank" rel="noreferrer" className="link">
                                {children}
                              </a>
                            );
                          },
                        }}
                      >
                        {m.text}
                      </ReactMarkdown>
                    ) : (
                      m.text
                    )}
                  </div>
                </div>
              );
            })}

            {sending && (
              <div className="cb-row">
                <div className="bubble bot typing">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="cb-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSend()}
              placeholder="Ask for 'deals under 500', 'skincare', 'handcraft gifts'…"
            />
            <button className="send" onClick={onSend} aria-label="Send">
              <IoMdSend size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBot;
