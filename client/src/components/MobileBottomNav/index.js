import { NavLink } from "react-router-dom";
import { useContext } from "react";
import { IoHomeOutline, IoGridOutline, IoHeartOutline, IoBagHandleOutline, IoPersonOutline } from "react-icons/io5";
import { MyContext } from "../../App";

const MobileBottomNav = () => {
  const { user, cartTotals, wishlist } = useContext(MyContext);

  const navClass = ({ isActive }) => `mobileBottomNav__item${isActive ? " is-active" : ""}`;

  return (
    <nav className="mobileBottomNav" aria-label="Mobile shopping navigation">
      <NavLink to="/" end className={navClass}>
        <span className="mobileBottomNav__icon"><IoHomeOutline /></span>
        <span>Home</span>
      </NavLink>
      <NavLink to="/listing/All" className={navClass}>
        <span className="mobileBottomNav__icon"><IoGridOutline /></span>
        <span>Shop</span>
      </NavLink>
      <NavLink to="/wishlist" className={navClass}>
        <span className="mobileBottomNav__icon">
          <IoHeartOutline />
          {!!wishlist?.length && <b>{wishlist.length > 99 ? "99+" : wishlist.length}</b>}
        </span>
        <span>Wishlist</span>
      </NavLink>
      <NavLink to="/cart" className={navClass}>
        <span className="mobileBottomNav__icon">
          <IoBagHandleOutline />
          {!!cartTotals?.count && <b>{cartTotals.count > 99 ? "99+" : cartTotals.count}</b>}
        </span>
        <span>Cart</span>
      </NavLink>
      <NavLink to={user ? "/history" : "/register"} className={navClass}>
        <span className="mobileBottomNav__icon"><IoPersonOutline /></span>
        <span>{user ? "Account" : "Sign in"}</span>
      </NavLink>
    </nav>
  );
};

export default MobileBottomNav;
