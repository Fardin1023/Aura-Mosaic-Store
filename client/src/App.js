import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import "./App.css";
import "bootstrap-4-react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { IoHome } from "react-icons/io5";

import Home from "./pages/Home";
import Header from "./components/Header";
import ProductDetails from "./pages/ProductDetails";
import Footer from "./components/Footer";
import Cart from "./pages/Cart";
import ChatBot from "./components/ChatBot";
import Auth from "./pages/Auth";
import ProductListing from "./pages/ProductListing";
import OrderConfirmation from "./pages/OrderConfirmation";
import CompleteProfile from "./pages/CompleteProfile";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Wishlist from "./pages/Wishlist";
import History from "./pages/History";
import Gifting from "./pages/Gifting";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import AIStudio from "./pages/AIStudio";
import {
  addWishlistItem,
  getCities,
  getMe,
  getWishlist,
  removeWishlistItem,
  getStoreSettings,
} from "./api/api";

const MyContext = createContext();

const normalizeCartItem = (product, qty = 1) => {
  const id = product?._id || product?.id || product?.productId;
  if (!id) return null;
  return {
    id: String(id),
    name: product?.name || product?.title || "Unnamed Product",
    price: Number(product?.price) || 0,
    image:
      (Array.isArray(product?.images) && product.images[0]) ||
      product?.thumbnail ||
      product?.image ||
      "",
    qty: Math.max(1, Math.min(99, Math.floor(Number(qty) || 1))),
  };
};

function RequireAuth({ children }) {
  const { authLoading, user, openLoginGate } = useContext(MyContext);
  const [asked, setAsked] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    if (!authLoading && !user && !asked) {
      setAsked(true);
      openLoginGate("This page is for signed-in shoppers.").then((ok) => {
        nav(ok ? "/register" : "/", { replace: true });
      });
    }
  }, [asked, authLoading, nav, openLoginGate, user]);

  if (authLoading || !user) return null;
  return children;
}

function RequireAdmin({ children }) {
  const { authLoading, user } = useContext(MyContext);
  const nav = useNavigate();

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      nav("/register", { replace: true });
      return;
    }

    if (user.role !== "admin") {
      Swal.fire({
        icon: "warning",
        title: "Admin access required",
        text: "This area is only available to Aura-Mosaic administrators.",
      }).then(() => nav("/", { replace: true }));
    }
  }, [authLoading, nav, user]);

  if (authLoading || !user || user.role !== "admin") return null;
  return children;
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

function AppContent() {
  const [cityList, setCityList] = useState([]);
  const [selectedCity, setSelectedCity] = useState(() => localStorage.getItem("aura_mosaic_city") || "");
  const [isHeaderFooterShow, setIsHeaderFooterShow] = useState(true);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cart, setCart] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("aura_mosaic_cart"));
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [wishlist, setWishlist] = useState([]);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "theme-green");
  const [storeSettings, setStoreSettings] = useState({
    storeName: "Aura Mosaic",
    currency: "BDT",
    shippingFlatFee: 60,
    freeShippingThreshold: 500,
    lowStockThreshold: 5,
    allowCOD: true,
    supportEmail: "",
    supportPhone: "",
    announcement: "",
  });

  const location = useLocation();
  const navigate = useNavigate();

  const openLoginGate = async (message = "Please sign in to continue.") => {
    const result = await Swal.fire({
      title: "Hey there! 👋",
      html: `
        <div style="display:flex;align-items:center;gap:12px;justify-content:center;margin-bottom:8px;">
          <div style="font-size:28px;">🔐</div>
          <div style="text-align:left">
            <div style="font-weight:700;margin-bottom:2px;">You need an account</div>
            <div style="opacity:.8;">${message}</div>
          </div>
        </div>`,
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "Sign in / Register",
      cancelButtonText: "Not now",
      reverseButtons: true,
      focusConfirm: false,
    });
    return result.isConfirmed;
  };

  const refreshUser = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setWishlist([]);
      setAuthLoading(false);
      return;
    }
    try {
      const [meRes, wishRes] = await Promise.all([getMe(), getWishlist()]);
      setUser(meRes.data?.user || null);
      setWishlist(Array.isArray(wishRes.data) ? wishRes.data : []);
    } catch {
      localStorage.removeItem("token");
      setUser(null);
      setWishlist([]);
      setCart([]);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    getCities()
      .then((res) => setCityList(Array.isArray(res.data) ? res.data : []))
      .catch(() => setCityList([]));
  }, []);

  useEffect(() => {
    getStoreSettings()
      .then((res) => {
        if (res?.data) setStoreSettings((current) => ({ ...current, ...res.data }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshUser();
    const onRefresh = () => refreshUser();
    const onExpired = () => {
      setUser(null);
      setWishlist([]);
      setCart([]);
      setAuthLoading(false);
    };
    window.addEventListener("aura:refresh-me", onRefresh);
    window.addEventListener("aura:auth-expired", onExpired);
    return () => {
      window.removeEventListener("aura:refresh-me", onRefresh);
      window.removeEventListener("aura:auth-expired", onExpired);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    if (selectedCity) localStorage.setItem("aura_mosaic_city", selectedCity);
    else localStorage.removeItem("aura_mosaic_city");
  }, [selectedCity]);

  useEffect(() => {
    if (user?.city) setSelectedCity((current) => current || user.city);
  }, [user?.city]);

  useEffect(() => {
    document.body.classList.remove("theme-green", "theme-pink");
    document.body.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    setIsHeaderFooterShow(!["/register", "/welcome"].includes(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem("aura_mosaic_cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product, qty = 1) => {
    const next = normalizeCartItem(product, qty);
    if (!next) return false;
    setCart((previous) => {
      const existing = previous.find((item) => item.id === next.id);
      if (!existing) return [...previous, next];
      return previous.map((item) =>
        item.id === next.id
          ? { ...item, qty: Math.min(99, (item.qty || 1) + next.qty) }
          : item
      );
    });
    return true;
  };

  const removeCartItem = (id) => setCart((previous) => previous.filter((item) => item.id !== String(id)));
  const setCartQty = (id, qty) => {
    const safeQty = Math.max(1, Math.min(99, Math.floor(Number(qty) || 1)));
    setCart((previous) => previous.map((item) => (item.id === String(id) ? { ...item, qty: safeQty } : item)));
  };
  const clearCart = () => setCart([]);

  const addToWishlist = (product) => {
    if (!user) {
      openLoginGate("Sign in to save products to your wishlist.").then((go) => {
        if (go) navigate("/register");
      });
      return false;
    }
    const item = normalizeCartItem(product, 1);
    if (!item?.id) return false;
    if (wishlist.some((entry) => String(entry._id || entry.id) === item.id)) return false;

    const normalized = { ...product, _id: item.id, name: item.name, price: item.price, images: product?.images || [item.image] };
    setWishlist((previous) => [...previous, normalized]);
    addWishlistItem(item.id).catch(() => refreshUser());
    return true;
  };

  const removeFromWishlist = (id) => {
    if (!user) return;
    const productId = String(id);
    setWishlist((previous) => previous.filter((item) => String(item._id || item.id) !== productId));
    removeWishlistItem(productId).catch(() => refreshUser());
  };

  const isWishlisted = (id) => wishlist.some((item) => String(item._id || item.id) === String(id));

  const cartTotals = useMemo(() => {
    const count = cart.reduce((sum, item) => sum + Number(item.qty || 1), 0);
    const subtotal = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0);
    return { count, subtotal };
  }, [cart]);

  const values = {
    cityList,
    selectedCity,
    setSelectedCity,
    isHeaderFooterShow,
    setisHeaderFooterShow: setIsHeaderFooterShow,
    user,
    setUser,
    authLoading,
    refreshUser,
    cart,
    cartTotals,
    addToCart,
    removeCartItem,
    setCartQty,
    clearCart,
    theme,
    setTheme,
    wishlist,
    addToWishlist,
    removeFromWishlist,
    isWishlisted,
    openLoginGate,
    storeSettings,
  };

  const showHomeFab = location.pathname !== "/";


  return (
    <MyContext.Provider value={values}>
      <ScrollToTop />
      {isHeaderFooterShow && <Header />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/listing/:category" element={<ProductListing />} />
        <Route path="/search" element={<ProductListing />} />
        <Route path="/gifting" element={<RequireAuth><Gifting /></RequireAuth>} />
        <Route path="/ai-studio" element={<RequireAuth><AIStudio /></RequireAuth>} />
        <Route path="/register" element={<Auth />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/wishlist" element={<RequireAuth><Wishlist /></RequireAuth>} />
        <Route path="/history" element={<RequireAuth><History /></RequireAuth>} />
        <Route path="/order-confirmation/:orderId" element={<RequireAuth><OrderConfirmation /></RequireAuth>} />
        <Route path="/welcome" element={<RequireAuth><CompleteProfile /></RequireAuth>} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      {isHeaderFooterShow && <Footer />}
      {isHeaderFooterShow && <ChatBot />}
      {showHomeFab && (
        <button
          key={location.pathname}
          className="home-fab pop-in"
          aria-label="Go to homepage"
          title="Home"
          onClick={() => navigate("/")}
        >
          <IoHome />
        </button>
      )}
    </MyContext.Provider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
export { MyContext };
