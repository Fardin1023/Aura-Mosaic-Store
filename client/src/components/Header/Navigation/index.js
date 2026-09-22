import Button from "@mui/material/Button";
import { IoMenu } from "react-icons/io5";
import { FaAngleDown, FaAngleRight } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo, useContext } from "react";
import { getCategories } from "../../../api/api";
import { MyContext } from "../../../App";

const Navigation = () => {
  const [isOpenSidebarVal, setisopenSidebarVal] = useState(false);
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const { user, openLoginGate } = useContext(MyContext);

  useEffect(() => {
    (async () => {
      try {
        const res = await getCategories();
        setCategories(res.data || []);
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    })();
  }, []);

  const menuCats = useMemo(() => {
    const extras = ["Gifting", "New Arrivals"];
    const seen = new Set();
    const out = [];
    const add = (n) => {
      const key = (n || "").trim().toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(n);
    };
    extras.forEach(add);
    categories.map((c) => c?.name).forEach(add);
    return out;
  }, [categories]);

  const quickLinks = useMemo(() => {
    const categoryNames = categories.map((item) => item?.name).filter(Boolean).slice(0, 3);
    return [...categoryNames, "Gifting", "New Arrivals"];
  }, [categories]);

  const linkFor = (name) => {
    if (String(name).toLowerCase() === "gifting") return "/gifting";
    return `/listing/${encodeURIComponent(name)}`;
  };

  const protectedClick = async (e, name) => {
    if (String(name).toLowerCase() === "gifting" && !user) {
      e.preventDefault();
      const go = await openLoginGate("Gifting Studio is for members. Sign in to try it!");
      if (go) navigate("/register");
    }
  };

  return (
    <nav>
      <div className="container">
        <div className="row">
          {/* LEFT: All Categories + dropdown */}
          <div className="col-sm-3 navPart1">
            <div className="catWrapper">
              <Button
                className="allCartTab align-items-center"
                onClick={() => setisopenSidebarVal((v) => !v)}
              >
                <IoMenu className="mr-2" />
                <span className="text">ALL CATEGORIES</span>
                <FaAngleDown className="ml-2" />
              </Button>

              <div className={`sidebarNav ${isOpenSidebarVal ? "open" : ""}`}>
                <ul>
                  {menuCats.map((name) => (
                    <li key={name}>
                      <Link
                        to={linkFor(name)}
                        onClick={(e) => protectedClick(e, name)}
                      >
                        <Button>
                          {name} <FaAngleRight className="ml-auto" />
                        </Button>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* RIGHT: quick links */}
          <div className="col-sm-9 navPart2 d-flex align-items-center">
            <ul className="d-flex align-items-center quickLinks mb-0">
              {quickLinks.map(
                (name) => (
                  <li key={name}>
                    <Link
                      to={linkFor(name)}
                      onClick={(e) => protectedClick(e, name)}
                    >
                      <Button className="pillLink">{name}</Button>
                    </Link>
                  </li>
                )
              )}
              <li style={{ width: 16 }} />
              <li>
                <Link to="/about">
                  <Button className="plainLink">About Us</Button>
                </Link>
              </li>
              <li>
                <Link to="/contact">
                  <Button className="plainLink">Contact</Button>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
