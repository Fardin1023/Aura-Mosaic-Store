import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import InnerImageZoom from "react-inner-image-zoom";
import { useRef, useState } from "react";
import "swiper/css";
import "swiper/css/navigation";
import "react-inner-image-zoom/lib/styles.min.css";

const ProductZoom = ({ images }) => {
  const [slideIndex, setSlideIndex] = useState(0);
  const zoomSlider = useRef();
  const zoomSliderBig = useRef();

  // ✅ Ensure we always have at least one image
  const validImages =
    images && images.length > 0
      ? images
      : ["https://via.placeholder.com/400x400?text=No+Image"];

  const goto = (index) => {
    setSlideIndex(index);
    if (zoomSlider.current) zoomSlider.current.slideTo(index);
    if (zoomSliderBig.current) zoomSliderBig.current.slideTo(index);
  };

  return (
    <div className="productZoom position-relative">
      {/* Main Big Zoom Slider */}
      <Swiper
        slidesPerView={1}
        spaceBetween={0}
        navigation={true}
        slidesPerGroup={1}
        modules={[Navigation]}
        className="zoomSliderBig"
        ref={zoomSliderBig}
      >
        {validImages.map((img, idx) => (
          <SwiperSlide key={idx}>
            <div className="item">
              <InnerImageZoom
                zoomType="hover"
                zoomScale={1.2} // slightly stronger zoom
                src={img}
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Small Thumbnail Slider */}
      <Swiper
        slidesPerView={4}
        spaceBetween={10}
        modules={[Navigation]}
        className="zoomSlider mt-3"
        ref={zoomSlider}
      >
        {validImages.map((img, idx) => (
          <SwiperSlide key={idx}>
            <div
              className={`thumb ${slideIndex === idx ? "active" : ""}`}
              onClick={() => goto(idx)}
            >
              <img src={img} alt={`thumb-${idx}`} className="w-100" />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default ProductZoom;
