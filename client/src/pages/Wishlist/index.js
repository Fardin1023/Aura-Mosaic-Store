import { useContext, useMemo } from "react";
import { Link } from "react-router-dom";
import { FiHeart, FiArrowRight } from "react-icons/fi";
import { MyContext } from "../../App";
import ProductItem from "../../components/ProductItem";

const Wishlist = () => {
  const { wishlist } = useContext(MyContext) || {};
  const items = useMemo(() => (Array.isArray(wishlist) ? wishlist : []), [wishlist]);

  return (
    <section className="section wishlist-page wishlist-page-v2">
      <div className="container">
        <div className="wishlist-hero-v2">
          <div>
            <span className="wishlist-kicker-v2"><FiHeart /> Your saved shelf</span>
            <h1>Wishlist</h1>
            <p>Keep the little things you love in one place, then add them to your cart whenever you’re ready.</p>
          </div>
          <div className="wishlist-count-card-v2">
            <strong>{items.length}</strong>
            <span>{items.length === 1 ? "saved item" : "saved items"}</span>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="wishlist-empty-v2">
            <div className="wishlist-empty-v2__icon"><FiHeart /></div>
            <span>Nothing saved yet</span>
            <h2>Your wishlist is waiting for a favorite.</h2>
            <p>Tap the heart on any product to save it here. Your wishlist stays synced with your account.</p>
            <Link to="/listing/All" className="aura-btn aura-btn-primary">Browse products <FiArrowRight /></Link>
          </div>
        ) : (
          <>
            <div className="wishlist-toolbar-v2">
              <span>{items.length} curated favorite{items.length === 1 ? "" : "s"}</span>
              <Link to="/listing/All">Keep exploring <FiArrowRight /></Link>
            </div>
            <div className="wishlist-product-grid-v2">
              {items.map((product) => (
                <ProductItem key={product._id || product.id} product={product} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default Wishlist;
