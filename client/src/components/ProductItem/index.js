import Rating from "@mui/material/Rating";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import { BsArrowsFullscreen } from "react-icons/bs";
import { FaHeart, FaRegHeart, FaCartPlus, FaArrowRight } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { MyContext } from "../../App";
import logoMark from "../../assets/images/aura-mosaic-mark.png";

const ProductItem = ({ product, data, item, itemView }) => {
  const { addToWishlist, removeFromWishlist, isWishlisted, addToCart } = useContext(MyContext);
  const navigate = useNavigate();
  const [quickOpen, setQuickOpen] = useState(false);

  const p = product || data || item || {};
  const id = p._id || p.id;
  const name = p.name || p.title || "Unnamed Product";
  const image =
    (Array.isArray(p.images) && p.images[0]) ||
    p.thumbnail ||
    p.image ||
    logoMark;
  const price = Number(p.price ?? p.newPrice ?? 0);
  const oldPrice = p.oldPrice != null ? Number(p.oldPrice) : undefined;
  const discount = p.discount != null
    ? Number(p.discount)
    : oldPrice && price && oldPrice > price
    ? Math.round(((oldPrice - price) / oldPrice) * 100)
    : null;
  const inStock = typeof p.countInStock === "number" ? p.countInStock > 0 : p.stock > 0 || Boolean(p.inStock);
  const ratingRaw = Number(p.rating ?? p.ratings ?? p.averageRating ?? 0);
  const rating = Number.isFinite(ratingRaw) ? Math.max(0, Math.min(5, ratingRaw)) : 0;
  const numReviews = p.numReviews != null ? Number(p.numReviews) : Array.isArray(p.reviews) ? p.reviews.length : undefined;
  const wished = id ? isWishlisted(id) : false;
  const money = (value) => (Number.isFinite(Number(value)) ? Number(value).toFixed(2).replace(/\.00$/, "") : "0");
  const brand = p.brand || p.vendor || p.category?.name || (typeof p.category === "string" ? p.category : "Aura pick");
  const description = p.shortDescription || p.description || "A curated Aura-Mosaic pick selected for easy, joyful shopping.";

  const toggleWishlist = () => {
    if (!id) return;
    if (wished) {
      removeFromWishlist(id);
      return;
    }
    if (addToWishlist(p)) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Saved to your wishlist 💖",
        showConfirmButton: false,
        timer: 1400,
      });
    }
  };

  const quickAdd = (closeAfter = false) => {
    if (!inStock || !id) return;
    const added = addToCart?.(p, 1);
    if (!added) return;
    if (closeAfter) setQuickOpen(false);
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: `${name} added to cart`,
      showConfirmButton: false,
      timer: 1200,
    });
  };

  const openProduct = () => {
    if (!id) return;
    setQuickOpen(false);
    navigate(`/product/${id}`);
  };

  return (
    <>
      <article className={`item productItem ${itemView || ""}`}>
        <div className="imgWrapper">
          <button className="product-card-image-button" onClick={openProduct} aria-label={`Open ${name}`}>
            <img src={image} alt={name} className="w-100" />
          </button>

          <div className="product-card-badges">
            {discount ? <span className="badge badge-primary">-{discount}%</span> : null}
            {p.featured ? <span className="product-card-featured">✨ Featured</span> : null}
          </div>

          <div className="actions">
            <Button onClick={() => setQuickOpen(true)} disabled={!id} aria-label={`Quick view ${name}`} title="Quick view">
              <BsArrowsFullscreen />
            </Button>
            <Button onClick={toggleWishlist} className={wished ? "active" : ""} aria-label="Toggle wishlist" disabled={!id} title="Wishlist">
              {wished ? <FaHeart /> : <FaRegHeart />}
            </Button>
          </div>
        </div>

        <div className="info">
          <span className="product-card-brand">{brand}</span>
          <button className="product-card-title" onClick={openProduct}>{name}</button>

          <div className="product-card-rating-row">
            <Rating name="read-only" value={rating} readOnly size="small" precision={0.5} />
            {numReviews != null && <small>({numReviews})</small>}
          </div>

          <div className="product-card-stock-price">
            <span className={inStock ? "product-stock in" : "product-stock out"}>{inStock ? "In stock" : "Sold out"}</span>
            <div className="product-card-price">
              {oldPrice != null && oldPrice > price && <span className="oldPrice">৳{money(oldPrice)}</span>}
              <span className="newPrice">৳{money(price)}</span>
            </div>
          </div>

          <button className="product-card-add" onClick={() => quickAdd(false)} disabled={!inStock || !id}>
            <FaCartPlus /> {inStock ? "Quick add" : "Out of stock"}
          </button>
        </div>
      </article>

      <Dialog open={quickOpen} onClose={() => setQuickOpen(false)} className="productQuickView" maxWidth="md" fullWidth>
        <div className="productQuickView__shell">
          <button className="productQuickView__close" onClick={() => setQuickOpen(false)} aria-label="Close quick view">
            <IoClose />
          </button>

          <div className="productQuickView__media">
            <div className="productQuickView__imageFrame">
              <img src={image} alt={name} />
            </div>
            {discount ? <span className="productQuickView__discount">Save {discount}%</span> : null}
          </div>

          <div className="productQuickView__content">
            <span className="productQuickView__eyebrow">{brand}</span>
            <h2>{name}</h2>

            <div className="productQuickView__rating">
              <Rating value={rating} readOnly precision={0.5} size="small" />
              <span>{numReviews || 0} review{Number(numReviews || 0) === 1 ? "" : "s"}</span>
            </div>

            <div className="productQuickView__priceRow">
              <div>
                {oldPrice != null && oldPrice > price && <span className="productQuickView__old">৳{money(oldPrice)}</span>}
                <strong>৳{money(price)}</strong>
              </div>
              <span className={inStock ? "productQuickView__stock is-in" : "productQuickView__stock is-out"}>
                {inStock ? `${Number(p.countInStock || p.stock || 1)} in stock` : "Out of stock"}
              </span>
            </div>

            <p className="productQuickView__description">{description}</p>

            <div className="productQuickView__trust">
              <span>✨ Curated pick</span>
              <span>🚚 Delivery available</span>
              <span>💳 Cash on Delivery</span>
            </div>

            <div className="productQuickView__actions">
              <button className="productQuickView__primary" onClick={() => quickAdd(true)} disabled={!inStock || !id}>
                <FaCartPlus /> {inStock ? "Add to cart" : "Out of stock"}
              </button>
              <button className={`productQuickView__wish ${wished ? "is-active" : ""}`} onClick={toggleWishlist} disabled={!id}>
                {wished ? <FaHeart /> : <FaRegHeart />} {wished ? "Saved" : "Wishlist"}
              </button>
              <button className="productQuickView__details" onClick={openProduct} disabled={!id}>
                View product <FaArrowRight />
              </button>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default ProductItem;
