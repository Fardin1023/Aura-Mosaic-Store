import Rating from "@mui/material/Rating";
import Button from "@mui/material/Button";
import { BsArrowsFullscreen } from "react-icons/bs";
import { FaHeart, FaRegHeart, FaCartPlus } from "react-icons/fa";
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { MyContext } from "../../App";

const ProductItem = ({ product, data, item, itemView }) => {
  const { addToWishlist, removeFromWishlist, isWishlisted, addToCart } = useContext(MyContext);
  const navigate = useNavigate();
  const p = product || data || item || {};
  const id = p._id || p.id;
  const name = p.name || p.title || "Unnamed Product";
  const image =
    (Array.isArray(p.images) && p.images[0]) ||
    p.thumbnail ||
    p.image ||
    "https://via.placeholder.com/400x400?text=No+Image";
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

  const quickAdd = () => {
    if (!inStock || !id) return;
    const added = addToCart?.(p, 1);
    if (!added) return;
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: `${name} added to cart`,
      showConfirmButton: false,
      timer: 1200,
    });
  };

  return (
    <article className={`item productItem ${itemView || ""}`}>
      <div className="imgWrapper">
        <button className="product-card-image-button" onClick={() => id && navigate(`/product/${id}`)} aria-label={`Open ${name}`}>
          <img src={image} alt={name} className="w-100" />
        </button>

        <div className="product-card-badges">
          {discount ? <span className="badge badge-primary">-{discount}%</span> : null}
          {p.featured ? <span className="product-card-featured">✨ Featured</span> : null}
        </div>

        <div className="actions">
          <Button onClick={() => id && navigate(`/product/${id}`)} disabled={!id} aria-label={`View ${name}`}>
            <BsArrowsFullscreen />
          </Button>
          <Button onClick={toggleWishlist} className={wished ? "active" : ""} aria-label="Toggle wishlist" disabled={!id}>
            {wished ? <FaHeart /> : <FaRegHeart />}
          </Button>
        </div>
      </div>

      <div className="info">
        <span className="product-card-brand">{brand}</span>
        <button className="product-card-title" onClick={() => id && navigate(`/product/${id}`)}>{name}</button>

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

        <button className="product-card-add" onClick={quickAdd} disabled={!inStock || !id}>
          <FaCartPlus /> {inStock ? "Quick add" : "Out of stock"}
        </button>
      </div>
    </article>
  );
};

export default ProductItem;
