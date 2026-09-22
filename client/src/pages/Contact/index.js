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
      setStatus({
        type: "danger",
        message: error?.response?.data?.message || "We couldn't send your message. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="section">
      <div className="container">
        <h2 className="hd mb-3">Contact Us</h2>
        <p className="text-muted">Questions, feedback, or partnership ideas? We’d love to hear from you.</p>

        <div className="row mt-4">
          <div className="col-md-7">
            <form onSubmit={onSubmit} className="card p-3 shadow-sm border-0">
              {status.message && <div className={`alert alert-${status.type}`}>{status.message}</div>}
              <div className="form-group">
                <label htmlFor="contact-name">Name</label>
                <input id="contact-name" name="name" value={form.name} onChange={onChange} className="form-control" maxLength={120} required />
              </div>
              <div className="form-group">
                <label htmlFor="contact-email">Email</label>
                <input id="contact-email" name="email" type="email" value={form.email} onChange={onChange} className="form-control" maxLength={200} required />
              </div>
              <div className="form-group">
                <label htmlFor="contact-subject">Subject</label>
                <input id="contact-subject" name="subject" value={form.subject} onChange={onChange} className="form-control" maxLength={160} />
              </div>
              <div className="form-group">
                <label htmlFor="contact-message">Message</label>
                <textarea id="contact-message" name="message" rows="5" value={form.message} onChange={onChange} className="form-control" maxLength={4000} required />
              </div>
              <button className="btn btn-green mt-2" type="submit" disabled={submitting}>
                {submitting ? "Sending…" : "Send Message"}
              </button>
            </form>
          </div>

          <div className="col-md-5">
            <div className="card p-3 shadow-sm border-0">
              <h5>Support</h5>
              <p className="mb-2">Email: support@auramosaic.com</p>
              <p className="mb-2">Phone: +880-1740734780</p>
              <p className="mb-0">Hours: Sun–Thu, 9:00 am – 12:00 pm</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
