import { useState } from "react";
import { sendContactMessage } from "../../api/api";

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm((current) => ({ ...current, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus({ type: "", message: "" });
    try {
      await sendContactMessage(form);
      setStatus({ type: "success", message: "Thanks! Your message has been received." });
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      setStatus({ type: "danger", message: error?.response?.data?.message || "We couldn't send your message. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="section aura-simple-page contact-page">
      <div className="container">
        <div className="aura-page-hero compact">
          <span className="home-section-kicker">💌 Say hello</span>
          <h1>We’re listening.</h1>
          <p>Questions, feedback, partnership ideas or just something you think we should know? Send it our way.</p>
        </div>

        <div className="contact-layout">
          <form onSubmit={onSubmit} className="contact-form-card">
            <div className="contact-form-heading"><span>✨</span><div><h2>Send a message</h2><p>We’ll keep it simple and get back to you as soon as we can.</p></div></div>
            {status.message && <div className={`alert alert-${status.type}`}>{status.message}</div>}
            <div className="contact-grid-two">
              <div className="form-group"><label htmlFor="contact-name">Name</label><input id="contact-name" name="name" value={form.name} onChange={onChange} className="form-control" maxLength={120} required /></div>
              <div className="form-group"><label htmlFor="contact-email">Email</label><input id="contact-email" name="email" type="email" value={form.email} onChange={onChange} className="form-control" maxLength={200} required /></div>
            </div>
            <div className="form-group"><label htmlFor="contact-subject">Subject</label><input id="contact-subject" name="subject" value={form.subject} onChange={onChange} className="form-control" maxLength={160} placeholder="What can we help with?" /></div>
            <div className="form-group"><label htmlFor="contact-message">Message</label><textarea id="contact-message" name="message" rows="6" value={form.message} onChange={onChange} className="form-control" maxLength={4000} required placeholder="Tell us what’s on your mind…" /></div>
            <button className="aura-btn aura-btn-primary contact-submit" type="submit" disabled={submitting}>{submitting ? "Sending…" : "Send message 💌"}</button>
          </form>

          <aside className="contact-side-card">
            <span className="contact-side-emoji">🌷</span>
            <h3>Need a hand?</h3>
            <p>Our support details are here whenever you need them.</p>
            <div className="contact-detail"><small>Email</small><strong>support@auramosaic.com</strong></div>
            <div className="contact-detail"><small>Phone</small><strong>+880-1740734780</strong></div>
            <div className="contact-detail"><small>Hours</small><strong>Sun–Thu, 9:00 am – 12:00 pm</strong></div>
            <div className="contact-note">For order questions, signing in first helps us locate your order faster.</div>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default Contact;
