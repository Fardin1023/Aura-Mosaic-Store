import { GiPlantSeed } from "react-icons/gi";
import { MdDeliveryDining } from "react-icons/md";
import { RiDiscountPercentFill } from "react-icons/ri";
import { IoIosPricetags } from "react-icons/io";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer>
      <div className="container">
        <div className="topInfo row">
          <div className="col d-flex align-items-center">
            <span><GiPlantSeed /></span>
            <span className="ml-2">Curated products</span>
          </div>
          <div className="col d-flex align-items-center">
            <span><MdDeliveryDining /></span>
            <span className="ml-2">Free delivery on orders ৳500+</span>
          </div>
          <div className="col d-flex align-items-center">
            <span><RiDiscountPercentFill /></span>
            <span className="ml-2">Transparent order totals</span>
          </div>
          <div className="col d-flex align-items-center">
            <span><IoIosPricetags /></span>
            <span className="ml-2">Fresh inventory updates</span>
          </div>
        </div>

        <div className="row mt-5 linksWrap">
          <div className="col">
            <h5>AURA MOSAIC</h5>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/contact">Contact Us</Link></li>
            </ul>
          </div>
          <div className="col">
            <h5>SHOP</h5>
            <ul>
              <li><Link to="/listing/All">All Products</Link></li>
              <li><Link to="/search">Search</Link></li>
              <li><Link to="/wishlist">Wishlist</Link></li>
              <li><Link to="/cart">Cart</Link></li>
            </ul>
          </div>
          <div className="col">
            <h5>DISCOVER</h5>
            <ul>
              <li><Link to="/gifting">Gifting Studio</Link></li>
              <li><Link to="/history">Order History</Link></li>
            </ul>
          </div>
          <div className="col">
            <h5>POPULAR CATEGORIES</h5>
            <ul>
              <li><Link to="/search?q=skincare">Skincare</Link></li>
              <li><Link to="/search?q=plants">Plants</Link></li>
              <li><Link to="/search?q=handcraft">Handcrafts</Link></li>
              <li><Link to="/search?q=home%20decor">Home Décor</Link></li>
            </ul>
          </div>
        </div>

        <div className="copyright mt-3 pb-3 pt-3 d-flex">
          <p className="mb-0">© {new Date().getFullYear()} Aura Mosaic — Where creativity meets craftsmanship.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
