import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { FaHeart, FaMagic, FaRegHeart, FaRobot, FaShoppingCart } from "react-icons/fa";
import { IoMdSend } from "react-icons/io";
import { IoClose, IoRefresh } from "react-icons/io5";
import ReactMarkdown from "react-markdown";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MyContext } from "../../App";
import { assistantChatV2 } from "../../api/api";
import "./style.css";

const initialMessages = [
  {
    from: "bot",
    type: "text",
    text: "Hi 👋 I’m **Aura Assistant**. I use Gemini AI together with Aura-Mosaic’s live catalogue. Ask me for recommendations, comparisons, gifts, cheaper alternatives, store information, your wishlist, or order tracking.",
    chips: [
      "Show me skincare under Tk 1500",
      "Find a thoughtful gift",
      "Compare products for me",
      "What is in my wishlist?",
    ],
  },
];

const ChatBot = () => {
  const context = useContext(MyContext) || {};
  const {
    user,
    cart = [],
    addToCart,
    addToWishlist,
    removeFromWishlist,
    isWishlisted,
    openLoginGate,
  } = context;
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const bodyRef = useRef(null);

  const identity = user?._id || user?.id || "guest";
  const storageKey = `aura_assistant_v2_${identity}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      setMessages(Array.isArray(parsed) && parsed.length ? parsed.slice(-40) : initialMessages);
    } catch {
      setMessages(initialMessages);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(-40)));
    } catch {}
  }, [messages, storageKey]);

  useEffect(() => {
    if (!bodyRef.current) return;
    bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, sending, open]);

  const serverHistory = useMemo(
    () => messages
      .filter((item) => item.type === "text" || item.type === "assistant")
      .slice(-10)
      .map((item) => ({
        role: item.from === "bot" ? "assistant" : "user",
        text: item.text || "",
        products: Array.isArray(item.products)
          ? item.products.map((product) => ({
              id: product._id,
              name: product.name,
              price: product.price,
              brand: product.brand,
            }))
          : [],
      })),
    [messages]
  );

  const resetChat = () => {
    setMessages(initialMessages);
    setInput("");
    try { localStorage.removeItem(storageKey); } catch {}
  };

  const send = async (rawText) => {
    const text = String(rawText || "").trim();
    if (!text || sending) return;

    const userMessage = { from: "user", type: "text", text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    try {
      const res = await assistantChatV2({
        message: text,
        history: serverHistory,
        clientContext: {
          currentPath: location.pathname,
          cart: cart.slice(0, 20).map((item) => ({
            id: item.id || item._id,
            name: item.name,
            price: Number(item.price || 0),
            qty: Number(item.qty || 1),
          })),
        },
      });
      const data = res.data || {};
      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          type: "assistant",
          text: data.reply || "I couldn't find an answer for that yet.",
          products: Array.isArray(data.products) ? data.products : [],
          orders: Array.isArray(data.orders) ? data.orders : [],
          chips: Array.isArray(data.chips) ? data.chips : [],
          loginRequired: Boolean(data.loginRequired),
          model: data.model || "",
          degraded: Boolean(data.degraded),
        },
      ]);
    } catch (error) {
      const message = error?.response?.data?.message || "Aura Assistant could not answer right now. Please try again.";
      setMessages((prev) => [...prev, { from: "bot", type: "text", text: `⚠️ ${message}` }]);
    } finally {
      setSending(false);
    }
  };

  const handleLogin = async () => {
    if (typeof openLoginGate === "function") {
      const go = await openLoginGate("Sign in so Aura Assistant can access your wishlist and orders securely.");
      if (go) navigate("/register");
      return;
    }
    navigate("/register");
  };

  const addProductToCart = (product) => {
    if (typeof addToCart === "function") addToCart(product, 1);
  };

  const toggleWishlist = (product) => {
    const wished = typeof isWishlisted === "function" && isWishlisted(product._id);
    if (wished) removeFromWishlist?.(product._id);
    else addToWishlist?.(product);
  };

  return (
    <div className="cb2-root">
      {!open && (
        <button className="cb2-fab" onClick={() => setOpen(true)} title="Aura AI Assistant" aria-label="Open Aura Assistant">
          <FaRobot />
          <span className="cb2-ai-dot" />
        </button>
      )}

      {open && (
        <section className="cb2-window" aria-label="Aura Assistant">
          <header className="cb2-header">
            <div className="cb2-heading">
              <div className="cb2-avatar"><FaMagic /></div>
              <div>
                <strong>Aura Assistant</strong>
                <span>Gemini AI + live store data</span>
              </div>
            </div>
            <div className="cb2-header-actions">
              <button onClick={resetChat} title="New chat" aria-label="New chat"><IoRefresh /></button>
              <button onClick={() => setOpen(false)} title="Close" aria-label="Close"><IoClose /></button>
            </div>
          </header>

          <div className="cb2-body" ref={bodyRef}>
            {messages.map((message, index) => (
              <div key={`${message.from}-${index}`} className={`cb2-message-row ${message.from === "user" ? "user" : "bot"}`}>
                <div className={`cb2-bubble ${message.from === "user" ? "user" : "bot"}`}>
                  {message.from === "bot" ? <ReactMarkdown>{message.text || ""}</ReactMarkdown> : message.text}

                  {message.model && (
                    <div className="cb2-model-note">
                      {message.degraded ? "Live catalogue fallback" : `AI: ${message.model}`}
                    </div>
                  )}

                  {Array.isArray(message.products) && message.products.length > 0 && (
                    <div className="cb2-products">
                      {message.products.map((product) => {
                        const wished = typeof isWishlisted === "function" && isWishlisted(product._id);
                        return (
                          <article className="cb2-product" key={product._id}>
                            <img src={product.images?.[0]} alt={product.name} />
                            <div className="cb2-product-body">
                              {product.aiLabel && <span className="cb2-label">{product.aiLabel}</span>}
                              <strong>{product.name}</strong>
                              <div className="cb2-product-meta">
                                <span>Tk {Number(product.price || 0).toFixed(0)}</span>
                                <span>{Number(product.rating || 0).toFixed(1)}★</span>
                                <span>{product.countInStock} left</span>
                              </div>
                              {product.aiReason && <p>{product.aiReason}</p>}
                              <div className="cb2-product-actions">
                                <Link to={`/product/${product._id}`} onClick={() => setOpen(false)}>View</Link>
                                <button onClick={() => addProductToCart(product)} title="Add to cart"><FaShoppingCart /></button>
                                <button onClick={() => toggleWishlist(product)} title={wished ? "Remove from wishlist" : "Add to wishlist"}>
                                  {wished ? <FaHeart /> : <FaRegHeart />}
                                </button>
                              </div>
                              <div className="cb2-product-prompts">
                                <button onClick={() => send(`Compare ${product.name} with similar products`)}>Compare</button>
                                <button onClick={() => send(`Show me a cheaper alternative to ${product.name}`)}>Cheaper</button>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}

                  {Array.isArray(message.orders) && message.orders.length > 0 && (
                    <div className="cb2-orders">
                      {message.orders.map((order) => (
                        <article key={order._id} className="cb2-order">
                          <div><strong>Order #{String(order._id).slice(-8).toUpperCase()}</strong><span className={`cb2-status ${order.status}`}>{order.status}</span></div>
                          <p>Tk {Number(order.total || 0).toFixed(0)} • {order.payment?.status || "PENDING"}</p>
                          {order.trackingNumber && <p>Tracking: {order.trackingNumber}</p>}
                          <small>{new Date(order.createdAt).toLocaleString()}</small>
                        </article>
                      ))}
                      <Link className="cb2-history-link" to="/history" onClick={() => setOpen(false)}>Open full order history</Link>
                    </div>
                  )}

                  {message.loginRequired && (
                    <button className="cb2-login" onClick={handleLogin}>Sign in</button>
                  )}

                  {Array.isArray(message.chips) && message.chips.length > 0 && (
                    <div className="cb2-chips">
                      {message.chips.map((chip) => (
                        chip.toLowerCase() === "sign in"
                          ? <button key={chip} onClick={handleLogin}>{chip}</button>
                          : <button key={chip} onClick={() => send(chip)}>{chip}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {sending && (
              <div className="cb2-message-row bot">
                <div className="cb2-bubble bot cb2-thinking"><span /><span /><span /><em>Thinking with live store data…</em></div>
              </div>
            )}
          </div>

          <div className="cb2-input-wrap">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value.slice(0, 1000))}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask Aura about products, orders, wishlist, gifts…"
              rows={1}
            />
            <button disabled={sending || !input.trim()} onClick={() => send(input)} aria-label="Send"><IoMdSend /></button>
          </div>
        </section>
      )}
    </div>
  );
};

export default ChatBot;
