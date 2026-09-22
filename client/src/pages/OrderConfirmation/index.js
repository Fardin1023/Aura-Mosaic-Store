import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { getOrderById } from "../../api/api";

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
      city: source.city || fallbackCustomer?.city || "",
    },
    payment: source.payment,
    status: source.status,
  };
};

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
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
    let cancelled = false;
    const load = async () => {
      try {
        const response = await getOrderById(orderId);
        if (!cancelled) setOrder((current) => normalizeOrder(response.data, current?.customer));
      } catch (err) {
        if (!cancelled && !initialOrder) {
          setError(err?.response?.data?.message || "This order could not be loaded.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [orderId, initialOrder]);

  if (loading) {
    return <section className="section"><div className="container text-center"><p>Loading order…</p></div></section>;
  }

  if (!order) {
    return (
      <section className="section">
        <div className="container text-center">
          <h2 className="hd">Order not found</h2>
          <p className="text-muted">{error || "We couldn't find this order in your account."}</p>
          <Link to="/history" className="btn btn-primary mr-2">Order history</Link>
          <Link to="/" className="btn btn-outline-secondary">Go to Home</Link>
        </div>
      </section>
    );
  }

  const { items = [], totals = {}, customer = {}, createdAt, payment, status } = order;
  const paymentSummary = payment?.method === "COD" || payment?.provider === "COD"
    ? `Cash on Delivery • ${payment?.status || "PENDING"}`
    : `${payment?.provider || payment?.method || "Payment"} • ${payment?.status || "PENDING"}`;

  return (
    <section className="section">
      <div className="container">
        <div className="card p-4 shadow">
          <div className="d-flex align-items-center mb-3">
            <div className="d-flex align-items-center justify-content-center mr-3" style={{ width: 48, height: 48, borderRadius: "50%", background: "#e8f5e9", fontSize: 24 }}>✅</div>
            <div>
              <h3 className="mb-0">Your order has been placed.</h3>
              <small className="text-muted">Order ID <b>{order.id}</b>{createdAt ? ` • ${new Date(createdAt).toLocaleString()}` : ""}</small>
              <div className="mt-1 small text-uppercase">Status: <b>{status || "pending"}</b></div>
              <div style={{ marginTop: 8, padding: "8px 10px", background: "#f8fffb", border: "1px solid #d7f2e3", borderRadius: 8 }}>
                🚚 Estimated delivery: <b>within 3 working days</b>.
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-8">
              <h5 className="mb-3">Items</h5>
              <div className="table-responsive">
                <table className="table">
                  <thead><tr><th>Product</th><th className="text-center" width="120">Qty</th><th className="text-right" width="160">Total</th></tr></thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id || item.name}>
                        <td>
                          <div className="d-flex align-items-center">
                            <img src={item.image || "https://via.placeholder.com/60?text=Product"} alt={item.name} style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8 }} className="mr-2" />
                            <div><div>{item.name}</div><small className="text-muted">৳{Number(item.price || 0).toFixed(2)}</small></div>
                          </div>
                        </td>
                        <td className="text-center">{item.qty || 1}</td>
                        <td className="text-right">৳{(Number(item.price || 0) * Number(item.qty || 1)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card p-3">
                <h5 className="mb-3">Order Summary</h5>
                <div className="d-flex mb-2"><span>Subtotal</span><span className="ml-auto">৳{Number(totals.subtotal || 0).toFixed(2)}</span></div>
                {Number(totals.discount || 0) > 0 && <div className="d-flex mb-2"><span>Discount</span><span className="ml-auto">−৳{Number(totals.discount).toFixed(2)}</span></div>}
                <div className="d-flex mb-2"><span>Shipping</span><span className="ml-auto">{Number(totals.shipping || 0) ? `৳${Number(totals.shipping).toFixed(2)}` : "Free"}</span></div>
                <div className="d-flex font-weight-bold border-top pt-2"><span>Grand Total</span><span className="ml-auto">৳{Number(totals.grandTotal || 0).toFixed(2)}</span></div>

                <hr />
                <h6>Payment</h6>
                <div className="small mb-2">{paymentSummary}</div>

                <h6>Customer</h6>
                <div className="small">
                  {customer?.name && <div><b>{customer.name}</b></div>}
                  {customer?.email && <div>{customer.email}</div>}
                  {customer?.city && <div>City: {customer.city}</div>}
                </div>

                <button className="btn btn-primary btn-block mt-3" onClick={() => navigate("/")}>Continue shopping</button>
                <Link className="btn btn-link btn-block" to="/history">View order history</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OrderConfirmation;
