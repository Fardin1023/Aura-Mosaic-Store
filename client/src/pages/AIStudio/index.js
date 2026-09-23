import { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaHeart, FaRegHeart, FaShoppingCart, FaMagic } from "react-icons/fa";
import { MyContext } from "../../App";
import { askAuraAI, getAuraAIStatus } from "../../api/api";
import "./style.css";

const quickPrompts = [
  "Find me the best value products under Tk 1500",
  "Pick a thoughtful gift under Tk 2000",
  "Recommend something for my home based on what is in stock",
  "Use my wishlist and recent purchases to suggest my next buy",
];

const AIStudio = () => {
  const { user, addToCart, addToWishlist, removeFromWishlist, isWishlisted } = useContext(MyContext);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState({ loading: true, configured: false, model: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getAuraAIStatus()
      .then((res) => {
        if (!active) return;
        setStatus({
          loading: false,
          configured: Boolean(res.data?.configured),
          model: res.data?.model || "",
        });
      })
      .catch(() => {
        if (active) setStatus({ loading: false, configured: false, model: "" });
      });
    return () => {
      active = false;
    };
  }, []);

  const canSubmit = useMemo(
    () => status.configured && !loading && prompt.trim().length >= 4,
    [loading, prompt, status.configured]
  );

  const submit = async (e) => {
    e?.preventDefault?.();
    const text = prompt.trim();
    if (!text || loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await askAuraAI(text);
      setResult(res.data || null);
    } catch (err) {
      setResult(null);
      setError(err?.response?.data?.message || "Aura AI could not answer right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const applyQuickPrompt = (text) => {
    setPrompt(text);
    setError("");
  };

  return (
    <main className="aiStudioPage">
      <section className="aiStudioHero">
        <div className="aiStudioBadge"><FaMagic /> Gemini AI • Free tier</div>
        <h1>Aura AI Studio</h1>
        <p>
          Tell Aura AI what you need. It reasons over the live Aura-Mosaic catalogue,
          your wishlist, and your recent purchases, then recommends only products that actually exist.
        </p>
        {user?.name && <div className="aiStudioHello">Shopping with {user.name}</div>}
      </section>

      <section className="aiStudioPanel">
        {!status.loading && !status.configured && (
          <div className="aiStudioSetupWarning">
            <strong>Aura AI needs an API key.</strong>
            <span>Add <code>GEMINI_API_KEY</code> to <code>server/.env</code>, then restart the backend.</span>
          </div>
        )}

        <form onSubmit={submit} className="aiStudioForm">
          <label htmlFor="ai-shopping-request">What are you shopping for?</label>
          <textarea
            id="ai-shopping-request"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, 1500))}
            placeholder="Example: I need a thoughtful birthday gift under Tk 1800. I prefer something practical, in stock, and well rated."
            rows={5}
          />
          <div className="aiStudioFormFooter">
            <span>{prompt.length}/1500</span>
            <button type="submit" disabled={!canSubmit}>
              <FaMagic /> {loading ? "Thinking…" : "Ask Aura AI"}
            </button>
          </div>
        </form>

        <div className="aiQuickPrompts">
          {quickPrompts.map((item) => (
            <button key={item} type="button" onClick={() => applyQuickPrompt(item)}>
              {item}
            </button>
          ))}
        </div>

        {status.model && status.configured && (
          <div className="aiModelNote">AI model: {status.model} • Product facts always come from your live database.</div>
        )}

        {error && <div className="aiStudioError">{error}</div>}
      </section>

      {result && (
        <section className="aiStudioResults">
          <div className="aiAnswerHeader">
            <span><FaMagic /> Aura AI</span>
            <h2>{result.headline || "Your AI recommendations"}</h2>
            {result.summary && <p>{result.summary}</p>}
          </div>

          {Array.isArray(result.recommendations) && result.recommendations.length > 0 ? (
            <div className="aiProductGrid">
              {result.recommendations.map((product) => {
                const wishlisted = isWishlisted(product._id);
                return (
                  <article key={product._id} className="aiProductCard">
                    <div className="aiProductImageWrap">
                      <img src={product.images?.[0]} alt={product.name} />
                      {product.aiLabel && <span className="aiMatchLabel">{product.aiLabel}</span>}
                    </div>
                    <div className="aiProductBody">
                      <div className="aiProductBrand">{product.brand || product.category || "Aura-Mosaic"}</div>
                      <h3>{product.name}</h3>
                      <div className="aiProductMeta">
                        <strong>Tk. {Number(product.price || 0).toFixed(0)}</strong>
                        <span>{Number(product.rating || 0).toFixed(1)}★</span>
                        <span>{product.countInStock} in stock</span>
                      </div>
                      {product.aiReason && <p className="aiReason">{product.aiReason}</p>}
                      <div className="aiProductActions">
                        <Link to={`/product/${product._id}`}>View product</Link>
                        <button type="button" onClick={() => addToCart(product, 1)} title="Add to cart">
                          <FaShoppingCart />
                        </button>
                        <button
                          type="button"
                          onClick={() => wishlisted ? removeFromWishlist(product._id) : addToWishlist(product)}
                          title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                        >
                          {wishlisted ? <FaHeart /> : <FaRegHeart />}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="aiNoProducts">Aura AI did not find a strong live-catalogue match for this request.</div>
          )}

          {Array.isArray(result.considerations) && result.considerations.length > 0 && (
            <div className="aiConsiderations">
              <h3>What Aura AI considered</h3>
              <ul>
                {result.considerations.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
              </ul>
            </div>
          )}

          {result.followUpQuestion && (
            <button
              type="button"
              className="aiFollowUp"
              onClick={() => {
                setPrompt(result.followUpQuestion);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Continue: {result.followUpQuestion}
            </button>
          )}
        </section>
      )}
    </main>
  );
};

export default AIStudio;
