import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiHeart,
  FiLock,
  FiMapPin,
  FiPackage,
  FiTruck,
  FiUser,
  FiXCircle,
} from "react-icons/fi";
import { MyContext } from "../../App";
import ProductItem from "../../components/ProductItem";
import CityPickerModal from "../../components/CityPickerModal";
import {
  cancelMyOrder,
  changePassword,
  disableMyAccount,
  getMe,
  getMyOrders,
  getMyTransactions,
  updateMe,
} from "../../api/api";

const fmt = (n) => Number(n || 0).toFixed(2);
const statusOrder = ["pending", "confirmed", "processing", "shipped", "delivered"];

const statusIcon = (status) => {
  switch (status) {
    case "delivered": return <FiCheckCircle />;
    case "shipped": return <FiTruck />;
    case "cancelled": return <FiXCircle />;
    case "processing": return <FiPackage />;
    default: return <FiClock />;
  }
};

const History = () => {
  const {
    wishlist,
    refreshUser,
    cityList,
    setSelectedCity,
    user: contextUser,
  } = useContext(MyContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [txs, setTxs] = useState([]);
  const [user, setUser] = useState(contextUser || null);
  const [err, setErr] = useState("");
  const [activeTab, setActiveTab] = useState("profile");
  const [profileSaving, setProfileSaving] = useState(false);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [profile, setProfile] = useState({ name: "", phone: "", city: "", addressLine1: "", addressLine2: "", postalCode: "", picture: "" });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const paidSpend = useMemo(
    () => txs.reduce((sum, tx) => sum + (tx.type === "debit" ? Number(tx.amount || 0) : -Number(tx.amount || 0)), 0),
    [txs]
  );

  const totalItems = useMemo(
    () => orders.reduce((sum, order) => sum + (order.items || []).reduce((s, item) => s + Number(item.qty || 1), 0), 0),
    [orders]
  );

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const [meRes, orderRes, txRes] = await Promise.all([getMe(), getMyOrders(), getMyTransactions()]);
      const nextUser = meRes.data?.user || contextUser || null;
      setUser(nextUser);
      setOrders(Array.isArray(orderRes.data) ? orderRes.data : []);
      setTxs(Array.isArray(txRes.data) ? txRes.data : []);
      setProfile({
        name: nextUser?.name || "",
        phone: nextUser?.phone || "",
        city: nextUser?.city || "",
        addressLine1: nextUser?.addressLine1 || "",
        addressLine2: nextUser?.addressLine2 || "",
        postalCode: nextUser?.postalCode || "",
        picture: nextUser?.picture || "",
      });
    } catch (error) {
      console.error(error);
      setErr(error?.response?.data?.message || "Failed to load your account.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!contextUser) return;
    setUser(contextUser);
    if (contextUser.city) {
      setProfile((current) => ({ ...current, city: contextUser.city }));
    }
  }, [contextUser]);

  const cancelOrder = async (order) => {
    const ask = await Swal.fire({
      title: "Cancel this order?",
      text: "If the order is still eligible, stock will be restored automatically.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, cancel order",
      cancelButtonText: "Keep order",
      reverseButtons: true,
    });
    if (!ask.isConfirmed) return;
    try {
      const response = await cancelMyOrder(order._id);
      setOrders((current) => current.map((item) => item._id === order._id ? (response.data || { ...item, status: "cancelled" }) : item));
      Swal.fire("Order cancelled", "Your order status has been updated.", "success");
    } catch (error) {
      Swal.fire("Could not cancel", error?.response?.data?.message || "This order can no longer be cancelled.", "info");
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setProfileSaving(true);
    try {
      const response = await updateMe({ ...profile, isProfileComplete: true });
      if (response.data?.user) setUser(response.data.user);
      if (profile.city) setSelectedCity?.(profile.city);
      await refreshUser?.();
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Profile updated", showConfirmButton: false, timer: 1500 });
    } catch (error) {
      Swal.fire("Profile not updated", error?.response?.data?.message || "Please check your information and try again.", "error");
    } finally {
      setProfileSaving(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    if (passwords.newPassword.length < 8) {
      Swal.fire("Password too short", "Use at least 8 characters.", "warning");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      Swal.fire("Passwords do not match", "Re-enter the new password and try again.", "warning");
      return;
    }
    setPasswordSaving(true);
    try {
      const response = await changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      Swal.fire("Password updated", response.data?.message || "Your password was updated successfully.", "success");
    } catch (error) {
      Swal.fire("Password not updated", error?.response?.data?.message || "Please try again.", "error");
    } finally {
      setPasswordSaving(false);
    }
  };

  const disableAccount = async () => {
    const ask = await Swal.fire({
      title: "Disable your Aura-Mosaic account?",
      text: "You will be signed out. Accounts with active orders cannot be disabled.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Disable account",
      confirmButtonColor: "#c94662",
      cancelButtonText: "Keep my account",
      reverseButtons: true,
    });
    if (!ask.isConfirmed) return;
    try {
      await disableMyAccount();
      localStorage.removeItem("token");
      window.dispatchEvent(new Event("aura:auth-expired"));
      await Swal.fire("Account disabled", "Your account has been disabled and you have been signed out.", "success");
      navigate("/", { replace: true });
    } catch (error) {
      Swal.fire("Account not disabled", error?.response?.data?.message || "Please try again.", "error");
    }
  };

  if (loading) {
    return (
      <section className="section account-center-page">
        <div className="container account-loading-grid">
          <div className="aura-skeleton account-skeleton-hero" />
          <div className="aura-skeleton account-skeleton-panel" />
        </div>
      </section>
    );
  }

  const initials = String(user?.name || "A").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return (
    <>
    <section className="section account-center-page">
      <div className="container">
        <div className="account-center-hero">
          <div className="account-avatar-v2">
            {user?.picture ? <img src={user.picture} alt={user.name || "Profile"} /> : <span>{initials}</span>}
          </div>
          <div className="account-center-copy">
            <span className="account-center-kicker">My Aura account</span>
            <h1>Hi, {user?.name || "there"}.</h1>
            <p>{user?.email || ""}{user?.city ? ` • ${user.city}` : ""}</p>
          </div>
          <div className="account-center-stats">
            <div><strong>{orders.length}</strong><span>Orders</span></div>
            <div><strong>{totalItems}</strong><span>Items bought</span></div>
            <div><strong>{wishlist.length}</strong><span>Saved</span></div>
            <div><strong>Tk. {fmt(user?.spent ?? paidSpend)}</strong><span>Paid spend</span></div>
          </div>
        </div>

        {err && <div className="account-error-banner">{err}</div>}

        <div className="account-center-tabs" role="tablist" aria-label="Account sections">
          <button className={activeTab === "profile" ? "active" : ""} onClick={() => setActiveTab("profile")}><FiUser /> Profile</button>
          <button className={activeTab === "orders" ? "active" : ""} onClick={() => setActiveTab("orders")}><FiPackage /> Orders</button>
          <button className={activeTab === "wishlist" ? "active" : ""} onClick={() => setActiveTab("wishlist")}><FiHeart /> Wishlist</button>
          <button className={activeTab === "security" ? "active" : ""} onClick={() => setActiveTab("security")}><FiLock /> Security</button>
        </div>

        {activeTab === "profile" && (
          <div className="account-overview-grid">
            <form className="account-panel account-profile-form" onSubmit={saveProfile}>
              <div className="account-panel-heading">
                <div><span>Profile</span><h2>Delivery & contact details</h2></div>
                <FiMapPin />
              </div>
              <div className="account-form-grid">
                <label><span>Name</span><input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} required /></label>
                <label><span>Phone</span><input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} placeholder="017XXXXXXXX" /></label>
                <label className="account-city-field">
                  <span>City</span>
                  <button type="button" className="account-city-picker-btn" onClick={() => setCityPickerOpen(true)}>
                    <FiMapPin />
                    <span>{profile.city || "Choose your delivery city"}</span>
                    <FiArrowRight />
                  </button>
                  <small>This city will be used automatically across Aura-Mosaic after you save your profile.</small>
                </label>
                <label><span>Postal code</span><input value={profile.postalCode} onChange={(e) => setProfile((p) => ({ ...p, postalCode: e.target.value }))} placeholder="Optional" /></label>
                <label><span>Profile photo URL</span><input value={profile.picture} onChange={(e) => setProfile((p) => ({ ...p, picture: e.target.value }))} placeholder="Optional image URL" /></label>
                <label className="account-form-full"><span>Address line 1</span><input value={profile.addressLine1} onChange={(e) => setProfile((p) => ({ ...p, addressLine1: e.target.value }))} placeholder="House, road, area" /></label>
                <label className="account-form-full"><span>Address line 2</span><input value={profile.addressLine2} onChange={(e) => setProfile((p) => ({ ...p, addressLine2: e.target.value }))} placeholder="Apartment, landmark or extra directions" /></label>
              </div>
              <button className="account-primary-btn" disabled={profileSaving}>{profileSaving ? "Saving…" : "Save profile"}</button>
            </form>

            <div className="account-panel account-activity-panel">
              <div className="account-panel-heading"><div><span>Activity</span><h2>Recent account activity</h2></div><FiCreditCard /></div>
              <div className="account-mini-list">
                {orders.slice(0, 3).map((order) => (
                  <Link to={`/order-confirmation/${order._id}`} key={order._id} className="account-mini-row">
                    <span className={`account-status-icon is-${String(order.status || "pending").toLowerCase()}`}>{statusIcon(String(order.status || "pending").toLowerCase())}</span>
                    <div><strong>Order #{String(order._id).slice(-7)}</strong><small>{new Date(order.createdAt).toLocaleDateString()} • {order.status}</small></div>
                    <span>Tk. {fmt(order.total)}</span>
                  </Link>
                ))}
                {orders.length === 0 && <div className="account-empty-mini">No orders yet. Your first one will appear here.</div>}
              </div>
              <div className="account-transaction-summary">
                <div><span>Transactions</span><strong>{txs.length}</strong></div>
                <div><span>Recorded paid spend</span><strong>Tk. {fmt(user?.spent ?? paidSpend)}</strong></div>
              </div>
              <button className="account-text-btn" onClick={() => setActiveTab("orders")}>View all orders <FiArrowRight /></button>
            </div>
          </div>
        )}

        {activeTab === "orders" && (
          <div className="account-panel account-orders-panel">
            <div className="account-panel-heading"><div><span>Orders</span><h2>Your purchases</h2></div><span className="account-count-pill">{orders.length}</span></div>
            {orders.length === 0 ? (
              <div className="account-empty-state"><FiPackage /><h3>No orders yet</h3><p>Your placed orders and delivery progress will appear here.</p><Link to="/listing/All" className="account-primary-btn">Start shopping</Link></div>
            ) : (
              <div className="account-order-list">
                {orders.map((order) => {
                  const status = String(order.status || "pending").toLowerCase();
                  const canCancel = ["pending", "confirmed", "placed"].includes(status);
                  const currentStep = Math.max(0, statusOrder.indexOf(status));
                  return (
                    <article className="account-order-card" key={order._id}>
                      <div className="account-order-card__top">
                        <div><span>Order #{String(order._id).slice(-8)}</span><strong>{new Date(order.createdAt).toLocaleString()}</strong></div>
                        <span className={`account-status-pill is-${status}`}>{statusIcon(status)} {status}</span>
                      </div>
                      {status !== "cancelled" && (
                        <div className="account-order-progress" aria-label={`Order status ${status}`}>
                          {statusOrder.map((step, index) => <span key={step} className={index <= currentStep ? "done" : ""}><i />{step}</span>)}
                        </div>
                      )}
                      <div className="account-order-items">
                        {(order.items || []).slice(0, 4).map((item) => (
                          <div key={item.productId || item._id || item.name}>
                            {item.image ? <img src={item.image} alt="" /> : <span className="account-order-placeholder">🛍️</span>}
                            <span>{item.name}</span>
                            <small>× {item.qty || 1}</small>
                          </div>
                        ))}
                        {(order.items || []).length > 4 && <span className="account-more-items">+{order.items.length - 4} more</span>}
                      </div>
                      <div className="account-order-card__bottom">
                        <div><small>Total</small><strong>Tk. {fmt(order.total)}</strong></div>
                        <div className="account-order-actions">
                          {canCancel && <button className="account-danger-ghost" onClick={() => cancelOrder(order)}>Cancel order</button>}
                          <Link to={`/order-confirmation/${order._id}`} className="account-primary-btn small">View details <FiArrowRight /></Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "wishlist" && (
          <div className="account-panel account-wishlist-panel">
            <div className="account-panel-heading"><div><span>Wishlist</span><h2>Your saved products</h2></div><Link to="/wishlist">Open full wishlist <FiArrowRight /></Link></div>
            {wishlist.length === 0 ? <div className="account-empty-state"><FiHeart /><h3>No saved items yet</h3><p>Heart a product and it will appear here.</p><Link to="/listing/All" className="account-primary-btn">Explore products</Link></div> : <div className="account-wishlist-grid">{wishlist.slice(0, 8).map((product) => <ProductItem key={product._id || product.id} product={product} />)}</div>}
          </div>
        )}

        {activeTab === "security" && (
          <div className="account-security-grid">
            <form className="account-panel account-security-form" onSubmit={savePassword}>
              <div className="account-panel-heading"><div><span>Security</span><h2>Change password</h2></div><FiLock /></div>
              {user?.provider === "google" ? (
                <div className="account-security-note">This account uses Google sign-in, so password changes are managed through Google.</div>
              ) : (
                <>
                  <label><span>Current password</span><input type="password" value={passwords.currentPassword} onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))} autoComplete="current-password" required /></label>
                  <label><span>New password</span><input type="password" minLength={8} value={passwords.newPassword} onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))} autoComplete="new-password" required /></label>
                  <label><span>Confirm new password</span><input type="password" minLength={8} value={passwords.confirmPassword} onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))} autoComplete="new-password" required /></label>
                  <button className="account-primary-btn" disabled={passwordSaving}>{passwordSaving ? "Updating…" : "Update password"}</button>
                </>
              )}
            </form>

            <div className="account-panel account-danger-zone">
              <div className="account-panel-heading"><div><span>Account</span><h2>Account status</h2></div><FiUser /></div>
              <p>Disabling your account signs you out and blocks future authenticated access. It cannot be disabled while you have an active order.</p>
              <button className="account-danger-btn" onClick={disableAccount}>Disable my account</button>
            </div>
          </div>
        )}
      </div>
    </section>
      <CityPickerModal
        open={cityPickerOpen}
        onClose={() => setCityPickerOpen(false)}
        cities={cityList}
        value={profile.city}
        onSelect={(city) => setProfile((current) => ({ ...current, city }))}
        title="Choose your profile city"
        subtitle="Pick your delivery city. Save your profile to use it everywhere in Aura-Mosaic."
        profileMode
      />
    </>
  );
};

export default History;
