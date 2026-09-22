import Slider from "react-slick";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const NextArrow = ({ onClick }) => (
  <div className="custom-arrow next" onClick={onClick}>
    <FaChevronRight />
  </div>
);

const PrevArrow = ({ onClick }) => (
  <div className="custom-arrow prev" onClick={onClick}>
    <FaChevronLeft />
  </div>
);

const HomeBanner = () => {
  var settings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true,
    autoplay: true,
    autoplaySpeed: 3000,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
  };

  return (
    <div className="container mt-3">
      <div className="homeBannerSection">
        <Slider {...settings}>
          <div className="item">
            <img
              src="https://media.timeout.com/images/105473507/image.jpg"
              alt="skincare"
              className="w-100"
            />
          </div>
          <div className="item">
            <img
              src="https://www.marthastewart.com/thmb/1r0K4i4pVGdqQDqZ_bJ36BIg0YI=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/plants-look-beautiful-when-not-blooming-coleus-lead-getty-0623-c6efce0847fc421fab5f394fe02cda51.jpg"
              alt="plants"
              className="w-100"
            />
          </div>
          <div className="item">
            <img
              src="https://bfti.org.bd/storage/media/596/Picture2.png"
              alt="handicrafts"
              className="w-100"
            />
          </div>
        </Slider>
      </div>
    </div>
  );
};

export default HomeBanner;
