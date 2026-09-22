import { Link } from "react-router-dom";

const NotFound = () => (
  <section className="section">
    <div className="container text-center" style={{ padding: "80px 0" }}>
      <h2>Page not found</h2>
      <p className="text-muted">The page you requested does not exist.</p>
      <Link to="/" className="btn btn-primary">Back to Home</Link>
    </div>
  </section>
);

export default NotFound;
