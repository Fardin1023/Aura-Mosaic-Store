import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowRight, FiMapPin, FiPhone, FiUser } from "react-icons/fi";
import { MyContext } from "../../App";
import CityPickerModal from "../../components/CityPickerModal";
import { updateMe } from "../../api/api";

const CompleteProfile = () => {
  const { user, setUser, setisHeaderFooterShow, cityList, setSelectedCity } = useContext(MyContext);
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    city: user?.city || "",
    addressLine1: user?.addressLine1 || "",
    addressLine2: user?.addressLine2 || "",
    postalCode: user?.postalCode || "",
    picture: user?.picture || "",
  });
  const [saving, setSaving] = useState(false);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
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
      addressLine1: user.addressLine1 || "",
      addressLine2: user.addressLine2 || "",
      postalCode: user.postalCode || "",
      picture: user.picture || "",
    });
  }, [user]);

  const initials = useMemo(
    () => String(form.name || user?.name || "A").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
    [form.name, user?.name]
  );

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
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2,
        postalCode: form.postalCode,
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
    <>
    <section className="profile-completion-page">
      <div className="profile-completion-shell">
        <div className="profile-completion-art">
          <span className="profile-completion-kicker">Almost there ✨</span>
          <h1>Make Aura-Mosaic feel a little more yours.</h1>
          <p>Add the details we need for smoother delivery and a more personal shopping experience.</p>
          <div className="profile-completion-perks">
            <div><span><FiMapPin /></span><strong>Faster checkout</strong><small>Your delivery city stays ready.</small></div>
            <div><span><FiPhone /></span><strong>Order support</strong><small>Contact details help with delivery questions.</small></div>
            <div><span><FiUser /></span><strong>Personal account</strong><small>Your account becomes easier to recognize.</small></div>
          </div>
        </div>

        <form className="profile-completion-form" onSubmit={submit}>
          <div className="profile-completion-avatar">
            {form.picture ? <img src={form.picture} alt="Profile preview" /> : <span>{initials}</span>}
          </div>
          <div className="profile-completion-heading">
            <span>Welcome to Aura-Mosaic</span>
            <h2>Complete your profile</h2>
            <p>You can change these details later from My Account.</p>
          </div>

          {error && <div className="profile-completion-error">{error}</div>}

          <div className="profile-completion-grid">
            <label><span>Name</span><input name="name" value={form.name} onChange={updateField} required /></label>
            <label><span>Email</span><input name="email" type="email" value={form.email} readOnly /></label>
            <label><span>Phone</span><input name="phone" value={form.phone} onChange={updateField} placeholder="017XXXXXXXX" /></label>
            <label className="profile-completion-city-field">
              <span>City</span>
              <button type="button" className="profile-city-picker-btn" onClick={() => setCityPickerOpen(true)}>
                <FiMapPin />
                <span>{form.city || "Choose your delivery city"}</span>
                <FiArrowRight />
              </button>
              <small>Saved to your profile and reused automatically at checkout.</small>
            </label>
            <label className="profile-completion-full"><span>Address line 1</span><input name="addressLine1" value={form.addressLine1} onChange={updateField} placeholder="House, road, area" /></label>
            <label className="profile-completion-full"><span>Address line 2</span><input name="addressLine2" value={form.addressLine2} onChange={updateField} placeholder="Apartment, landmark or extra directions" /></label>
            <label><span>Postal code</span><input name="postalCode" value={form.postalCode} onChange={updateField} placeholder="Optional" /></label>
            <label><span>Avatar URL</span><input name="picture" value={form.picture} onChange={updateField} placeholder="Optional image URL" /></label>
          </div>

          <button className="profile-completion-submit" type="submit" disabled={saving}>
            {saving ? "Saving…" : <>Save & continue <FiArrowRight /></>}
          </button>
        </form>
      </div>
    </section>
      <CityPickerModal
        open={cityPickerOpen}
        onClose={() => setCityPickerOpen(false)}
        cities={cityList}
        value={form.city}
        onSelect={(city) => setForm((current) => ({ ...current, city }))}
        title="Choose your delivery city"
        subtitle="Select the city you want saved to your Aura-Mosaic profile."
        profileMode
      />
    </>
  );
};

export default CompleteProfile;
