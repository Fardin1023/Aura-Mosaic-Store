import { Link } from "react-router-dom";

const NotFound = () => (
  <section className="section aura-not-found">
    <div className="container text-center">
      <div className="not-found-card">
        <div className="not-found-emoji">🫧</div>
        <span className="home-section-kicker">Oops, tiny detour</span>
        <h1>That page wandered off.</h1>
        <p>Nothing scary — let’s get you back to the colorful part of Aura-Mosaic.</p>
        <Link to="/" className="aura-btn aura-btn-primary">Back to home ✨</Link>
      </div>
    </div>
  </section>
);

export default NotFound;
