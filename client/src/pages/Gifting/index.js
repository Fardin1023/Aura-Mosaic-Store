import { useContext, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaArrowRight,
  FaCartPlus,
  FaGift,
  FaHeart,
  FaRegHeart,
  FaRotateRight,
  FaWandMagicSparkles,
} from "react-icons/fa6";
import { MyContext } from "../../App";
import { askAuraGiftDesigner } from "../../api/api";
import "./style.css";

const quickPrompts = [
  "Make a thoughtful birthday gift for my mom under Tk 2000",
  "Create a cozy housewarming gift for a friend under Tk 2500",
  "Build a skincare gift for my sister. Keep it elegant and under Tk 1800",
  "I need a simple thank-you gift for a colleague under Tk 1200",
];

const idOf = (product) => String(product?._id || product?.id || "");
const imageOf = (product) =>
  (Array.isArray(product?.images) && product.images[0]) ||
  product?.image ||
  "https://via.placeholder.com/600x450?text=Aura+Gift";
const priceOf = (product) => Number(product?.price || 0);

const Gifting = () => {
  const {
    addToCart,
    addToWishlist,
    removeFromWishlist,
    isWishlisted,
  } = useContext(MyContext);

  const [prompt, setPrompt] = useState("");
  const [budgetTotal, setBudgetTotal] = useState(2000);
  const [bundleSize, setBundleSize] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const allResultIds = useMemo(() => {
    const ids = [];
    for (const gift of result?.gifts || []) {
      for (const product of gift?.products || []) {
        const id = idOf(product);
        if (id && !ids.includes(id)) ids.push(id);
      }
    }
    return ids;
  }, [result]);

  const submit = async ({ regenerate = false } = {}) => {
    const cleanPrompt = prompt.trim();
    if (cleanPrompt.length < 4) {
      setError("Tell Aura AI who the gift is for, the occasion, or the kind of gift you want.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await askAuraGiftDesigner({
        prompt: cleanPrompt,
        budgetTotal: budgetTotal || 0,
        bundleSize: bundleSize || 0,
        excludeIds: regenerate ? allResultIds : [],
      });
      setResult(response.data || null);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Aura AI could not design a gift right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const addGiftToCart = (gift) => {
    for (const product of gift?.products || []) addToCart(product, 1);
  };

  const toggleWishlist = (product) => {
    const id = idOf(product);
    if (!id) return;
    if (isWishlisted(id)) removeFromWishlist(id);
    else addToWishlist(product);
  };

  return (
    <main className="gift-ai-page">
      <section className="gift-ai-hero">
        <div className="gift-ai-hero__content">
          <div className="gift-ai-badge">
            <FaWandMagicSparkles /> Gemini AI + live store catalogue
          </div>
          <h1>Aura AI Gift Studio</h1>
          <p>
            Describe the person, occasion, mood, or budget. Aura AI builds gift ideas using only
            products that are actually active and in stock in Aura-Mosaic.
          </p>
        </div>
        <div className="gift-ai-hero__icon" aria-hidden="true">
          <FaGift />
        </div>
      </section>

      <section className="gift-ai-builder">
        <div className="gift-ai-form-card">
          <div className="gift-ai-section-heading">
            <div>
              <span className="gift-ai-kicker">Tell Aura what you need</span>
              <h2>Who are we gifting?</h2>
            </div>
          </div>

          <label className="gift-ai-label" htmlFor="giftPrompt">
            Your prompt
          </label>
          <textarea
            id="giftPrompt"
            className="gift-ai-prompt"
            rows={6}
            maxLength={1500}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Example: My best friend loves plants and handmade things. It is her birthday and I have about Tk 2000. Make something warm and thoughtful."
          />
          <div className="gift-ai-char-count">{prompt.length}/1500</div>

          <div className="gift-ai-quick-prompts">
            {quickPrompts.map((item) => (
              <button key={item} type="button" onClick={() => setPrompt(item)}>
                {item}
              </button>
            ))}
          </div>

          <div className="gift-ai-controls">
            <div>
              <span className="gift-ai-label">Total gift budget</span>
              <div className="gift-ai-choice-row">
                {[1000, 1500, 2000, 3000, 5000].map((amount) => (
                  <button
                    type="button"
                    key={amount}
                    className={budgetTotal === amount ? "is-active" : ""}
                    onClick={() => setBudgetTotal(amount)}
                  >
                    Tk {amount}
                  </button>
                ))}
                <button
                  type="button"
                  className={budgetTotal === 0 ? "is-active" : ""}
                  onClick={() => setBudgetTotal(0)}
                >
                  No limit
                </button>
              </div>
            </div>

            <div>
              <span className="gift-ai-label">Products in each gift</span>
              <div className="gift-ai-choice-row">
                {[0, 1, 2, 3, 4].map((count) => (
                  <button
                    type="button"
                    key={count}
                    className={bundleSize === count ? "is-active" : ""}
                    onClick={() => setBundleSize(count)}
                  >
                    {count === 0 ? "Let AI decide" : count}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="gift-ai-actions">
            <button
              type="button"
              className="gift-ai-primary"
              disabled={loading}
              onClick={() => submit()}
            >
              <FaWandMagicSparkles /> {loading ? "Designing your gift…" : "Create gifts with Aura AI"}
            </button>
            {result && (
              <button
                type="button"
                className="gift-ai-secondary"
                disabled={loading}
                onClick={() => submit({ regenerate: true })}
              >
                <FaRotateRight /> Try different products
              </button>
            )}
          </div>

          {error && <div className="gift-ai-error">{error}</div>}
        </div>

        <div className="gift-ai-results">
          {loading ? (
            <div className="gift-ai-empty gift-ai-loading">
              <div className="gift-ai-loader">🎁</div>
              <h3>Aura is putting the gift together…</h3>
              <p>Checking your live catalogue, budget, and the details in your prompt.</p>
            </div>
          ) : result?.gifts?.length ? (
            <>
              <div className="gift-ai-result-intro">
                <div>
                  <span className="gift-ai-kicker">Designed by Aura AI</span>
                  <h2>{result.headline || "Gift ideas for you"}</h2>
                  {result.summary && <p>{result.summary}</p>}
                </div>
                <div className="gift-ai-model-pill">
                  {result.degraded ? "Live catalogue fallback" : result.model || "Gemini AI"}
                </div>
              </div>

              <div className="gift-ai-plan-list">
                {result.gifts.map((gift, giftIndex) => (
                  <article className="gift-ai-plan" key={`${gift.title}-${giftIndex}`}>
                    <div className="gift-ai-plan__top">
                      <div>
                        {gift.theme && <span className="gift-ai-theme">{gift.theme}</span>}
                        <h3>{gift.title}</h3>
                        {gift.reason && <p>{gift.reason}</p>}
                      </div>
                      <div className="gift-ai-total">
                        <span>Total</span>
                        <strong>Tk {Number(gift.total || 0).toLocaleString()}</strong>
                      </div>
                    </div>

                    <div className="gift-ai-products">
                      {(gift.products || []).map((product) => {
                        const id = idOf(product);
                        const wished = isWishlisted(id);
                        return (
                          <div className="gift-ai-product" key={id}>
                            <Link to={`/product/${id}`} className="gift-ai-product__image">
                              <img src={imageOf(product)} alt={product.name || "Gift product"} />
                            </Link>
                            <div className="gift-ai-product__body">
                              {product.aiReason && <span className="gift-ai-product__reason">{product.aiReason}</span>}
                              <Link to={`/product/${id}`} className="gift-ai-product__name">
                                {product.name}
                              </Link>
                              <div className="gift-ai-product__meta">
                                <span>Tk {priceOf(product).toLocaleString()}</span>
                                <span>{Number(product.rating || 0).toFixed(1)} ★</span>
                              </div>
                              <div className="gift-ai-product__actions">
                                <button type="button" onClick={() => addToCart(product, 1)}>
                                  <FaCartPlus /> Add
                                </button>
                                <button
                                  type="button"
                                  className="gift-ai-heart"
                                  onClick={() => toggleWishlist(product)}
                                  aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
                                >
                                  {wished ? <FaHeart /> : <FaRegHeart />}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {gift.giftMessage && (
                      <div className="gift-ai-message">
                        <span>Suggested gift-card message</span>
                        <p>“{gift.giftMessage}”</p>
                      </div>
                    )}

                    <div className="gift-ai-plan__footer">
                      <button type="button" onClick={() => addGiftToCart(gift)}>
                        <FaGift /> Add whole gift to cart
                      </button>
                      {(gift.products || []).length > 0 && (
                        <Link to={`/product/${idOf(gift.products[0])}`}>
                          Start with first product <FaArrowRight />
                        </Link>
                      )}
                    </div>
                  </article>
                ))}
              </div>

              {Array.isArray(result.considerations) && result.considerations.length > 0 && (
                <div className="gift-ai-notes">
                  <strong>Aura considered</strong>
                  <div>
                    {result.considerations.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                </div>
              )}

              {result.followUpQuestion && (
                <div className="gift-ai-follow-up">
                  <FaWandMagicSparkles />
                  <span>{result.followUpQuestion}</span>
                </div>
              )}
            </>
          ) : (
            <div className="gift-ai-empty">
              <div className="gift-ai-empty__icon"><FaGift /></div>
              <h3>Your AI-designed gifts will appear here</h3>
              <p>
                Try describing the recipient, occasion, personality, budget, or the feeling you want the gift to have.
              </p>
              <div className="gift-ai-empty__examples">
                <span>Birthday</span>
                <span>Mother’s Day</span>
                <span>Thank you</span>
                <span>Housewarming</span>
                <span>Self-care</span>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default Gifting;
