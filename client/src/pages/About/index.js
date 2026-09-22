const About = () => {
  return (
    <section className="section">
      <div className="container">
        <h2 className="hd mb-3">About Aura Mosaic</h2>
        <p className="text-muted">
          We’re a community-first marketplace for skincare, handcrafts, and plants.
          Our mission is to make everyday self-care and sustainable living simple,
          affordable, and delightful.
        </p>

        <div className="row mt-4">
          <div className="col-md-4">
            <div className="card p-3 shadow-sm border-0">
              <h5>Quality First</h5>
              <p className="mb-0">Curated products from trusted brands & makers.</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card p-3 shadow-sm border-0">
              <h5>Local Makers</h5>
              <p className="mb-0">Support artisans and small businesses near you.</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card p-3 shadow-sm border-0">
              <h5>Eco-friendly</h5>
              <p className="mb-0">Packaging and partners we’re proud of.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
