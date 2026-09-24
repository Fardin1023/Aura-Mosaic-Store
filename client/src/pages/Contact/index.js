import { useContext, useState } from "react";
import { FiMail, FiPhone, FiClock, FiMessageCircle } from "react-icons/fi";
import { sendContactMessage } from "../../api/api";
import { MyContext } from "../../App";

const Contact = () => {
  const { storeSettings } = useContext(MyContext);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const supportEmail = storeSettings?.supportEmail || "support@auramosaic.com";
  const supportPhone = storeSettings?.supportPhone || "+880-1740734780";

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
    <section className="section aura-simple-page contact-page contact-page-v2">
      <div className="container">
        <div className="aura-page-hero compact">
          <span className="home-section-kicker">💌 Say hello</span>
          <h1>We’re listening.</h1>
          <p>Questions, feedback, partnership ideas or order help? Send it our way and we’ll keep things simple.</p>
        </div>

        <div className="contact-layout">
          <form onSubmit={onSubmit} className="contact-form-card">
            <div className="contact-form-heading"><span><FiMessageCircle /></span><div><h2>Send a message</h2><p>We’ll get back to you as soon as we can.</p></div></div>
            {status.message && <div className={`alert alert-${status.type}`}>{status.message}</div>}
            <div className="contact-grid-two">
              <div className="form-group"><label htmlFor="contact-name">Name</label><input id="contact-name" name="name" value={form.name} onChange={onChange} className="form-control" maxLength={120} required placeholder="Your name" /></div>
              <div className="form-group"><label htmlFor="contact-email">Email</label><input id="contact-email" name="email" type="email" value={form.email} onChange={onChange} className="form-control" maxLength={200} required placeholder="you@example.com" /></div>
            </div>
            <div className="form-group"><label htmlFor="contact-subject">Subject</label><input id="contact-subject" name="subject" value={form.subject} onChange={onChange} className="form-control" maxLength={160} placeholder="What can we help with?" /></div>
            <div className="form-group"><label htmlFor="contact-message">Message</label><textarea id="contact-message" name="message" rows="6" value={form.message} onChange={onChange} className="form-control" maxLength={4000} required placeholder="Tell us what’s on your mind…" /></div>
            <button className="aura-btn aura-btn-primary contact-submit" type="submit" disabled={submitting}>{submitting ? "Sending…" : "Send message 💌"}</button>
          </form>

          <aside className="contact-side-card contact-side-card-v2">
            <span className="contact-side-emoji">🌷</span>
            <h3>Need a hand?</h3>
            <p>Use the details below for store support. They follow the current admin store settings.</p>
            <a className="contact-detail contact-detail-link" href={`mailto:${supportEmail}`}><span><FiMail /></span><div><small>Email</small><strong>{supportEmail}</strong></div></a>
            <a className="contact-detail contact-detail-link" href={`tel:${supportPhone.replace(/\s+/g, "")}`}><span><FiPhone /></span><div><small>Phone</small><strong>{supportPhone}</strong></div></a>
            <div className="contact-detail"><span><FiClock /></span><div><small>Response window</small><strong>We’ll reply as soon as possible</strong></div></div>
            <div className="contact-note">For order questions, sign in first so your order history is ready when you contact us.</div>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default Contact;
