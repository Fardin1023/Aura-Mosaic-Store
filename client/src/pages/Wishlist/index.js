// src/pages/Wishlist/index.js
import { useContext, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import Swal from "sweetalert2";
import { MyContext } from "../../App";
import { FaCartPlus, FaTrashAlt } from "react-icons/fa";

const Wishlist = () => {
  const navigate = useNavigate();
  const { wishlist, addToCart, removeFromWishlist } = useContext(MyContext) || {};

  // derive helpers
  const items = useMemo(() => Array.isArray(wishlist) ? wishlist : [], [wishlist]);

  const getId = (p) => p._id || p.id || p.slug || String(p.name || "");
  const getName = (p) => p.name || p.title || "Unnamed Product";
  const getImage = (p) =>
    (Array.isArray(p.images) && p.images[0]) ||
    p.thumbnail ||
    p.image ||
    "https://via.placeholder.com/600x400?text=No+Image";
  const getPrice = (p) => Number(p.price || p.newPrice || 0);

  const removeItem = (id) => {
    if (!removeFromWishlist) return;
    removeFromWishlist(id); // updates global context → header count updates instantly
  };

  const moveToCart = (p) => {
    const added = addToCart?.(p, 1);
    if (!added) return;
    removeItem(getId(p));
    Swal.fire({
      title: "Moved to cart",
      text: `${getName(p)} was added to your cart.`,
      icon: "success",
      confirmButtonText: "Keep browsing",
      showCancelButton: true,
      cancelButtonText: "Go to cart",
      reverseButtons: true,
    }).then((r) => {
      if (r.dismiss === Swal.DismissReason.cancel) navigate("/cart");
    });
  };

  return (
    <section className="section wishlist-page">
      <div className="container">
        <div className="d-flex align-items-center mb-3">
          <h3 className="mb-0">My Wishlist</h3>
          <span className="chip ml-3">
            <span className="dot" /> {items.length} saved
          </span>
          <div className="ml-auto">
            <Link to="/" className="text-muted">← Continue shopping</Link>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="wishlist-empty text-center">
            <h5 className="mb-2">Your wishlist is empty</h5>
            <p className="text-muted mb-3">
              Save products you love and revisit them anytime.
            </p>
            <Link to="/" className="btn btn-blue btn-round">Browse products</Link>
          </div>
        ) : (
          <div className="row">
            {items.map((p) => {
              const id = getId(p);
              return (
                <div className="col-sm-6 col-md-4 col-lg-3 mb-4" key={id}>
                  <div className="card h-100">
                    <img
                      src={getImage(p)}
                      alt={getName(p)}
                      className="card-img-top"
                      onClick={() => navigate(`/product/${id}`)}
                      style={{ cursor: "pointer" }}
                    />
                    <div className="card-body d-flex flex-column">
                      <h6 className="card-title mb-1">{getName(p)}</h6>
                      <div className="d-flex align-items-center mb-3">
                        <span className="card-text">৳{getPrice(p).toFixed(2)}</span>
                      </div>
                      <div className="mt-auto d-flex">
                        <Button
                          className="btn-green btn-round"
                          onClick={() => moveToCart(p)}
                        >
                          <FaCartPlus className="mr-2" /> Add to cart
                        </Button>
                        <Button
                          className="btn-outline-danger btn-round ml-2"
                          onClick={() => removeItem(id)}
                          title="Remove"
                        >
                          <FaTrashAlt />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default Wishlist;
