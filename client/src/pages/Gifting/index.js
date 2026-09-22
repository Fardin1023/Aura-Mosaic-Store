import { useContext, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Button from "@mui/material/Button";
import { FaCirclePlus, FaGift, FaRotateRight, FaWandMagicSparkles } from "react-icons/fa6";
import { MyContext } from "../../App";
import { giftRecommendations } from "../../api/api";

const idOf = (product) => product?._id || product?.id;
const imageOf = (product) =>
  (Array.isArray(product?.images) && product.images[0]) ||
  product?.image ||
  "https://via.placeholder.com/600x400?text=Gift+Item";
const priceOf = (product) => Number(product?.price || 0);

const Gifting = () => {
  const { addToCart } = useContext(MyContext);
  const [mode, setMode] = useState("prompt");
  const [prompt, setPrompt] = useState("");
  const [gender, setGender] = useState("");
  const [relation, setRelation] = useState("");
  const [bundleSize, setBundleSize] = useState(2);
  const [budgetMax, setBudgetMax] = useState(1000);
  const [bundle, setBundle] = useState([]);
  const [resultMessage, setResultMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const subtotal = useMemo(
    () => bundle.reduce((sum, product) => sum + priceOf(product), 0),
    [bundle]
  );

  const requestGift = async ({ regenerate = false } = {}) => {
    if (mode === "questions" && (!gender || !relation)) {
      setError("Please choose both gender and relation.");
      return;
    }
    if (mode === "prompt" && !prompt.trim()) {
      setError("Describe the kind of gift you want first.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await giftRecommendations({
        mode,
        prompt: mode === "prompt" ? prompt.trim() : "",
        gender: mode === "questions" ? gender : "",
        relation: mode === "questions" ? relation : "",
        bundleSize,
        budgetMax: budgetMax ?? 0,
        excludeIds: regenerate ? bundle.map(idOf).filter(Boolean) : [],
      });
      const items = Array.isArray(response.data?.items) ? response.data.items : [];
      setBundle(items);
      setResultMessage(response.data?.message || "");
      if (!items.length) setError(response.data?.message || "No matching products were found.");
    } catch (err) {
      setBundle([]);
      setError(err?.response?.data?.message || "Gift suggestions could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPrompt("");
    setGender("");
    setRelation("");
    setBundleSize(2);
    setBudgetMax(1000);
    setBundle([]);
    setResultMessage("");
    setError("");
  };

  const promptChips = [
    "Luxury skincare under Tk 1500, rating 4.5+ for mom",
    "Eco-friendly handcraft gift for a friend under Tk 1000",
    "Low-maintenance plant for office desk, rating 4+",
    "Men’s self-care set under Tk 1200",
  ];

  return (
    <section className="section" style={{ paddingTop: 24 }}>
      <div className="container" style={{ maxWidth: 1080 }}>
        <div className="card shadow-sm" style={{ overflow: "hidden", borderRadius: 16 }}>
          <div
            style={{
              background: "linear-gradient(135deg, rgba(255,77,109,0.12), rgba(107,255,181,0.12))",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ width: 38, height: 38, borderRadius: "50%", display: "grid", placeItems: "center", background: "#fff" }}>
              <FaGift style={{ fontSize: 18, color: "#ff4d6d" }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>Gifting Studio</div>
              <div className="text-muted" style={{ fontSize: 13 }}>
                Build suggestions from a description or a few quick questions. Product availability and prices come from the store API.
              </div>
            </div>
            <div className="ml-auto"><Link to="/" className="text-muted">← Back to Home</Link></div>
          </div>

          <div className="p-3 p-md-4">
            <div className="row">
              <div className="col-md-5">
                <div className="card p-3" style={{ borderRadius: 14 }}>
                  <div className="d-flex mb-3" style={{ gap: 8 }}>
                    <Button className={`btn-round ${mode === "prompt" ? "btn-green" : "btn-outline-secondary"}`} onClick={() => setMode("prompt")}>Prompt</Button>
                    <Button className={`btn-round ${mode === "questions" ? "btn-green" : "btn-outline-secondary"}`} onClick={() => setMode("questions")}>Questions</Button>
                  </div>

                  {mode === "prompt" ? (
                    <div className="mb-3">
                      <div className="small text-muted mb-1">Describe your gift</div>
                      <div className="d-flex align-items-start">
                        <div style={{ width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center", background: "#fff", marginRight: 10, border: "1px solid #eee" }}>
                          <FaWandMagicSparkles style={{ color: "#ff4d6d" }} />
                        </div>
                        <textarea
                          value={prompt}
                          onChange={(event) => setPrompt(event.target.value)}
                          rows={3}
                          maxLength={500}
                          className="form-control"
                          placeholder="e.g., skincare under Tk 1500, rating 4.5+ for mom"
                          style={{ resize: "vertical" }}
                        />
                      </div>
                      <div className="mt-2 d-flex" style={{ gap: 6, flexWrap: "wrap" }}>
                        {promptChips.map((chip) => (
                          <button key={chip} type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setPrompt(chip)}>{chip}</button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-3">
                        <div className="small text-muted mb-1">Who are you giving to?</div>
                        <div className="d-flex" style={{ gap: 8 }}>
                          {["male", "female"].map((value) => (
                            <Button key={value} className={`btn-round ${gender === value ? "btn-green" : "btn-outline-secondary"}`} onClick={() => setGender(value)}>
                              {value === "male" ? "Male" : "Female"}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="mb-3">
                        <div className="small text-muted mb-1">Relation</div>
                        <div className="d-flex" style={{ gap: 8 }}>
                          {["friend", "relative"].map((value) => (
                            <Button key={value} className={`btn-round ${relation === value ? "btn-green" : "btn-outline-secondary"}`} onClick={() => setRelation(value)}>
                              {value === "friend" ? "Friend" : "Relative"}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="mb-3">
                    <div className="small text-muted mb-1">Bundle size</div>
                    <div className="d-flex" style={{ gap: 8, flexWrap: "wrap" }}>
                      {[1, 2, 3].map((count) => (
                        <Button key={count} className={`btn-round ${bundleSize === count ? "btn-green" : "btn-outline-secondary"}`} onClick={() => setBundleSize(count)}>
                          {count === 1 ? "Single" : `${count} products`}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="small text-muted mb-1">Per-item budget</div>
                    <div className="d-flex" style={{ gap: 8, flexWrap: "wrap" }}>
                      {[500, 1000, 1500, 2000].map((amount) => (
                        <Button key={amount} className={`btn-round ${budgetMax === amount ? "btn-green" : "btn-outline-secondary"}`} onClick={() => setBudgetMax(amount)}>
                          Under Tk {amount}
                        </Button>
                      ))}
                      <Button className={`btn-round ${budgetMax === null ? "btn-green" : "btn-outline-secondary"}`} onClick={() => setBudgetMax(null)}>No limit</Button>
                    </div>
                    {budgetMax !== null && (
                      <div className="mt-3">
                        <input type="range" min={200} max={5000} step={50} value={budgetMax} onChange={(event) => setBudgetMax(Number(event.target.value))} style={{ width: "100%" }} />
                        <div className="small text-muted">Current cap: <b>Tk {budgetMax}</b> per item</div>
                      </div>
                    )}
                  </div>

                  <div className="d-flex" style={{ gap: 8, flexWrap: "wrap" }}>
                    <Button className="btn-blue" onClick={() => requestGift()} disabled={loading}>Generate Gift</Button>
                    <Button className="btn-outline-secondary" onClick={reset} disabled={loading}>Reset</Button>
                  </div>
                  {error && <div className="text-danger mt-2">{error}</div>}
                </div>
              </div>

              <div className="col-md-7 mt-4 mt-md-0">
                <div className="card p-3 p-md-4" style={{ borderRadius: 14, minHeight: 320 }}>
                  {loading ? (
                    <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: 260 }}>
                      <div style={{ fontSize: 64 }}>🎁</div>
                      <div className="mt-2 text-muted">Finding current in-stock matches…</div>
                    </div>
                  ) : bundle.length ? (
                    <>
                      <div className="d-flex align-items-center mb-2">
                        <div className="h5 mb-0">Your gift suggestions</div>
                        <Button onClick={() => requestGift({ regenerate: true })} className="btn-outline-secondary btn-round ml-auto" title="Try different products">
                          <FaRotateRight className="mr-2" /> Regenerate
                        </Button>
                      </div>

                      {resultMessage && <div className="small text-muted mb-3">{resultMessage}</div>}
                      <div className="row">
                        {bundle.map((product) => {
                          const id = idOf(product);
                          return (
                            <div className="col-sm-6 mb-3" key={id}>
                              <div className="card h-100" style={{ borderRadius: 12 }}>
                                <Link to={`/product/${id}`}>
                                  <img src={imageOf(product)} alt={product.name || "Gift product"} className="card-img-top" style={{ height: 160, objectFit: "cover", borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                                </Link>
                                <div className="card-body d-flex flex-column">
                                  {product.badge && <div className="small text-muted mb-1">{product.badge}</div>}
                                  <div className="font-weight-bold mb-1">{product.name}</div>
                                  <div className="text-muted mb-1">Rating: {Number(product.rating || 0).toFixed(1)} ★</div>
                                  <div className="text-muted mb-3">৳{priceOf(product).toFixed(2)}</div>
                                  <div className="mt-auto d-flex">
                                    <Button className="btn-green btn-round" onClick={() => addToCart(product, 1)}>
                                      <FaCirclePlus className="mr-2" /> Add to cart
                                    </Button>
                                    <Link to={`/product/${id}`} className="btn btn-outline-primary btn-round ml-2">View</Link>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="border-top pt-3">
                        <div className="d-flex align-items-center h5 mb-0"><span>Total</span><span className="ml-auto">৳{subtotal.toFixed(2)}</span></div>
                      </div>
                      <Button className="btn-blue btn-lg mt-3" onClick={() => bundle.forEach((product) => addToCart(product, 1))}>Add bundle to cart</Button>
                      <div className="small text-muted mt-2">Checkout revalidates live prices, stock, shipping, and the final total on the server.</div>
                    </>
                  ) : (
                    <div className="text-muted text-center" style={{ padding: "70px 0" }}>
                      Choose <b>Prompt</b> or <b>Questions</b>, then generate a gift.
                    </div>
                  )}
                </div>
                <div className="small text-muted mt-2">🚚 Orders typically deliver within <b>3 working days</b>.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Gifting;
