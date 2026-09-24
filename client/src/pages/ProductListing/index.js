import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import ProductItem from "../../components/ProductItem";
import { searchProducts } from "../../api/api";

import Slider from "@mui/material/Slider";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Pagination from "@mui/material/Pagination";
import { TfiLayoutGrid3Alt } from "react-icons/tfi";
import { BsFillGridFill } from "react-icons/bs";
import { PiDotsNineBold } from "react-icons/pi";
import { IoMdMenu } from "react-icons/io";
import { FaAngleDown } from "react-icons/fa6";

const money = (value) => (Number.isFinite(Number(value)) ? Number(value).toFixed(0) : "0");
const SORT_LABELS = {
  price_asc: "Price: Low → High",
  price_desc: "Price: High → Low",
  rating_desc: "Rating: High → Low",
  newest: "Newest First",
};

const ProductListing = () => {
  const { category = "" } = useParams();
  const location = useLocation();
  const search = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const query = (search.get("q") || "").trim();
  const brandFromUrl = (search.get("brand") || "").trim();
  const routeCategory = decodeURIComponent(category || "").trim();
  const isNewArrivals = routeCategory.toLowerCase() === "new arrivals";
  const isAll = !routeCategory || routeCategory.toLowerCase() === "all";

  const [productView, setProductView] = useState("four");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const [sort, setSort] = useState(isNewArrivals ? "newest" : "price_asc");
  const [brandOptions, setBrandOptions] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState(brandFromUrl ? [brandFromUrl] : []);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [priceRange, setPriceRange] = useState([0, 0]);
  const [minRating, setMinRating] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);

  const [anchorSize, setAnchorSize] = useState(null);
  const [anchorSort, setAnchorSort] = useState(null);

  const baseParams = useMemo(
    () => ({
      q: query || undefined,
      categoryName: isNewArrivals || isAll ? undefined : routeCategory,
    }),
    [query, isNewArrivals, isAll, routeCategory]
  );

  const title = query
    ? `Search results for “${query}”`
    : brandFromUrl && isAll
    ? `Brand: ${brandFromUrl}`
    : isAll
    ? "All Products"
    : routeCategory || "Products";

  const effectiveProductView = items.length <= 1
    ? "one"
    : items.length === 2
    ? "two"
    : productView;

  const runSearch = async (targetPage = 1, overrides = {}) => {
    setLoading(true);
    try {
      const brands = overrides.brands ?? selectedBrands;
      const range = overrides.price ?? priceRange;
      const rating = overrides.rating ?? minRating;
      const stock = overrides.inStock ?? inStockOnly;
      const sortKey = overrides.sort ?? sort;
      const pageSize = overrides.limit ?? limit;

      const params = {
        ...baseParams,
        page: targetPage,
        limit: pageSize,
        sort: sortKey,
      };
      if (brands.length) params.brands = brands.join(",");
      if (initialized || overrides.applyPrice) {
        if (Number.isFinite(Number(range?.[0]))) params.minPrice = Number(range[0]);
        if (Number.isFinite(Number(range?.[1]))) params.maxPrice = Number(range[1]);
      }
      if (rating > 0) params.minRating = rating;
      if (stock) params.inStock = true;

      const response = await searchProducts(params);
      setItems(response.data?.items || []);
      setTotal(Number(response.data?.total || 0));
      setPages(Number(response.data?.pages || 0));
      setPage(Number(response.data?.page || targetPage));
      return response.data;
    } catch (error) {
      console.error("Product search failed:", error);
      setItems([]);
      setTotal(0);
      setPages(0);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const seed = async () => {
      setInitialized(false);
      setSelectedBrands(brandFromUrl ? [brandFromUrl] : []);
      setMinRating(0);
      setInStockOnly(false);
      const initialSort = isNewArrivals ? "newest" : "price_asc";
      setSort(initialSort);
      setPage(1);
      setLoading(true);

      try {
        const response = await searchProducts({
          ...baseParams,
          brands: brandFromUrl || undefined,
          page: 1,
          limit,
          sort: initialSort,
        });
        if (cancelled) return;
        const data = response.data || {};
        const facets = data.facets || {};
        const low = Number(facets.minPrice || 0);
        const high = Number(facets.maxPrice || 0);
        setBrandOptions(Array.isArray(facets.brands) ? facets.brands : []);
        setMinPrice(low);
        setMaxPrice(high);
        setPriceRange([low, high]);
        setItems(data.items || []);
        setTotal(Number(data.total || 0));
        setPages(Number(data.pages || 0));
        setPage(Number(data.page || 1));
        setInitialized(true);
      } catch (error) {
        if (!cancelled) {
          console.error("Product listing load failed:", error);
          setItems([]);
          setTotal(0);
          setPages(0);
          setBrandOptions([]);
          setMinPrice(0);
          setMaxPrice(0);
          setPriceRange([0, 0]);
          setInitialized(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    seed();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseParams, brandFromUrl]);

  useEffect(() => {
    if (!initialized) return;
    runSearch(1, { applyPrice: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrands, minRating, priceRange, inStockOnly, sort, limit]);

  const toggleBrand = (brand) => {
    setSelectedBrands((previous) =>
      previous.includes(brand) ? previous.filter((item) => item !== brand) : [...previous, brand]
    );
  };

  const resetFilters = () => {
    setSelectedBrands(brandFromUrl ? [brandFromUrl] : []);
    setMinRating(0);
    setInStockOnly(false);
    setPriceRange([minPrice, maxPrice]);
    setSort(isNewArrivals ? "newest" : "price_asc");
  };

  return (
    <section className="product_Listing_Page">
      <div className="container">
        <div className="productListing d-flex">
          <div className="sidebar">
            <div className="sticky">
              <div className="filterBox">
                <h6>Quick Filters</h6>
                <p className="text-muted" style={{ marginBottom: 8 }}>
                  Narrow results for <strong>{title}</strong>
                </p>
              </div>

              <div className="filterBox">
                <h6>Filter by Price</h6>
                <div style={{ padding: "6px 6px 4px" }}>
                  <Slider
                    value={priceRange}
                    onChange={(_, value) => setPriceRange(value)}
                    valueLabelDisplay="auto"
                    min={minPrice}
                    max={Math.max(maxPrice, minPrice + 1)}
                    disableSwap
                    disabled={maxPrice <= minPrice}
                  />
                  <div className="d-flex justify-content-between">
                    <small>From: Tk {money(priceRange[0])}</small>
                    <small>To: Tk {money(priceRange[1])}</small>
                  </div>
                </div>
              </div>

              <div className="filterBox">
                <h6>Quality (Rating)</h6>
                {[4, 3, 2, 1].map((rating) => (
                  <FormControlLabel
                    key={rating}
                    control={
                      <Checkbox
                        size="small"
                        checked={minRating === rating}
                        onChange={() => setMinRating((previous) => (previous === rating ? 0 : rating))}
                      />
                    }
                    label={`${rating}★ & up`}
                  />
                ))}
              </div>

              <div className="filterBox">
                <h6>Availability</h6>
                <FormControlLabel
                  control={<Checkbox size="small" checked={inStockOnly} onChange={(event) => setInStockOnly(event.target.checked)} />}
                  label="In Stock only"
                />
              </div>

              <div className="filterBox">
                <h6>Brands</h6>
                <div className="scrol">
                  <ul>
                    {brandOptions.length === 0 && <li className="text-muted">No brand data</li>}
                    {brandOptions.map((brand) => (
                      <li key={brand}>
                        <FormControlLabel
                          control={<Checkbox size="small" checked={selectedBrands.includes(brand)} onChange={() => toggleBrand(brand)} />}
                          label={brand}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <Button variant="outlined" className="btn-sml" onClick={resetFilters}>Reset filters</Button>
            </div>
          </div>

          <div className={`content_right ${items.length <= 2 ? "is-sparse" : ""}`}>
            <h3 className="mt-3 mb-1">{title}</h3>
            <p className="text-muted mb-3">Showing {items.length} of {total} items (Sort: {SORT_LABELS[sort]})</p>

            <div className="showBy mt-3 mb-3 d-flex justify-content-start">
              <div className="d-flex align-items-center btnWrapper">
                <Button className={effectiveProductView === "one" ? "act" : ""} onClick={() => setProductView("one")}><IoMdMenu /></Button>
                <Button className={effectiveProductView === "two" ? "act" : ""} onClick={() => setProductView("two")}><PiDotsNineBold /></Button>
                <Button className={effectiveProductView === "three" ? "act" : ""} onClick={() => setProductView("three")}><BsFillGridFill /></Button>
                <Button className={effectiveProductView === "four" ? "act" : ""} onClick={() => setProductView("four")}><TfiLayoutGrid3Alt /></Button>
              </div>

              <div className="ml-3 showByFilter">
                <Button onClick={(event) => setAnchorSort(event.currentTarget)}>Sort: {SORT_LABELS[sort]} <FaAngleDown className="ml-1" /></Button>
                <Menu anchorEl={anchorSort} open={Boolean(anchorSort)} onClose={() => setAnchorSort(null)}>
                  {Object.entries(SORT_LABELS).map(([key, label]) => (
                    <MenuItem key={key} onClick={() => { setSort(key); setAnchorSort(null); }}>{label}</MenuItem>
                  ))}
                </Menu>
              </div>

              <div className="ml-auto showByFilter">
                <Button onClick={(event) => setAnchorSize(event.currentTarget)}>Show {limit} <FaAngleDown className="ml-1" /></Button>
                <Menu anchorEl={anchorSize} open={Boolean(anchorSize)} onClose={() => setAnchorSize(null)}>
                  {[12, 24, 36].map((size) => (
                    <MenuItem key={size} onClick={() => { setLimit(size); setAnchorSize(null); }}>{size}</MenuItem>
                  ))}
                </Menu>
              </div>
            </div>

            {loading ? (
              <div className={`productListing product-results-grid view-${effectiveProductView}`}>
                {Array.from({ length: effectiveProductView === "one" ? 2 : 6 }).map((_, index) => (
                  <div className="aura-skeleton aura-skeleton-product" key={index} />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p>No products match your search or filters.</p>
            ) : (
              <div className={`productListing product-results-grid view-${effectiveProductView}`}>
                {items.map((product) => <ProductItem key={product._id} product={product} itemView={effectiveProductView} />)}
              </div>
            )}

            {pages > 1 && (
              <div className="d-flex align-items-center justify-content-center mt-5">
                <Pagination count={pages} page={page} color="primary" size="large" onChange={(_, value) => runSearch(value, { applyPrice: true })} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductListing;
