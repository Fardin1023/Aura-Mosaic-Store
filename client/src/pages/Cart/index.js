import { useContext, useEffect, useMemo, useState } from "react";
import { MyContext } from "../../App";
import { Link, useNavigate } from "react-router-dom";
import { IoClose } from "react-icons/io5";
import Button from "@mui/material/Button";
import { IoMdCart } from "react-icons/io";
import Swal from "sweetalert2";
import { createOrder, getStoreSettings } from "../../api/api";
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
  } = useContext(MyContext);
  const navigate = useNavigate();
  const [storeSettings, setStoreSettings] = useState({ shippingFlatFee: 60, freeShippingThreshold: 500, allowCOD: true });

  useEffect(() => {
    getStoreSettings().then((res) => setStoreSettings((current) => ({ ...current, ...(res.data || {}) }))).catch(() => {});
  }, []);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0),
    [cart]
  );
  const threshold = Number(storeSettings.freeShippingThreshold || 0);
  const flatFee = Number(storeSettings.shippingFlatFee || 0);
  const shipping = subtotal > 0 && subtotal < threshold ? flatFee : 0;
  const estimatedTotal = subtotal + shipping;

  const handleCheckout = async () => {
    if (cart.length === 0) {
      await Swal.fire("Your cart is empty", "Add some products before checking out.", "info");
      return;
    }

    if (!user) {
      const go = await openLoginGate("Please sign in to checkout and place your order.");
      if (go) navigate("/register");
      return;
    }

    if (!storeSettings.allowCOD) {
      await Swal.fire("Checkout unavailable", "Cash on Delivery is temporarily disabled by the store.", "info");
      return;
    }

    if (!selectedCity) {
      await Swal.fire("Select a delivery city", "Choose your city from the location selector before checkout.", "info");
      return;
    }

    const preview = cart
      .slice(0, 6)
      .map(
        (item) => `
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
            <img src="${escapeHtml(item.image || "")}" alt="" style="width:36px;height:36px;object-fit:cover;border-radius:6px;background:#f4f4f4" />
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
          <div style="margin-top:10px;padding:8px 10px;background:#fff8e8;border-radius:8px">Payment: <b>Cash on Delivery</b>. Online payment will be enabled only after a verified payment gateway is connected.</div>
        </div>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Place COD order",
      cancelButtonText: "Keep shopping",
      reverseButtons: true,
    });
    if (!confirmation.isConfirmed) return;

    try {
      const response = await createOrder({
        items: cart.map((item) => ({ productId: item.id, qty: item.qty || 1 })),
        city: selectedCity,
        shippingAddress: {
          name: user.name || "",
          phone: user.phone || "",
          addressLine1: user.addressLine1 || "",
          addressLine2: user.addressLine2 || "",
          city: selectedCity,
          postalCode: user.postalCode || "",
        },
        payment: { method: "COD" },
      });
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
        html: `<div style="text-align:left"><div><b>Order ID</b>: ${escapeHtml(saved._id)}</div><div><b>Total</b>: ৳${Number(saved.total).toFixed(2)}</div><div><b>Payment</b>: Cash on Delivery</div><div style="margin-top:10px;padding:8px 10px;background:#f8fffb;border:1px solid #d7f2e3;border-radius:8px;">Your order is now pending confirmation.</div></div>`,
        icon: "success",
        confirmButtonText: "View confirmation",
      });
      navigate(`/order-confirmation/${saved._id}`, { state: { order } });
    } catch (error) {
      await Swal.fire(
        "Order not placed",
        error?.response?.data?.message || "We couldn't place your order. Your cart has been kept unchanged.",
        "error"
      );
    }
  };

  return (
    <section className="section cartPage">
      <div className="container">
        <h2 className="hd mb-0">Your Cart</h2>
        <p>There are <b>{cart.reduce((sum, item) => sum + Number(item.qty || 1), 0)}</b> item(s) in your cart</p>

        <div className="row">
          <div className="col-md-9 pr-5">
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr><th width="35%">Product</th><th>Price</th><th>Quantity</th><th>Subtotal</th><th>Remove</th></tr>
                </thead>
                <tbody>
                  {cart.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link to={`/product/${item.id}`}>
                          <div className="d-flex align-items-center cartItemimgWrapper">
                            <div className="imgWrapper"><img src={item.image || "https://via.placeholder.com/120?text=Product"} alt={item.name} className="w-100" /></div>
                            <div className="info px-3"><h6>{item.name}</h6></div>
                          </div>
                        </Link>
                      </td>
                      <td>৳{Number(item.price || 0).toFixed(2)}</td>
                      <td>
                        <div className="d-flex align-items-center">
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => setCartQty(item.id, (item.qty || 1) - 1)}>−</button>
                          <span className="mx-2">{item.qty || 1}</span>
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => setCartQty(item.id, (item.qty || 1) + 1)}>+</button>
                        </div>
                      </td>
                      <td>৳{(Number(item.price || 0) * Number(item.qty || 1)).toFixed(2)}</td>
                      <td><button className="remove" onClick={() => removeCartItem(item.id)} aria-label={`Remove ${item.name}`}><IoClose /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="col-md-3">
            <div className="card border p-3 cartDetails">
              <h4>CART TOTALS</h4>
              <div className="d-flex align-items-center mb-3"><span>Subtotal</span><span className="ml-auto text-danger font-weight-bold">৳{subtotal.toFixed(2)}</span></div>
              <div className="d-flex align-items-center mb-3"><span>Shipping</span><span className="ml-auto">{shipping ? `৳${shipping.toFixed(2)}` : "Free"}</span></div>
              <div className="d-flex align-items-center mb-3"><span>Deliver to</span><span className="ml-auto text-right">{selectedCity || "Select city"}</span></div>
              <hr />
              <div className="d-flex align-items-center mb-3"><span>Total</span><span className="ml-auto text-danger font-weight-bold">৳{estimatedTotal.toFixed(2)}</span></div>
              <Button className="btn-blue btn-lg btn-big" onClick={handleCheckout} disabled={cart.length === 0}><IoMdCart /> &nbsp; Checkout</Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Cart;
