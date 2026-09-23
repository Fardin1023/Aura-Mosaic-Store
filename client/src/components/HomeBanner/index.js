import Slider from "react-slick";
import { Link } from "react-router-dom";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { FaArrowRightLong, FaWandMagicSparkles } from "react-icons/fa6";
import banner1 from "../../assets/images/banner1.png";
import banner2 from "../../assets/images/banner2.png";
import banner3 from "../../assets/images/banner3.png";

const NextArrow = ({ onClick }) => (
  <button className="custom-arrow next" onClick={onClick} aria-label="Next slide">
    <FaChevronRight />
  </button>
);

const PrevArrow = ({ onClick }) => (
  <button className="custom-arrow prev" onClick={onClick} aria-label="Previous slide">
    <FaChevronLeft />
  </button>
);

const slides = [
  {
    eyebrow: "✨ Self-care, but make it fun",
    title: "Glow-up finds for every little ritual.",
    copy: "Skincare, pretty picks and everyday treats curated to make shopping feel joyful.",
    image: banner1,
    imageAlt: "Skincare collection",
    primary: { label: "Shop skincare", to: "/listing/Skincare" },
    secondary: { label: "Explore all", to: "/listing/All" },
    accent: "peach",
  },
  {
    eyebrow: "🌈 Colorful. Creative. One-of-a-kind.",
    title: "Handmade treasures with big personality.",
    copy: "Discover cheerful crafts, décor and thoughtful finds that feel anything but ordinary.",
    image: banner2,
    imageAlt: "Colorful handmade craft collection",
    primary: { label: "Shop handcrafts", to: "/listing/Handcraft" },
    secondary: { label: "New arrivals", to: "/listing/New%20Arrivals" },
    accent: "sunny",
  },
  {
    eyebrow: "🎁 Powered by Aura AI",
    title: "Tell us the vibe. We’ll build the gift.",
    copy: "Share who you’re shopping for, the occasion and your budget. Aura AI turns it into a real gift plan from the live store.",
    image: banner3,
    imageAlt: "Handcrafted gift ideas",
    primary: { label: "Create an AI gift", to: "/gifting", icon: true },
    secondary: { label: "Meet Aura AI", to: "/ai-studio" },
    accent: "berry",
  },
];

const HomeBanner = () => {
  const settings = {
    dots: true,
    infinite: true,
    speed: 650,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true,
    autoplay: true,
    autoplaySpeed: 5200,
    pauseOnHover: true,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
  };

  return (
    <section className="container aura-hero-wrap">
      <div className="homeBannerSection aura-hero-shell">
        <Slider {...settings}>
          {slides.map((slide) => (
            <div className="aura-hero-slide-wrap" key={slide.title}>
              <article className={`aura-hero-slide aura-hero-${slide.accent}`}>
                <div className="aura-hero-copy">
                  <span className="aura-hero-eyebrow">{slide.eyebrow}</span>
                  <h1>{slide.title}</h1>
                  <p>{slide.copy}</p>
                  <div className="aura-hero-actions">
                    <Link className="aura-btn aura-btn-primary" to={slide.primary.to}>
                      {slide.primary.icon && <FaWandMagicSparkles />}
                      {slide.primary.label} <FaArrowRightLong />
                    </Link>
                    <Link className="aura-btn aura-btn-ghost" to={slide.secondary.to}>
                      {slide.secondary.label}
                    </Link>
                  </div>
                  <div className="aura-hero-mini-trust">
                    <span>✓ Live stock</span>
                    <span>✓ COD</span>
                    <span>✓ AI-powered picks</span>
                  </div>
                </div>
                <div className="aura-hero-visual">
                  <span className="aura-orbit aura-orbit-one" aria-hidden="true" />
                  <span className="aura-orbit aura-orbit-two" aria-hidden="true" />
                  <img src={slide.image} alt={slide.imageAlt} />
                </div>
              </article>
            </div>
          ))}
        </Slider>
      </div>
    </section>
  );
};

export default HomeBanner;
