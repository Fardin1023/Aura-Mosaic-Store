import { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MyContext } from "../../App";
import { getMe, getMyOrders, getMyTransactions } from "../../api/api";

const fmt = (n) => Number(n || 0).toFixed(2);

const History = () => {
  const { wishlist } = useContext(MyContext);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [txs, setTxs] = useState([]);
  const [user, setUser] = useState(null);
  const [err, setErr] = useState("");

  const paidSpend = useMemo(
    () => txs.reduce((sum, tx) => sum + (tx.type === "debit" ? Number(tx.amount || 0) : -Number(tx.amount || 0)), 0),
    [txs]
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setErr("");
      try {
        const [meRes, orderRes, txRes] = await Promise.all([getMe(), getMyOrders(), getMyTransactions()]);
        if (cancelled) return;
        setUser(meRes.data?.user || null);
        setOrders(Array.isArray(orderRes.data) ? orderRes.data : []);
        setTxs(Array.isArray(txRes.data) ? txRes.data : []);
      } catch (error) {
        console.error(error);
        if (!cancelled) setErr(error?.response?.data?.message || "Failed to load your history.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="section container" style={{ maxWidth: 1100 }}>
      <div className="d-flex align-items-center mb-3">
        <h2 className="mb-0">Your History</h2>
        <div className="ml-auto small"><Link to="/" className="text-muted">← Continue shopping</Link></div>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}

      <div className="card shadow-sm mb-4">
        <div className="card-body d-flex align-items-center">
          <img
            src={user?.picture || "https://via.placeholder.com/80?text=User"}
            alt="Profile"
            style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }}
            className="mr-3"
          />
          <div>
            <div className="h5 mb-0">{user?.name || "Customer"}</div>
            <div className="text-muted small">{user?.email || ""}{user?.city ? ` • ${user.city}` : ""}</div>
          </div>
          <div className="ml-auto text-right">
            <div className="small text-muted">Recorded paid spend</div>
            <div className="h5 mb-0">Tk. {fmt(user?.spent ?? paidSpend)}</div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex align-items-center mb-2">
            <h4 className="mb-0">Orders</h4>
            <span className="badge badge-pill badge-info ml-3">{orders.length}</span>
          </div>
          {loading ? <p>Loading…</p> : orders.length === 0 ? (
            <p className="text-muted mb-0">No orders yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead><tr><th>Date</th><th>Items</th><th>Payment</th><th>Status</th><th className="text-right">Total (Tk.)</th></tr></thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id}>
                      <td><Link to={`/order-confirmation/${order._id}`}>{new Date(order.createdAt).toLocaleString()}</Link></td>
                      <td>
                        {Array.isArray(order.items) ? order.items.map((item) => item.name).slice(0, 4).join(", ") : "-"}
                        {Array.isArray(order.items) && order.items.length > 4 ? " …" : ""}
                      </td>
                      <td>{order.payment?.provider || order.payment?.method || "COD"}</td>
                      <td><span className="badge badge-info text-uppercase">{order.status}</span></td>
                      <td className="text-right">{fmt(order.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex align-items-center mb-2">
            <h4 className="mb-0">Transactions</h4>
            <span className="badge badge-pill badge-info ml-3">{txs.length}</span>
          </div>
          {loading ? <p>Loading…</p> : txs.length === 0 ? (
            <p className="text-muted mb-0">No completed payment transactions yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead><tr><th>Date</th><th>Type</th><th>Description</th><th className="text-right">Amount (Tk.)</th></tr></thead>
                <tbody>
                  {txs.map((tx) => (
                    <tr key={tx._id}>
                      <td>{new Date(tx.createdAt).toLocaleString()}</td>
                      <td className="text-capitalize">{tx.type}</td>
                      <td>{tx.description || "-"}</td>
                      <td className="text-right">{fmt(tx.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="d-flex align-items-center mb-2">
            <h4 className="mb-0">Wishlist</h4>
            <span className="badge badge-pill badge-info ml-3">{wishlist.length}</span>
            <div className="ml-auto"><Link to="/wishlist" className="btn btn-sm btn-outline-primary">Open wishlist</Link></div>
          </div>

          {wishlist.length === 0 ? <p className="text-muted mb-0">No items saved yet.</p> : (
            <div className="row">
              {wishlist.slice(0, 8).map((product) => {
                const id = product._id || product.id;
                const img = (Array.isArray(product.images) && product.images[0]) || product.thumbnail || product.image || "";
                return (
                  <div className="col-6 col-md-3 mb-3" key={id}>
                    <div className="card h-100">
                      {img && <img src={img} alt={product.name || "Product"} className="card-img-top" />}
                      <div className="card-body">
                        <div className="small mb-1">{product.name || "Product"}</div>
                        <div className="font-weight-bold">৳{fmt(product.price)}</div>
                        <Link to={`/product/${id}`} className="btn btn-sm btn-primary mt-2">View</Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default History;
