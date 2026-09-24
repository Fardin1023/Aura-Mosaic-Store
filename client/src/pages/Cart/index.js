import { useContext, useMemo, useState } from "react";
import { MyContext } from "../../App";
import { Link, useNavigate } from "react-router-dom";
import { IoClose } from "react-icons/io5";
import Button from "@mui/material/Button";
import { IoMdCart } from "react-icons/io";
import { FiCreditCard, FiShield, FiShoppingBag, FiSmartphone, FiTruck } from "react-icons/fi";
import { FaArrowRightLong, FaWandMagicSparkles } from "react-icons/fa6";
import Swal from "sweetalert2";
import { createOrder } from "../../api/api";
import { escapeHtml } from "../../utils/safeHtml";

const Cart = () => {
  const {
    cart,
    user,
    selectedCity,
    openLoginGate,
    removeCartItem,
    setCartQty,
    clearCart,
    storeSettings,
  } = useContext(MyContext);
  const navigate = useNavigate();
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  const codEnabled = storeSettings?.allowCOD !== false;

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0),
    [cart]
  );

  const threshold = Math.max(0, Number(storeSettings?.freeShippingThreshold || 0));
  const flatFee = Math.max(0, Number(storeSettings?.shippingFlatFee || 0));
  const shipping = subtotal > 0 && threshold > 0 && subtotal < threshold ? flatFee : 0;
  const estimatedTotal = subtotal + shipping;
  const freeShippingRemaining = threshold > 0 ? Math.max(0, threshold - subtotal) : 0;
  const shippingProgress = threshold > 0 ? Math.min(100, (subtotal / threshold) * 100) : 100;

  const ensureCheckoutReady = async () => {
    if (cart.length === 0) {
      await Swal.fire("Your cart is empty", "Add some products before checking out.", "info");
      return false;
    }
    if (!user) {
      const go = await openLoginGate("Please sign in to checkout and place your order.");
      if (go) navigate("/register");
      return false;
    }
    if (!selectedCity) {
      await Swal.fire("Select a delivery city", "Choose your city from the location selector before checkout.", "info");
      return false;
    }
    return true;
  };

  const orderPayload = (method = "COD") => ({
    items: cart.map((item) => ({ productId: item.id, qty: item.qty || 1 })),
    city: selectedCity,
    shippingAddress: {
      name: user?.name || "",
      phone: user?.phone || "",
      addressLine1: user?.addressLine1 || "",
      addressLine2: user?.addressLine2 || "",
      city: selectedCity,
      postalCode: user?.postalCode || "",
    },
    payment: { method },
  });

  const handleCodCheckout = async () => {
    if (!codEnabled) {
      await Swal.fire("COD unavailable", "Cash on Delivery is temporarily disabled. Online payment is display-only for now, so checkout is unavailable at the moment.", "info");
      return;
    }

    const preview = cart
      .slice(0, 6)
      .map(
        (item) => `
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
            <img src="${escapeHtml(item.image || "")}" alt="" style="width:40px;height:40px;object-fit:contain;border-radius:10px;background:#faf7fa" />
            <div style="flex:1;">${escapeHtml(item.name)} × ${item.qty || 1}</div>
            <div>৳${(Number(item.price || 0) * Number(item.qty || 1)).toFixed(2)}</div>
          </div>`
      )
      .join("");

    const confirmation = await Swal.fire({
      title: "Review your order",
      html: `
        <div style="text-align:left">
          <div style="margin-bottom:6px"><b>Customer</b>: ${escapeHtml(user.name || user.email)}</div>
          <div style="margin-bottom:8px"><b>Shipping city</b>: ${escapeHtml(selectedCity)}</div>
          <hr/>
          ${preview}
          ${cart.length > 6 ? `<div style="opacity:.7">+ ${cart.length - 6} more item(s)</div>` : ""}
          <hr/>
          <div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>৳${subtotal.toFixed(2)}</span></div>
          <div style="display:flex;justify-content:space-between"><span>Shipping</span><span>${shipping ? `৳${shipping.toFixed(2)}` : "Free"}</span></div>
          <div style="display:flex;justify-content:space-between;font-weight:700"><span>Estimated total</span><span>৳${estimatedTotal.toFixed(2)}</span></div>
          <div style="margin-top:10px;padding:9px 11px;background:#fff8ee;border-radius:10px">Payment: <b>Cash on Delivery</b></div>
        </div>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Place COD order",
      cancelButtonText: "Keep shopping",
      reverseButtons: true,
    });
    if (!confirmation.isConfirmed) return;

    const response = await createOrder(orderPayload("COD"));
    const saved = response.data;
    const order = {
      id: saved._id,
      createdAt: saved.createdAt,
      items: (saved.items || []).map((item) => ({
        id: item.productId,
        name: item.name,
        image: item.image,
        price: item.price,
        qty: item.qty,
      })),
      totals: {
        subtotal: saved.subtotal ?? saved.total,
        discount: saved.discount || 0,
        shipping: saved.shipping || 0,
        grandTotal: saved.total,
      },
      customer: { name: user.name || "", email: user.email || "", city: saved.city || selectedCity },
      payment: saved.payment,
      status: saved.status,
    };
    localStorage.setItem("aura_mosaic_last_order", JSON.stringify(order));
    clearCart();
    window.dispatchEvent(new Event("aura:refresh-me"));

    await Swal.fire({
      title: "Order placed! 🎉",
      html: `<div style="text-align:left"><div><b>Order ID</b>: ${escapeHtml(saved._id)}</div><div><b>Total</b>: ৳${Number(saved.total).toFixed(2)}</div><div><b>Payment</b>: Cash on Delivery</div></div>`,
      icon: "success",
      confirmButtonText: "View confirmation",
    });
    navigate(`/order-confirmation/${saved._id}`, { state: { order } });
  };

  const handleCheckout = async () => {
    if (!(await ensureCheckoutReady())) return;
    setCheckoutBusy(true);
    try {
      await handleCodCheckout();
    } catch (error) {
      await Swal.fire(
        "Order not placed",
        error?.response?.data?.message || error?.message || "Please try again.",
        "error"
      );
    } finally {
      setCheckoutBusy(false);
    }
  };

  return (
    <section className="section cartPage cartPage-v2">
      <div className="container">
        <div className="cartPage__heading">
          <span className="cartPage__eyebrow">Your bag</span>
          <h2 className="hd mb-0">Your Cart</h2>
          <p>
            {cart.length > 0
              ? <>You have <b>{cart.reduce((sum, item) => sum + Number(item.qty || 1), 0)}</b> item(s) ready to checkout.</>
              : <>Your cart is ready for something lovely.</>}
          </p>
        </div>

        {cart.length === 0 ? (
          <div className="cartEmptyState">
            <div className="cartEmptyState__orb" aria-hidden="true"><FiShoppingBag /></div>
            <span className="cartEmptyState__kicker">Nothing here yet</span>
            <h3>Let’s find your next favorite.</h3>
            <p>Browse curated products or let Aura AI turn a few words into a thoughtful gift.</p>
            <div className="cartEmptyState__actions">
              <Link to="/listing/All" className="cartEmptyState__primary">Browse products <FaArrowRightLong /></Link>
              <Link to="/gifting" className="cartEmptyState__secondary"><FaWandMagicSparkles /> Create an AI gift</Link>
            </div>
            <div className="cartEmptyState__trust">
              <span>✨ Curated picks</span>
              <span>🚚 Delivery support</span>
              <span>💳 Online payment options coming soon</span>
            </div>
          </div>
        ) : (
          <>
            {threshold > 0 && (
              <div className={`cart-shipping-progress ${freeShippingRemaining === 0 ? "is-unlocked" : ""}`}>
                <div className="cart-shipping-progress__icon"><FiTruck /></div>
                <div className="cart-shipping-progress__copy">
                  <strong>{freeShippingRemaining === 0 ? "Free shipping unlocked!" : `Add Tk. ${freeShippingRemaining.toFixed(0)} more for free shipping`}</strong>
                  <span>{freeShippingRemaining === 0 ? "Your delivery charge is waived for this cart." : `Free shipping starts at Tk. ${threshold.toFixed(0)}.`}</span>
                </div>
                <div className="cart-shipping-progress__bar"><span style={{ width: `${shippingProgress}%` }} /></div>
              </div>
            )}

            <div className="row cartPage__layout">
              <div className="col-lg-8 pr-lg-4">
                <div className="cart-items-card">
                  {cart.map((item) => (
                    <article className="cart-item-row" key={item.id}>
                      <Link to={`/product/${item.id}`} className="cart-item-row__image">
                        {item.image ? <img src={item.image} alt={item.name} /> : <span>🛍️</span>}
                      </Link>
                      <div className="cart-item-row__content">
                        <Link to={`/product/${item.id}`}><h3>{item.name}</h3></Link>
                        <span className="cart-item-row__unit">৳{Number(item.price || 0).toFixed(2)} each</span>
                        <div className="cartQtyControl">
                          <button onClick={() => setCartQty(item.id, (item.qty || 1) - 1)} aria-label={`Decrease ${item.name} quantity`}>−</button>
                          <span>{item.qty || 1}</span>
                          <button onClick={() => setCartQty(item.id, (item.qty || 1) + 1)} aria-label={`Increase ${item.name} quantity`}>+</button>
                        </div>
                      </div>
                      <div className="cart-item-row__end">
                        <strong>৳{(Number(item.price || 0) * Number(item.qty || 1)).toFixed(2)}</strong>
                        <button className="remove" onClick={() => removeCartItem(item.id)} aria-label={`Remove ${item.name}`}><IoClose /></button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="col-lg-4">
                <div className="card border p-3 cartDetails cartDetails-v2">
                  <span className="cartDetails__kicker">Order summary</span>
                  <h4>Ready when you are</h4>
                  <div className="cart-summary-row"><span>Subtotal</span><strong>৳{subtotal.toFixed(2)}</strong></div>
                  <div className="cart-summary-row"><span>Shipping</span><strong>{shipping ? `৳${shipping.toFixed(2)}` : "Free"}</strong></div>
                  <div className="cart-summary-row"><span>Deliver to</span><strong>{selectedCity || "Select city"}</strong></div>
                  <div className="cart-summary-divider" />
                  <div className="cart-summary-row cartDetails__total"><span>Total</span><strong>৳{estimatedTotal.toFixed(2)}</strong></div>

                  <div className="payment-choice-panel payment-display-only">
                    <div className="payment-choice-heading"><span>Payment method</span><FiShield /></div>
                    <button
                      type="button"
                      className="payment-choice-card active"
                      disabled={!codEnabled}
                    >
                      <span className="payment-choice-icon">🚚</span>
                      <span><strong>Cash on Delivery</strong><small>{codEnabled ? "Available now • Pay when your order arrives" : "Temporarily unavailable"}</small></span>
                      <i />
                    </button>

                    <div className="online-payment-preview">
                      <div className="online-payment-preview__head">
                        <span className="payment-choice-icon"><FiCreditCard /></span>
                        <div>
                          <strong>Online Payment</strong>
                          <small>Coming soon</small>
                        </div>
                        <span className="payment-coming-soon-badge">Coming soon</span>
                      </div>
                      <div className="payment-preview-grid">
                        <div><FiSmartphone /><span>bKash</span></div>
                        <div><FiSmartphone /><span>Nagad</span></div>
                        <div><FiCreditCard /><span>Visa</span></div>
                        <div><FiCreditCard /><span>Mastercard</span></div>
                        <div><FiCreditCard /><span>Debit Card</span></div>
                        <div><FiCreditCard /><span>Credit Card</span></div>
                      </div>
                      <p>These payment options are shown for preview only. Cash on Delivery is the active checkout method right now.</p>
                    </div>
                  </div>

                  <Button className="btn-blue btn-lg btn-big" onClick={handleCheckout} disabled={checkoutBusy || !codEnabled}>
                    <IoMdCart /> &nbsp;
                    {checkoutBusy ? "Please wait…" : "Place COD Order"}
                  </Button>
                  <Link to="/listing/All" className="cart-continue-link">Continue shopping <FaArrowRightLong /></Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default Cart;
