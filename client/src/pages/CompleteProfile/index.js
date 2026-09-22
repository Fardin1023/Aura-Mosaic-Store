import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MyContext } from "../../App";
import { updateMe } from "../../api/api";

const CompleteProfile = () => {
  const { user, setUser, setisHeaderFooterShow, cityList, setSelectedCity } = useContext(MyContext);
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    city: user?.city || "",
    picture: user?.picture || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    setisHeaderFooterShow?.(false);
    return () => setisHeaderFooterShow?.(true);
  }, [setisHeaderFooterShow]);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      city: user.city || "",
      picture: user.picture || "",
    });
  }, [user]);

  const updateField = (event) => setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await updateMe({
        name: form.name,
        phone: form.phone,
        city: form.city,
        picture: form.picture,
        isProfileComplete: true,
      });
      if (response.data?.user) setUser(response.data.user);
      if (form.city) setSelectedCity?.(form.city);
      navigate("/");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="card p-4 shadow border-0">
          <h3 className="mb-3">Welcome! Let’s complete your profile</h3>
          <p className="text-muted mb-4">We’ll use this information to personalize your shopping experience.</p>
          {error && <div className="alert alert-danger">{error}</div>}
          <form onSubmit={submit}>
            <div className="form-row">
              <div className="form-group col-md-6">
                <label>Name</label>
                <input name="name" className="form-control" value={form.name} onChange={updateField} required />
              </div>
              <div className="form-group col-md-6">
                <label>Email</label>
                <input name="email" type="email" className="form-control" value={form.email} readOnly />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group col-md-6">
                <label>Phone</label>
                <input name="phone" className="form-control" value={form.phone} onChange={updateField} placeholder="e.g. 017XXXXXXXX" />
              </div>
              <div className="form-group col-md-6">
                <label>City</label>
                <select name="city" className="form-control" value={form.city} onChange={updateField}>
                  <option value="">Select a city</option>
                  {(cityList || []).map((item) => (
                    <option key={item.name} value={item.name}>{item.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Avatar URL (optional)</label>
              <input name="picture" className="form-control" value={form.picture} onChange={updateField} placeholder="https://…" />
            </div>
            <button className="btn btn-primary btn-lg" type="submit" disabled={saving}>{saving ? "Saving…" : "Save & Continue"}</button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default CompleteProfile;
