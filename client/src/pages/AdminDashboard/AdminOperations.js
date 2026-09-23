import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  adjustInventory,
  deleteAdminContactMessage,
  deleteAdminNewsletterSubscriber,
  deleteAdminReview,
  getAdminContactMessages,
  getAdminNewsletterSubscribers,
  getAdminProducts,
  getAdminReviews,
  getAdminStoreSettings,
  getAdminTransactions,
  getAdminTransactionSummary,
  getInventoryHistory,
  restoreAdminProduct,
  updateAdminContactMessage,
  updateAdminNewsletterSubscriber,
  updateAdminReviewVisibility,
  updateAdminStoreSettings,
} from "../../api/api";
import "./operations.css";

function msg(error, fallback = "Something went wrong.") {
  return error?.response?.data?.message || error?.message || fallback;
}

function money(value) {
  return `Tk. ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function date(value) {
  return value ? new Date(value).toLocaleString() : "—";
}

const DEFAULT_SETTINGS = {
  storeName: "Aura Mosaic",
  currency: "BDT",
  shippingFlatFee: 60,
  freeShippingThreshold: 500,
  lowStockThreshold: 5,
  allowCOD: true,
  supportEmail: "",
  supportPhone: "",
  announcement: "",
};

export default function AdminOperations({ onChanged }) {
  const [section, setSection] = useState("inbox");
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [transactionSummary, setTransactionSummary] = useState({ paidRevenue: 0, byStatus: [] });
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [search, setSearch] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [messageRes, reviewRes, productRes, inventoryRes, subscriberRes, transactionRes, summaryRes, settingsRes] = await Promise.all([
        getAdminContactMessages(),
        getAdminReviews(),
        getAdminProducts(),
        getInventoryHistory(),
        getAdminNewsletterSubscribers(),
        getAdminTransactions(),
        getAdminTransactionSummary(),
        getAdminStoreSettings(),
      ]);
      setMessages(Array.isArray(messageRes.data) ? messageRes.data : []);
      setReviews(Array.isArray(reviewRes.data) ? reviewRes.data : []);
      setProducts(Array.isArray(productRes.data) ? productRes.data : []);
      setInventory(Array.isArray(inventoryRes.data) ? inventoryRes.data : []);
      setSubscribers(Array.isArray(subscriberRes.data) ? subscriberRes.data : []);
      setTransactions(Array.isArray(transactionRes.data) ? transactionRes.data : []);
      setTransactionSummary(summaryRes.data || { paidRevenue: 0, byStatus: [] });
      setSettings({ ...DEFAULT_SETTINGS, ...(settingsRes.data || {}) });
    } catch (error) {
      Swal.fire("Could not load administration tools", msg(error), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const q = search.trim().toLowerCase();
  const filteredMessages = useMemo(() => !q ? messages : messages.filter((item) =>
    [item.name, item.email, item.subject, item.message, item.status].some((v) => String(v || "").toLowerCase().includes(q))), [messages, q]);
  const filteredReviews = useMemo(() => !q ? reviews : reviews.filter((item) =>
    [item.productName, item.name, item.comment, item.rating].some((v) => String(v || "").toLowerCase().includes(q))), [reviews, q]);
  const filteredProducts = useMemo(() => !q ? products : products.filter((item) =>
    [item.name, item.sku, item.brand, item.vendor].some((v) => String(v || "").toLowerCase().includes(q))), [products, q]);
  const filteredSubscribers = useMemo(() => !q ? subscribers : subscribers.filter((item) => String(item.email || "").toLowerCase().includes(q)), [subscribers, q]);
  const filteredTransactions = useMemo(() => !q ? transactions : transactions.filter((item) =>
    [item._id, item?.user?.name, item?.user?.email, item.status, item.provider, item.method, item.description].some((v) => String(v || "").toLowerCase().includes(q))), [transactions, q]);

  const refresh = async () => {
    await load();
    if (onChanged) onChanged();
  };

  const changeMessageStatus = async (item, status) => {
    try {
      await updateAdminContactMessage(item._id, { status });
      setMessages((rows) => rows.map((row) => row._id === item._id ? { ...row, status } : row));
      if (onChanged) onChanged();
    } catch (error) { Swal.fire("Could not update message", msg(error), "error"); }
  };

  const editMessageNote = async (item) => {
    const result = await Swal.fire({ title: "Internal note", input: "textarea", inputValue: item.adminNote || "", showCancelButton: true });
    if (!result.isConfirmed) return;
    try {
      const res = await updateAdminContactMessage(item._id, { adminNote: result.value || "" });
      setMessages((rows) => rows.map((row) => row._id === item._id ? res.data : row));
    } catch (error) { Swal.fire("Could not save note", msg(error), "error"); }
  };

  const removeMessage = async (item) => {
    const result = await Swal.fire({ title: "Delete contact message?", icon: "warning", showCancelButton: true, confirmButtonText: "Delete" });
    if (!result.isConfirmed) return;
    try {
      await deleteAdminContactMessage(item._id);
      setMessages((rows) => rows.filter((row) => row._id !== item._id));
      if (onChanged) onChanged();
    } catch (error) { Swal.fire("Could not delete message", msg(error), "error"); }
  };

  const toggleReview = async (review) => {
    try {
      const next = review.isVisible === false;
      await updateAdminReviewVisibility(review.productId, review._id, next);
      setReviews((rows) => rows.map((row) => row._id === review._id ? { ...row, isVisible: next } : row));
      if (onChanged) onChanged();
    } catch (error) { Swal.fire("Could not update review", msg(error), "error"); }
  };

  const removeReview = async (review) => {
    const result = await Swal.fire({ title: "Delete this review?", icon: "warning", showCancelButton: true, confirmButtonText: "Delete" });
    if (!result.isConfirmed) return;
    try {
      await deleteAdminReview(review.productId, review._id);
      setReviews((rows) => rows.filter((row) => row._id !== review._id));
      if (onChanged) onChanged();
    } catch (error) { Swal.fire("Could not delete review", msg(error), "error"); }
  };

  const adjustStock = async (product) => {
    const amount = await Swal.fire({ title: `Adjust stock: ${product.name}`, input: "number", inputLabel: "Change (+ to add, - to remove)", inputValue: 1, showCancelButton: true });
    if (!amount.isConfirmed) return;
    const delta = Number(amount.value);
    if (!Number.isInteger(delta) || delta === 0) return Swal.fire("Invalid adjustment", "Enter a non-zero whole number.", "warning");
    const reason = await Swal.fire({ title: "Reason", input: "text", inputPlaceholder: "Restock, damaged item, manual correction…", showCancelButton: true });
    if (!reason.isConfirmed) return;
    try {
      await adjustInventory(product._id, { delta, reason: reason.value || "Manual adjustment" });
      await refresh();
    } catch (error) { Swal.fire("Could not adjust stock", msg(error), "error"); }
  };

  const restoreProduct = async (product) => {
    try {
      await restoreAdminProduct(product._id);
      await refresh();
      Swal.fire({ title: "Product restored", icon: "success", timer: 1000, showConfirmButton: false });
    } catch (error) { Swal.fire("Could not restore product", msg(error), "error"); }
  };

  const toggleSubscriber = async (subscriber) => {
    try {
      const res = await updateAdminNewsletterSubscriber(subscriber._id, !subscriber.active);
      setSubscribers((rows) => rows.map((row) => row._id === subscriber._id ? res.data : row));
      if (onChanged) onChanged();
    } catch (error) { Swal.fire("Could not update subscriber", msg(error), "error"); }
  };

  const removeSubscriber = async (subscriber) => {
    const result = await Swal.fire({ title: "Delete subscriber?", icon: "warning", showCancelButton: true, confirmButtonText: "Delete" });
    if (!result.isConfirmed) return;
    try {
      await deleteAdminNewsletterSubscriber(subscriber._id);
      setSubscribers((rows) => rows.filter((row) => row._id !== subscriber._id));
      if (onChanged) onChanged();
    } catch (error) { Swal.fire("Could not delete subscriber", msg(error), "error"); }
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    setSavingSettings(true);
    try {
      const payload = {
        ...settings,
        shippingFlatFee: Number(settings.shippingFlatFee),
        freeShippingThreshold: Number(settings.freeShippingThreshold),
        lowStockThreshold: Number(settings.lowStockThreshold),
      };
      const res = await updateAdminStoreSettings(payload);
      setSettings({ ...DEFAULT_SETTINGS, ...res.data });
      if (onChanged) onChanged();
      Swal.fire({ title: "Store settings saved", icon: "success", timer: 1100, showConfirmButton: false });
    } catch (error) { Swal.fire("Could not save settings", msg(error), "error"); }
    finally { setSavingSettings(false); }
  };

  if (loading) return <section className="admin-panel"><div className="admin-inline-loading">Loading administration tools…</div></section>;

  return (
    <>
      <section className="admin-panel admin-ops-header">
        <div className="admin-panel-title">
          <div><h2>Backend Operations</h2><p>Functional administration tools. You can redesign these screens later without changing the APIs.</p></div>
          {section !== "settings" && <input className="admin-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search this section…" />}
        </div>
        <div className="admin-ops-tabs">
          {[
            ["inbox", `Inbox (${messages.filter((m) => m.status === "new").length})`],
            ["reviews", `Reviews (${reviews.length})`],
            ["inventory", "Inventory"],
            ["newsletter", `Newsletter (${subscribers.filter((s) => s.active).length})`],
            ["transactions", "Transactions"],
            ["settings", "Store Settings"],
          ].map(([value, label]) => <button key={value} type="button" className={section === value ? "active" : ""} onClick={() => { setSection(value); setSearch(""); }}>{label}</button>)}
        </div>
      </section>

      {section === "inbox" && <section className="admin-panel"><div className="admin-panel-title"><div><h2>Contact Inbox</h2><p>Mark messages read/resolved, keep an internal note, or remove spam.</p></div></div><div className="admin-order-table-wrap"><table className="admin-order-table"><thead><tr><th>From</th><th>Subject / Message</th><th>Status</th><th>Received</th><th>Actions</th></tr></thead><tbody>{filteredMessages.length ? filteredMessages.map((item) => <tr key={item._id}><td><strong>{item.name}</strong><span className="admin-table-sub">{item.email}</span></td><td><strong>{item.subject || "No subject"}</strong><span className="admin-table-sub admin-ops-message">{item.message}</span>{item.adminNote && <span className="admin-table-sub">Internal: {item.adminNote}</span>}</td><td><select value={item.status} onChange={(e) => changeMessageStatus(item, e.target.value)}><option value="new">New</option><option value="read">Read</option><option value="resolved">Resolved</option></select></td><td>{date(item.createdAt)}</td><td><button className="admin-order-link" onClick={() => editMessageNote(item)}>Note</button> <button className="admin-danger-link" onClick={() => removeMessage(item)}>Delete</button></td></tr>) : <tr><td colSpan="5" className="admin-empty-cell">No messages.</td></tr>}</tbody></table></div></section>}

      {section === "reviews" && <section className="admin-panel"><div className="admin-panel-title"><div><h2>Review Moderation</h2><p>Hide inappropriate reviews without deleting them, or remove them permanently.</p></div></div><div className="admin-order-table-wrap"><table className="admin-order-table"><thead><tr><th>Product</th><th>Reviewer</th><th>Rating</th><th>Review</th><th>Visibility</th><th>Actions</th></tr></thead><tbody>{filteredReviews.length ? filteredReviews.map((review) => <tr key={`${review.productId}-${review._id}`}><td>{review.productName}</td><td>{review.name || "Customer"}<span className="admin-table-sub">{review.verifiedPurchase ? "Verified purchase" : "Unverified"}</span></td><td>{review.rating}/5</td><td>{review.comment}</td><td>{review.isVisible === false ? "Hidden" : "Visible"}</td><td><button className="admin-order-link" onClick={() => toggleReview(review)}>{review.isVisible === false ? "Show" : "Hide"}</button> <button className="admin-danger-link" onClick={() => removeReview(review)}>Delete</button></td></tr>) : <tr><td colSpan="6" className="admin-empty-cell">No reviews.</td></tr>}</tbody></table></div></section>}

      {section === "inventory" && <><section className="admin-panel"><div className="admin-panel-title"><div><h2>Inventory Control</h2><p>Make traceable stock corrections and restore archived catalogue items.</p></div></div><div className="admin-order-table-wrap"><table className="admin-order-table"><thead><tr><th>Product</th><th>SKU</th><th>Stock</th><th>Catalogue</th><th>Action</th></tr></thead><tbody>{filteredProducts.length ? filteredProducts.map((product) => <tr key={product._id}><td><strong>{product.name}</strong></td><td>{product.sku || "—"}</td><td>{product.countInStock}</td><td>{product.isActive === false ? "Archived" : "Active"}</td><td>{product.isActive === false ? <button className="admin-order-link" onClick={() => restoreProduct(product)}>Restore</button> : <button className="admin-order-link" onClick={() => adjustStock(product)}>Adjust stock</button>}</td></tr>) : <tr><td colSpan="5" className="admin-empty-cell">No products.</td></tr>}</tbody></table></div></section><section className="admin-panel"><div className="admin-panel-title"><div><h3>Recent Inventory Movements</h3><p>{inventory.length} recorded manual adjustment{inventory.length === 1 ? "" : "s"}.</p></div></div><div className="admin-order-table-wrap"><table className="admin-order-table"><thead><tr><th>Product</th><th>Change</th><th>Before → After</th><th>Reason</th><th>Admin</th><th>Date</th></tr></thead><tbody>{inventory.slice(0,100).map((row) => <tr key={row._id}><td>{row?.product?.name || "Product"}</td><td><strong>{row.delta > 0 ? `+${row.delta}` : row.delta}</strong></td><td>{row.before} → {row.after}</td><td>{row.reason}</td><td>{row?.admin?.name || row?.admin?.email || "Admin"}</td><td>{date(row.createdAt)}</td></tr>)}</tbody></table></div></section></>}

      {section === "newsletter" && <section className="admin-panel"><div className="admin-panel-title"><div><h2>Newsletter Subscribers</h2><p>Manage consent state. Actual email campaigns still require an email provider.</p></div></div><div className="admin-order-table-wrap"><table className="admin-order-table"><thead><tr><th>Email</th><th>Status</th><th>Subscribed</th><th>Actions</th></tr></thead><tbody>{filteredSubscribers.length ? filteredSubscribers.map((subscriber) => <tr key={subscriber._id}><td>{subscriber.email}</td><td>{subscriber.active ? "Active" : "Unsubscribed"}</td><td>{date(subscriber.createdAt)}</td><td><button className="admin-order-link" onClick={() => toggleSubscriber(subscriber)}>{subscriber.active ? "Deactivate" : "Reactivate"}</button> <button className="admin-danger-link" onClick={() => removeSubscriber(subscriber)}>Delete</button></td></tr>) : <tr><td colSpan="4" className="admin-empty-cell">No subscribers.</td></tr>}</tbody></table></div></section>}

      {section === "transactions" && <><section className="admin-ops-summary"><article><span>Paid revenue</span><strong>{money(transactionSummary.paidRevenue)}</strong></article>{(transactionSummary.byStatus || []).map((row) => <article key={row.status}><span>{row.status}</span><strong>{row.count}</strong><small>{money(row.amount)}</small></article>)}</section><section className="admin-panel"><div className="admin-panel-title"><div><h2>Transactions</h2><p>Server-created payment ledger. Browser code cannot mark an order paid.</p></div></div><div className="admin-order-table-wrap"><table className="admin-order-table"><thead><tr><th>Transaction</th><th>Customer</th><th>Amount</th><th>Method</th><th>Status</th><th>Description</th><th>Date</th></tr></thead><tbody>{filteredTransactions.length ? filteredTransactions.map((row) => <tr key={row._id}><td>#{String(row._id).slice(-8).toUpperCase()}</td><td>{row?.user?.name || "Customer"}<span className="admin-table-sub">{row?.user?.email || "—"}</span></td><td>{money(row.amount)}</td><td>{row.provider || row.method || "—"}</td><td>{row.status || "—"}</td><td>{row.description || "—"}</td><td>{date(row.createdAt)}</td></tr>) : <tr><td colSpan="7" className="admin-empty-cell">No transactions.</td></tr>}</tbody></table></div></section></>}

      {section === "settings" && <section className="admin-panel"><div className="admin-panel-title"><div><h2>Store Settings</h2><p>These values are used by the backend when calculating orders and inventory alerts.</p></div></div><form className="admin-ops-settings" onSubmit={saveSettings}><label>Store name<input value={settings.storeName} onChange={(e) => setSettings((s) => ({ ...s, storeName: e.target.value }))} /></label><label>Currency<input value={settings.currency} onChange={(e) => setSettings((s) => ({ ...s, currency: e.target.value }))} /></label><label>Flat shipping fee<input type="number" min="0" value={settings.shippingFlatFee} onChange={(e) => setSettings((s) => ({ ...s, shippingFlatFee: e.target.value }))} /></label><label>Free shipping threshold<input type="number" min="0" value={settings.freeShippingThreshold} onChange={(e) => setSettings((s) => ({ ...s, freeShippingThreshold: e.target.value }))} /></label><label>Low-stock threshold<input type="number" min="0" value={settings.lowStockThreshold} onChange={(e) => setSettings((s) => ({ ...s, lowStockThreshold: e.target.value }))} /></label><label>Support email<input type="email" value={settings.supportEmail} onChange={(e) => setSettings((s) => ({ ...s, supportEmail: e.target.value }))} /></label><label>Support phone<input value={settings.supportPhone} onChange={(e) => setSettings((s) => ({ ...s, supportPhone: e.target.value }))} /></label><label className="admin-ops-wide">Announcement<textarea value={settings.announcement} onChange={(e) => setSettings((s) => ({ ...s, announcement: e.target.value }))} /></label><label className="admin-ops-checkbox"><input type="checkbox" checked={Boolean(settings.allowCOD)} onChange={(e) => setSettings((s) => ({ ...s, allowCOD: e.target.checked }))} /> Allow Cash on Delivery</label><div className="admin-ops-wide"><button className="admin-primary-btn" disabled={savingSettings}>{savingSettings ? "Saving…" : "Save settings"}</button></div></form></section>}
    </>
  );
}
