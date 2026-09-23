import { useEffect, useState, useContext } from "react";
import { getFeaturedProducts, searchProducts, subscribeNewsletter } from "../../api/api";
import HomeBanner from "../../components/HomeBanner";
import banner1 from "../../assets/images/banner1.png";
import banner2 from "../../assets/images/banner2.png";
import banner3 from "../../assets/images/banner3.png";
import banner4 from "../../assets/images/banner4.png";
import Button from "@mui/material/Button";
import { FaArrowRightLong } from "react-icons/fa6";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation } from "swiper/modules";
import ProductItem from "../../components/ProductItem";
import { IoMailUnreadOutline } from "react-icons/io5";
import { Link, useNavigate } from "react-router-dom";
import { MyContext } from "../../App";

const discoveryCards = [
  { title: "Soft-glow skincare", kicker: "Self-care", image: banner1, to: "/listing/Skincare", emoji: "🫧" },
  { title: "Colorful handmade finds", kicker: "Made with heart", image: banner2, to: "/listing/Handcraft", emoji: "🎨" },
  { title: "Thoughtful little gifts", kicker: "Just because", image: banner3, to: "/gifting", emoji: "🎁" },
];

const Home = () => {
  const { wishlist, user, openLoginGate } = useContext(MyContext);
  const navigate = useNavigate();

  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState("");
  const [newsletterLoading, setNewsletterLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [featuredRes, newestRes] = await Promise.all([
          getFeaturedProducts(8),
          searchProducts({ sort: "newest", page: 1, limit: 8 }),
        ]);
        setFeaturedProducts(Array.isArray(featuredRes.data) ? featuredRes.data : []);
        setNewProducts(Array.isArray(newestRes.data?.items) ? newestRes.data.items : []);
      } catch (e) {
        console.error("Home load error:", e);
      }
    };
    load();
  }, []);

  const handleGiftingClick = async (e) => {
    if (!user) {
      e.preventDefault();
      const go = await openLoginGate("AI Gift Studio is for members. Sign in to make a personalized gift!");
      if (go) navigate("/register");
    }
  };

  const handleWishlistClick = async (e) => {
    if (!user) {
      e.preventDefault();
      const go = await openLoginGate("Sign in to save and revisit your favorite finds.");
      if (go) navigate("/register");
    }
  };

  return (
    <>
      <HomeBanner />

      <section className="container home-perk-strip" aria-label="Aura Mosaic benefits">
        <div><span>✨</span><strong>AI-powered picks</strong><small>Smarter shopping, less scrolling</small></div>
        <div><span>🎁</span><strong>Gift Studio</strong><small>Prompt-to-present in a few taps</small></div>
        <div><span>💗</span><strong>Curated with care</strong><small>Fun finds for every mood</small></div>
        <div><span>🚚</span><strong>Cash on Delivery</strong><small>Simple, familiar checkout</small></div>
      </section>

      <section className="container home-gift-spotlight">
        <div className="home-gift-copy">
          <span className="home-section-kicker">🎀 Aura AI Gift Studio</span>
          <h2>Turn a few words into a gift that feels personal.</h2>
          <p>Tell Aura who it’s for, the occasion, the vibe and your budget. It builds real gift bundles using products that are actually in stock.</p>
          <div className="home-gift-actions">
            <Link to="/gifting" onClick={handleGiftingClick} className="aura-btn aura-btn-primary">Create a gift <FaArrowRightLong /></Link>
            <Link to="/ai-studio" className="aura-btn aura-btn-ghost">Ask Aura AI</Link>
          </div>
        </div>
        <div className="home-gift-art" aria-hidden="true">
          <span className="gift-orb gift-orb-a">🎁</span>
          <span className="gift-orb gift-orb-b">🌷</span>
          <span className="gift-orb gift-orb-c">✨</span>
          <div className="gift-card-stack">
            <img src={banner4} alt="" />
          </div>
        </div>
      </section>

      <section className="home-section home-featured-section">
        <div className="container">
          <div className="home-section-heading">
            <div>
              <span className="home-section-kicker">Loved right now</span>
              <h2>Featured little luxuries</h2>
              <p>Pretty, practical and hand-picked from the live Aura-Mosaic catalogue.</p>
            </div>
            <div className="home-section-actions">
              <Link to="/wishlist" onClick={handleWishlistClick} className="home-wishlist-pill">💖 Saved ({wishlist.length})</Link>
              <Link to="/listing/All" className="home-view-link">See everything <FaArrowRightLong /></Link>
            </div>
          </div>

          {featuredProducts.length ? (
            <div className="product_row home-product-slider">
              <Swiper
                slidesPerView={1.15}
                breakpoints={{
                  520: { slidesPerView: 2.15 },
                  768: { slidesPerView: 3 },
                  1100: { slidesPerView: 4 },
                }}
                spaceBetween={18}
                navigation
                modules={[Navigation]}
                className="mySwiper"
              >
                {featuredProducts.map((product) => (
                  <SwiperSlide key={product._id || product.id}>
                    <ProductItem product={product} />
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          ) : (
            <div className="home-empty-state">✨ Featured picks will appear here as your catalogue grows.</div>
          )}
        </div>
      </section>

      <section className="container home-discover-section">
        <div className="home-section-heading compact">
          <div>
            <span className="home-section-kicker">Pick your vibe</span>
            <h2>Shop by mood</h2>
          </div>
        </div>
        <div className="home-discover-grid">
          {discoveryCards.map((card) => (
            <Link to={card.to} onClick={card.to === "/gifting" ? handleGiftingClick : undefined} className="home-discover-card" key={card.title}>
              <img src={card.image} alt="" />
              <span className="home-discover-overlay" />
              <div className="home-discover-copy">
                <span>{card.emoji} {card.kicker}</span>
                <h3>{card.title}</h3>
                <em>Explore <FaArrowRightLong /></em>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-section home-new-section">
        <div className="container">
          <div className="home-section-heading">
            <div>
              <span className="home-section-kicker">Freshly added</span>
              <h2>New & noteworthy</h2>
              <p>The newest products and restocks from your live catalogue.</p>
            </div>
            <Link to="/listing/New%20Arrivals" className="home-view-link">View new arrivals <FaArrowRightLong /></Link>
          </div>

          {newProducts.length ? (
            <div className="productRow2 home-product-grid">
              {newProducts.map((product) => (
                <ProductItem key={product._id || product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="home-empty-state">🌼 Add products from the Admin Dashboard and they’ll bloom here.</div>
          )}
        </div>
      </section>

      <section className="newsLetterSection home-newsletter">
        <div className="container">
          <div className="home-newsletter-inner">
            <div className="home-newsletter-copy">
              <span className="home-section-kicker">💌 Happy mail</span>
              <h2>New drops, cute finds & gifting inspiration.</h2>
              <p>Join the Aura list for product updates and store announcements — no boring inbox clutter.</p>
            </div>
            <div className="home-newsletter-form-wrap">
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!newsletterEmail.trim()) return;
                  setNewsletterLoading(true);
                  setNewsletterStatus("");
                  try {
                    const response = await subscribeNewsletter(newsletterEmail.trim());
                    setNewsletterStatus(response.data?.message || "You’re subscribed!");
                    setNewsletterEmail("");
                  } catch (error) {
                    setNewsletterStatus(error?.response?.data?.message || "Subscription failed. Please try again.");
                  } finally {
                    setNewsletterLoading(false);
                  }
                }}
              >
                <IoMailUnreadOutline />
                <input type="email" value={newsletterEmail} onChange={(event) => setNewsletterEmail(event.target.value)} placeholder="you@example.com" required />
                <Button type="submit" disabled={newsletterLoading}>{newsletterLoading ? "Joining…" : "Join the list"}</Button>
              </form>
              {newsletterStatus && <p className="home-newsletter-status">{newsletterStatus}</p>}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;
