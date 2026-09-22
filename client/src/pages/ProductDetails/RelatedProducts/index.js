import { useEffect, useMemo, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { FaArrowRightLong } from "react-icons/fa6";
import Button from "@mui/material/Button";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation } from "swiper/modules";
import ProductItem from "../../../components/ProductItem";
import { Link } from "react-router-dom";
import { getRelatedProducts, searchProducts } from "../../../api/api";

const RelatedProducts = ({
  title = "Related Products",
  currentProduct,
  category = "",
  categoryId,
  excludeId,
  mode,
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const categoryName = useMemo(() => {
    const fromObject = typeof currentProduct?.category === "object" ? currentProduct?.category?.name : "";
    const fromString = typeof currentProduct?.category === "string" ? currentProduct.category : "";
    return String(fromObject || fromString || category || "").trim();
  }, [currentProduct?.category, category]);

  const categoryObjectId = categoryId || (typeof currentProduct?.category === "object" ? currentProduct.category?._id : undefined);
  const selfId = excludeId || currentProduct?._id || currentProduct?.id;

  useEffect(() => {
    let cancelled = false;

    if (mode === "recent") {
      try {
        const recent = JSON.parse(localStorage.getItem("aura_mosaic_recent") || "[]");
        const filtered = (Array.isArray(recent) ? recent : []).filter(
          (product) => String(product?._id || product?.id) !== String(selfId || "")
        );
        setItems(filtered.slice(0, 12));
      } catch {
        setItems([]);
      }
      setLoading(false);
      return undefined;
    }

    const load = async () => {
      setLoading(true);
      try {
        let products = [];
        if (categoryObjectId && selfId) {
          const response = await getRelatedProducts(categoryObjectId, selfId);
          products = Array.isArray(response.data) ? response.data : [];
        } else if (categoryName) {
          const response = await searchProducts({ categoryName, sort: "rating_desc", page: 1, limit: 12, inStock: true });
          products = Array.isArray(response.data?.items) ? response.data.items : [];
        }
        if (!cancelled) setItems(products.filter((product) => String(product._id || product.id) !== String(selfId || "")).slice(0, 12));
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [categoryObjectId, selfId, categoryName, mode]);

  const viewAllTo = categoryName ? `/listing/${encodeURIComponent(categoryName)}` : "/listing/All";

  if (!loading && items.length === 0 && mode === "recent") return null;

  return (
    <>
      <div className="d-flex align-items-center mt-3">
        <div className="info w-75"><h3 className="mb-0 hd">{title}</h3></div>
        {mode !== "recent" && (
          <Link to={viewAllTo}>
            <Button className="viewAllBtn ml-auto">View All <FaArrowRightLong /></Button>
          </Link>
        )}
      </div>
      <div className="product_row w-100 mt-4">
        {loading ? (
          <p>Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-muted">No related products found.</p>
        ) : (
          <Swiper
            spaceBetween={20}
            slidesPerGroup={1}
            navigation
            modules={[Navigation]}
            className="mySwiper"
            breakpoints={{ 0: { slidesPerView: 1 }, 640: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }}
          >
            {items.map((product) => (
              <SwiperSlide key={product._id || product.id}><ProductItem product={product} /></SwiperSlide>
            ))}
          </Swiper>
        )}
      </div>
    </>
  );
};

export default RelatedProducts;
