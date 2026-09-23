const About = () => {
  return (
    <section className="section aura-simple-page about-page">
      <div className="container">
        <div className="aura-page-hero">
          <span className="home-section-kicker">🌈 Meet Aura-Mosaic</span>
          <h1>Shopping should feel like finding a little treasure.</h1>
          <p>We bring together self-care, handcrafted pieces, playful finds and smart AI tools so discovering something lovely feels easy, personal and fun.</p>
        </div>

        <div className="about-value-grid">
          <article className="aura-info-card"><span>💖</span><h3>Curated with care</h3><p>We’d rather show you thoughtful products than drown you in endless options.</p></article>
          <article className="aura-info-card"><span>🎨</span><h3>Made for personality</h3><p>Color, creativity and individuality are part of the Aura-Mosaic mood.</p></article>
          <article className="aura-info-card"><span>✨</span><h3>AI that actually helps</h3><p>Aura AI works with real store data to recommend, compare and build gift ideas.</p></article>
        </div>

        <div className="about-story-card">
          <div>
            <span className="home-section-kicker">Our vibe</span>
            <h2>Soft, smart, cheerful shopping.</h2>
          </div>
          <p>Aura-Mosaic is designed for shoppers who enjoy beautiful things but still want practical information: real stock, clear prices, helpful recommendations and a simple checkout. We’re building a marketplace where technology feels warm, not complicated.</p>
        </div>
      </div>
    </section>
  );
};

export default About;
