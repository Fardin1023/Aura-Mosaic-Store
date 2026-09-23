import { GiPlantSeed } from "react-icons/gi";
import { MdDeliveryDining } from "react-icons/md";
import { RiDiscountPercentFill } from "react-icons/ri";
import { IoIosPricetags } from "react-icons/io";
import { Link } from "react-router-dom";
import logo from "../../assets/images/logo.png";

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="topInfo footer-perks">
          <div><span><GiPlantSeed /></span><div><strong>Curated joy</strong><small>Thoughtful finds, not endless clutter</small></div></div>
          <div><span><MdDeliveryDining /></span><div><strong>Easy delivery</strong><small>Simple checkout with COD</small></div></div>
          <div><span><RiDiscountPercentFill /></span><div><strong>Clear totals</strong><small>No mystery at checkout</small></div></div>
          <div><span><IoIosPricetags /></span><div><strong>Live catalogue</strong><small>Fresh stock and real prices</small></div></div>
        </div>

        <div className="footer-main">
          <div className="footer-brand">
            <Link to="/" className="footer-logo-link">
              <img src={logo} alt="Aura-Mosaic" />
              <span>Aura-Mosaic</span>
            </Link>
            <p>A cheerful little marketplace for self-care, creative finds, thoughtful gifts and AI-assisted shopping.</p>
            <div className="footer-mood-pills"><span>🌷 Lovely</span><span>🌈 Playful</span><span>✨ Smart</span></div>
          </div>

          <div className="footer-links-grid linksWrap">
            <div>
              <h5>Explore</h5>
              <ul>
                <li><Link to="/">Home</Link></li>
                <li><Link to="/listing/All">All products</Link></li>
                <li><Link to="/listing/New%20Arrivals">New arrivals</Link></li>
                <li><Link to="/wishlist">Wishlist</Link></li>
              </ul>
            </div>
            <div>
              <h5>AI magic</h5>
              <ul>
                <li><Link to="/gifting">AI Gift Studio</Link></li>
                <li><Link to="/ai-studio">Aura AI Studio</Link></li>
                <li><Link to="/history">My orders</Link></li>
                <li><Link to="/cart">My cart</Link></li>
              </ul>
            </div>
            <div>
              <h5>Aura</h5>
              <ul>
                <li><Link to="/about">About us</Link></li>
                <li><Link to="/contact">Contact</Link></li>
                <li><Link to="/listing/Skincare">Skincare</Link></li>
                <li><Link to="/listing/Handcraft">Handcrafts</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="copyright">
          <p>© {new Date().getFullYear()} Aura-Mosaic. Made for colorful carts & thoughtful hearts.</p>
          <span>Theme it your way 🍬 🌷</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
