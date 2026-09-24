import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import InnerImageZoom from "react-inner-image-zoom";
import { useRef, useState } from "react";
import "swiper/css";
import "swiper/css/navigation";
import "react-inner-image-zoom/lib/styles.min.css";
import logoMark from "../../assets/images/aura-mosaic-mark.png";

const ProductZoom = ({ images }) => {
  const [slideIndex, setSlideIndex] = useState(0);
  const zoomSlider = useRef(null);
  const zoomSliderBig = useRef(null);

  const validImages =
    Array.isArray(images) && images.length > 0
      ? images.filter(Boolean)
      : [logoMark];

  const goto = (index) => {
    setSlideIndex(index);
    zoomSlider.current?.slideTo(index);
    zoomSliderBig.current?.slideTo(index);
  };

  return (
    <div className="productZoom position-relative">
      <Swiper
        slidesPerView={1}
        spaceBetween={0}
        navigation
        slidesPerGroup={1}
        modules={[Navigation]}
        className="zoomSliderBig"
        onSwiper={(swiper) => { zoomSliderBig.current = swiper; }}
        onSlideChange={(swiper) => setSlideIndex(swiper.activeIndex)}
      >
        {validImages.map((img, idx) => (
          <SwiperSlide key={`${img}-${idx}`}>
            <div className="productZoom__mainItem">
              <InnerImageZoom
                className="aura-inner-zoom"
                zoomType="hover"
                zoomScale={1.35}
                src={img}
                alt={`Product view ${idx + 1}`}
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {validImages.length > 1 && (
        <Swiper
          slidesPerView={Math.min(4, validImages.length)}
          spaceBetween={10}
          modules={[Navigation]}
          className="zoomSlider mt-3"
          onSwiper={(swiper) => { zoomSlider.current = swiper; }}
        >
          {validImages.map((img, idx) => (
            <SwiperSlide key={`thumb-${img}-${idx}`}>
              <button
                type="button"
                className={`thumb ${slideIndex === idx ? "active" : ""}`}
                onClick={() => goto(idx)}
                aria-label={`View product image ${idx + 1}`}
              >
                <img src={img} alt="" />
              </button>
            </SwiperSlide>
          ))}
        </Swiper>
      )}
    </div>
  );
};

export default ProductZoom;
