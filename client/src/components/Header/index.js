import logo from "../../assets/images/aura-mosaic-logo.png";
import logoMark from "../../assets/images/aura-mosaic-mark.png";
import { Link, useNavigate } from "react-router-dom";
import CityDropdown from "../CityDropdown";
import { FaRegUser } from "react-icons/fa";
import { FaCartPlus } from "react-icons/fa";
import { FaRegHeart } from "react-icons/fa";
import SearchBox from "./SearchBox";
import Navigation from "./Navigation";
import { useContext, useState } from "react";
import { MyContext } from "../../App";

// MUI menu for the user dropdown
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";

import { logout as apiLogout } from "../../api/api";

const Header = () => {
  const { user, setUser, cart, cartTotals, theme, setTheme, wishlist, openLoginGate, storeSettings } =
    useContext(MyContext);
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();

  const toggleTheme = () => {
    setTheme(theme === "theme-green" ? "theme-pink" : "theme-green");
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + (item.price || 0) * (item.qty || 1),
    0
  );

  const handleUserBtnClick = (e) => setAnchorEl(e.currentTarget);
  const handleCloseMenu = () => setAnchorEl(null);

  const goHistory = () => {
    handleCloseMenu();
    navigate("/history");
  };

  const goAdmin = () => {
    handleCloseMenu();
    navigate("/admin");
  };

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch {
      /* ignore */
    } finally {
      localStorage.removeItem("token");
      setUser(null);
      window.dispatchEvent(new Event("aura:auth-expired"));
      handleCloseMenu();
      navigate("/");
    }
  };

  // 🔐 Intercept wishlist nav if not signed in
  const handleWishlistClick = async (e) => {
    if (!user) {
      e.preventDefault();
      const go = await openLoginGate("Sign in to view & manage your wishlist.");
      if (go) navigate("/register");
    }
  };

  return (
    <>
      <header className="headerWrapper">
        {/* 🔹 Top Strip */}
        <div className="top-strip bg-cyan">
          <div className="container">
            <p className="mb-0 mt-0 text-center">
              ✨ {storeSettings?.announcement || "Little joys, lovely finds & AI-made gifts — curated for every mood."}
            </p>
          </div>
        </div>

        {/* Mobile ecommerce header */}
        <div className="mobileCommerceHeader">
          <div className="container">
            <div className="mobileCommerceHeader__top">
              <Link to="/" className="mobileCommerceHeader__logo" aria-label="Aura-Mosaic Home">
                <img src={logoMark} alt="Aura-Mosaic" />
              </Link>

              <div className="mobileCommerceHeader__location">
                <CityDropdown />
              </div>

              <div className="mobileCommerceHeader__topActions">
                <Link to="/ai-studio" className="mobileCommerceHeader__ai" aria-label="Open Aura AI Studio" title="Aura AI">
                  ✦
                </Link>
                <button
                  type="button"
                  className="mobileCommerceHeader__theme"
                  onClick={toggleTheme}
                  aria-label={theme === "theme-green" ? "Switch to Berry Bloom theme" : "Switch to Mint Pop theme"}
                  title={theme === "theme-green" ? "Berry Bloom" : "Mint Pop"}
                >
                  {theme === "theme-green" ? "🍬" : "🌷"}
                </button>
              </div>
            </div>
            <div className="mobileCommerceHeader__search">
              <SearchBox />
            </div>
          </div>
        </div>

        {/* Desktop header */}
        <div className="header desktopCommerceHeader">
          <div className="container">
            <div className="row align-items-center">
              {/* Logo + Animated Brand Name */}
              <div className="logoWrapper d-flex align-items-center col-sm-2">
                <Link
                  to="/"
                  className="brandLink d-flex align-items-center"
                  aria-label="Aura-Mosaic Home"
                >
                  <img className="brandLogoFull" src={logo} alt="Aura-Mosaic" />
                  <img className="brandLogoMark" src={logoMark} alt="" aria-hidden="true" />
                </Link>
              </div>

              {/* Right side */}
              <div className="col-sm-10">
                <div className="headerBar">
                  <div className="headerPrimary">
                    {/* Location */}
                    <CityDropdown />

                    {/* Search (flexes to fill) */}
                    <SearchBox />

                    <Link
                      to="/ai-studio"
                      className="aiLaunchBtn"
                      title="Open Aura AI Studio"
                      aria-label="Open Aura AI Studio"
                    >
                      <span className="aiLaunchGlow" aria-hidden="true" />
                      <span className="aiLaunchIcon" aria-hidden="true">✦</span>
                      <span className="aiLaunchCopy">Aura AI</span>
                    </Link>
                  </div>

                  {/* Right actions */}
                  <div className="headerActions hStack">
                    {/* User */}
                    {user ? (
                      <>
                        <button
                          className="user-chip"
                          onClick={handleUserBtnClick}
                          aria-controls={open ? "user-menu" : undefined}
                          aria-haspopup="true"
                          aria-expanded={open ? "true" : undefined}
                          title={`Account • Spent Tk. ${Number(user?.spent || 0).toFixed(0)}`}
                        >
                          <FaRegUser className="icon" />
                          <div className="meta">
                            <span className="name">Hi, {user.name}</span>
                          </div>
                        </button>

                        <Menu
                          id="user-menu"
                          anchorEl={anchorEl}
                          open={open}
                          onClose={handleCloseMenu}
                          MenuListProps={{ "aria-labelledby": "user-chip" }}
                        >
                          <MenuItem disabled>
                            Signed in as&nbsp;<strong>{user.email}</strong>
                          </MenuItem>
                          <Divider />
                          <MenuItem onClick={goHistory}>My Account</MenuItem>
                          {user.role === "admin" && (
                            <MenuItem onClick={goAdmin}>Admin Dashboard</MenuItem>
                          )}
                          <MenuItem onClick={handleLogout}>Logout</MenuItem>
                        </Menu>
                      </>
                    ) : (
                      <Link
                        to="/register"
                        className="iconBtn"
                        title="Sign in / Register"
                      >
                        <FaRegUser />
                      </Link>
                    )}

                    {/* Wishlist */}
                    <Link
                      to="/wishlist"
                      className="iconBtn"
                      title="Wishlist"
                      onClick={handleWishlistClick}
                    >
                      <FaRegHeart />
                      <span className="badgeCounter">
                        {wishlist?.length || 0}
                      </span>
                    </Link>

                    {/* Cart (viewing cart is okay; checkout is gated in Cart page) */}
                    <Link
                      to="/cart"
                      className="iconBtn"
                      title={`Cart • Tk.${cartTotal}`}
                    >
                      <FaCartPlus />
                      <span className="badgeCounter">{cartTotals?.count || 0}</span>
                    </Link>

                    {/* Theme toggle */}
                    <button
                      className={`themeToggler ${theme === "theme-green" ? "is-mint" : "is-berry"}`}
                      onClick={toggleTheme}
                      title={theme === "theme-green" ? "Switch to Berry Bloom" : "Switch to Mint Pop"}
                      aria-label={theme === "theme-green" ? "Switch to Berry Bloom theme" : "Switch to Mint Pop theme"}
                      data-tooltip={theme === "theme-green" ? "Berry Bloom" : "Mint Pop"}
                      aria-pressed={theme === "theme-pink"}
                    >
                      <span className="themeTogglerHalo" aria-hidden="true" />
                      <span className="themeTogglerIcon" aria-hidden="true">{theme === "theme-green" ? "🍬" : "🌷"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <Navigation />
    </>
  );
};

export default Header;
