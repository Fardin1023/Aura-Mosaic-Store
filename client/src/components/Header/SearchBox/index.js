import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchProducts } from "../../../api/api";
import { IoSearch } from "react-icons/io5";

const DEBOUNCE_MS = 300;

const SearchBox = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState({ products: [], categories: [], brands: [] });
  const [activeIndex, setActiveIndex] = useState(-1);
  const boxRef = useRef(null);
  const reqIdRef = useRef(0);

  const flat = useMemo(() => {
    const out = [];
    hits.categories.forEach((value) => out.push({ type: "category", value }));
    hits.brands.forEach((value) => out.push({ type: "brand", value }));
    hits.products.forEach((value) => out.push({ type: "product", value }));
    return out;
  }, [hits]);

  useEffect(() => {
    const onDocumentClick = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setHits({ products: [], categories: [], brands: [] });
      setLoading(false);
      return undefined;
    }

    const requestId = ++reqIdRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await searchProducts({ q: query, page: 1, limit: 8 });
        if (requestId !== reqIdRef.current) return;
        const items = Array.isArray(response.data?.items) ? response.data.items : [];
        const categories = [
          ...new Set(items.map((item) => item?.category?.name).filter(Boolean).map((value) => String(value).trim())),
        ].slice(0, 4);
        const brands = [...new Set(items.map((item) => item?.brand).filter(Boolean))].slice(0, 6);
        setHits({ products: items.slice(0, 6), categories, brands });
      } catch {
        if (requestId === reqIdRef.current) setHits({ products: [], categories: [], brands: [] });
      } finally {
        if (requestId === reqIdRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [q]);

  const go = (item) => {
    setOpen(false);
    setActiveIndex(-1);
    if (item.type === "product") {
      const id = item.value?._id || item.value?.id;
      if (id) navigate(`/product/${id}`);
    } else if (item.type === "category") {
      navigate(`/listing/${encodeURIComponent(item.value)}`);
    } else if (item.type === "brand") {
      navigate(`/search?brand=${encodeURIComponent(item.value)}`);
    }
  };

  const submitSearch = () => {
    const query = q.trim();
    if (query) navigate(`/search?q=${encodeURIComponent(query)}`);
    setOpen(false);
  };

  const onSubmit = (event) => {
    event.preventDefault();
    if (activeIndex >= 0 && activeIndex < flat.length) go(flat[activeIndex]);
    else submitSearch();
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(flat.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(-1, index - 1));
    } else if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="searchBox" ref={boxRef}>
      <form onSubmit={onSubmit} className="searchForm">
        <input
          type="text"
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search brand, category or product…"
          aria-label="Search products"
        />
        <button type="submit" className="btnSearch" aria-label="Search">
          {loading ? <span className="spinner" /> : <IoSearch />}
        </button>
      </form>

      {open && q.trim().length >= 2 && (
        <div className="searchDropdown">
          {loading ? (
            <div className="searchLoading"><span className="spinner big" /><span className="ml-2">Searching…</span></div>
          ) : flat.length === 0 ? (
            <div className="searchEmpty" onMouseDown={(event) => { event.preventDefault(); submitSearch(); }}>
              Search all products for “{q.trim()}”
            </div>
          ) : (
            <>
              {hits.categories.length > 0 && (
                <div className="group">
                  <div className="groupTitle">Categories</div>
                  {hits.categories.map((category) => {
                    const index = flat.findIndex((item) => item.type === "category" && item.value === category);
                    return (
                      <div
                        key={`c-${category}`}
                        className={`rowItem${activeIndex === index ? " active" : ""}`}
                        onMouseEnter={() => setActiveIndex(index)}
                        onMouseDown={(event) => { event.preventDefault(); go({ type: "category", value: category }); }}
                      >
                        <span className="badge">Category</span><span className="label">{category}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {hits.brands.length > 0 && (
                <div className="group">
                  <div className="groupTitle">Brands</div>
                  {hits.brands.map((brand) => {
                    const index = flat.findIndex((item) => item.type === "brand" && item.value === brand);
                    return (
                      <div
                        key={`b-${brand}`}
                        className={`rowItem${activeIndex === index ? " active" : ""}`}
                        onMouseEnter={() => setActiveIndex(index)}
                        onMouseDown={(event) => { event.preventDefault(); go({ type: "brand", value: brand }); }}
                      >
                        <span className="badge">Brand</span><span className="label">{brand}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {hits.products.length > 0 && (
                <div className="group">
                  <div className="groupTitle">Products</div>
                  {hits.products.map((product) => {
                    const id = product._id || product.id;
                    const index = flat.findIndex((item) => item.type === "product" && String(item.value?._id || item.value?.id) === String(id));
                    const image = Array.isArray(product.images) ? product.images[0] : product.image;
                    return (
                      <div
                        key={`p-${id}`}
                        className={`rowItem${activeIndex === index ? " active" : ""}`}
                        onMouseEnter={() => setActiveIndex(index)}
                        onMouseDown={(event) => { event.preventDefault(); go({ type: "product", value: product }); }}
                      >
                        {image && <img src={image} alt="" className="thumb" />}
                        <span className="label">{product.name}</span>
                        <span className="price">৳{Number(product.price || 0).toFixed(0)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="searchEmpty" onMouseDown={(event) => { event.preventDefault(); submitSearch(); }}>
                View all results for “{q.trim()}”
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBox;
