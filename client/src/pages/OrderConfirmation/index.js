import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { FiArrowRight, FiCheckCircle, FiClock, FiCreditCard, FiMapPin, FiPackage, FiTruck } from "react-icons/fi";
import { getOrderById } from "../../api/api";
import { MyContext } from "../../App";

const ORDER_STEPS = ["pending", "confirmed", "processing", "shipped", "delivered"];

const normalizeOrder = (source, fallbackCustomer = null) => {
  if (!source) return null;
  if (source.totals) return source;
  return {
    id: source._id,
    createdAt: source.createdAt,
    items: (source.items || []).map((item) => ({
      id: item.productId,
      name: item.name,
      image: item.image,
      price: item.price,
      qty: item.qty,
    })),
    totals: {
      subtotal: source.subtotal ?? source.total,
      discount: source.discount || 0,
      shipping: source.shipping || 0,
      grandTotal: source.total,
    },
    customer: {
      name: source.user?.name || fallbackCustomer?.name || "",
      email: source.user?.email || fallbackCustomer?.email || "",
      ...(fallbackCustomer || {}),
      city: source.city || source.shippingAddress?.city || fallbackCustomer?.city || "",
    },
    shippingAddress: source.shippingAddress || {},
    payment: source.payment,
    status: source.status,
    trackingNumber: source.trackingNumber || "",
  };
};

const statusIcon = (status) => {
  if (status === "delivered") return <FiCheckCircle />;
  if (status === "shipped") return <FiTruck />;
  if (status === "processing") return <FiPackage />;
  return <FiClock />;
};

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart, refreshUser } = useContext(MyContext);
  const paymentHandledRef = useRef(false);
  const initialOrder = useMemo(() => {
    if (location.state?.order) return location.state.order;
    try {
      const saved = JSON.parse(localStorage.getItem("aura_mosaic_last_order"));
      return saved?.id === orderId ? saved : null;
    } catch {
      return null;
    }
  }, [location.state, orderId]);

  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(!initialOrder);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("payment") === "success" && !paymentHandledRef.current) {
      paymentHandledRef.current = true;
      clearCart?.();
      localStorage.removeItem("aura_mosaic_last_order");
      refreshUser?.();
    }
    // Run once per payment-result URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await getOrderById(orderId);
        if (!cancelled) setOrder((current) => normalizeOrder(response.data, current?.customer));
      } catch (err) {
        if (!cancelled && !initialOrder) setError(err?.response?.data?.message || "This order could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [orderId, initialOrder]);

  if (loading) {
    return <section className="section order-confirmation-page-v2"><div className="container"><div className="aura-skeleton order-confirmation-skeleton" /></div></section>;
  }

  if (!order) {
    return (
      <section className="section order-confirmation-page-v2">
        <div className="container">
          <div className="order-not-found-v2"><FiPackage /><h2>Order not found</h2><p>{error || "We couldn't find this order in your account."}</p><div><Link to="/history" className="aura-btn aura-btn-primary">My account</Link><Link to="/" className="aura-btn aura-btn-ghost">Home</Link></div></div>
        </div>
      </section>
    );
  }

  const { items = [], totals = {}, customer = {}, createdAt, payment, status, trackingNumber, shippingAddress = {} } = order;
  const normalizedStatus = String(status || "pending").toLowerCase();
  const currentStep = Math.max(0, ORDER_STEPS.indexOf(normalizedStatus));
  const paymentSummary = payment?.method === "COD" || payment?.provider === "COD"
    ? `Cash on Delivery • ${payment?.status || "PENDING"}`
    : `${payment?.provider || payment?.method || "Payment"} • ${payment?.status || "PENDING"}`;

  return (
    <section className="section order-confirmation-page-v2">
      <div className="container">
        <div className="order-success-hero-v2">
          <div className="order-success-icon-v2"><FiCheckCircle /></div>
          <div>
            <span className="order-success-kicker-v2">Order received</span>
            <h1>Thank you — your order is in.</h1>
            <p>Order <strong>#{String(order.id).slice(-8)}</strong>{createdAt ? ` • ${new Date(createdAt).toLocaleString()}` : ""}</p>
          </div>
          <button onClick={() => navigate("/")}>Continue shopping <FiArrowRight /></button>
        </div>

        {normalizedStatus !== "cancelled" ? (
          <div className="order-progress-card-v2">
            <div className="order-progress-heading-v2"><div><span>Delivery progress</span><h2>{normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)}</h2></div><span className={`order-status-badge-v2 is-${normalizedStatus}`}>{statusIcon(normalizedStatus)} {normalizedStatus}</span></div>
            <div className="order-progress-line-v2">
              {ORDER_STEPS.map((step, index) => <div className={index <= currentStep ? "done" : ""} key={step}><i /><span>{step}</span></div>)}
            </div>
            {trackingNumber && <div className="order-tracking-number-v2"><FiTruck /><span>Tracking number</span><strong>{trackingNumber}</strong></div>}
          </div>
        ) : (
          <div className="order-cancelled-card-v2">This order has been cancelled. Any reserved inventory has been handled by the store.</div>
        )}

        <div className="order-confirmation-grid-v2">
          <div className="order-items-card-v2">
            <div className="order-section-heading-v2"><span>Items</span><h2>Your order</h2></div>
            <div className="order-items-list-v2">
              {items.map((item) => (
                <article key={item.id || item.name}>
                  <div className="order-item-image-v2">{item.image ? <img src={item.image} alt={item.name} /> : <span>🛍️</span>}</div>
                  <div className="order-item-copy-v2"><strong>{item.name}</strong><span>৳{Number(item.price || 0).toFixed(2)} each</span></div>
                  <span className="order-item-qty-v2">× {item.qty || 1}</span>
                  <strong className="order-item-total-v2">৳{(Number(item.price || 0) * Number(item.qty || 1)).toFixed(2)}</strong>
                </article>
              ))}
            </div>
          </div>

          <aside className="order-summary-card-v2">
            <div className="order-section-heading-v2"><span>Summary</span><h2>Order total</h2></div>
            <div className="order-summary-row-v2"><span>Subtotal</span><strong>৳{Number(totals.subtotal || 0).toFixed(2)}</strong></div>
            {Number(totals.discount || 0) > 0 && <div className="order-summary-row-v2"><span>Discount</span><strong>−৳{Number(totals.discount).toFixed(2)}</strong></div>}
            <div className="order-summary-row-v2"><span>Shipping</span><strong>{Number(totals.shipping || 0) ? `৳${Number(totals.shipping).toFixed(2)}` : "Free"}</strong></div>
            <div className="order-summary-divider-v2" />
            <div className="order-summary-row-v2 total"><span>Total</span><strong>৳{Number(totals.grandTotal || 0).toFixed(2)}</strong></div>

            <div className="order-info-box-v2"><FiCreditCard /><div><span>Payment</span><strong>{paymentSummary}</strong></div></div>
            <div className="order-info-box-v2"><FiMapPin /><div><span>Deliver to</span><strong>{shippingAddress.addressLine1 || customer?.city || "Selected delivery city"}</strong>{shippingAddress.addressLine2 && <small>{shippingAddress.addressLine2}</small>}{(shippingAddress.city || customer?.city) && <small>{shippingAddress.city}{shippingAddress.postalCode ? ` • ${shippingAddress.postalCode}` : ""}</small>}</div></div>

            <Link to="/history" className="order-history-link-v2">View in My Account <FiArrowRight /></Link>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default OrderConfirmation;
