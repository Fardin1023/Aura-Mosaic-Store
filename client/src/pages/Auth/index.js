import { useContext, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { FiArrowRight, FiEye, FiEyeOff, FiGift, FiHeart, FiLock, FiMail, FiStar, FiUser } from "react-icons/fi";
import { MyContext } from "../../App";
import { googleAuth, login, register } from "../../api/api";

const Auth = () => {
  const { setUser, refreshUser } = useContext(MyContext);
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const navigate = useNavigate();
  const googleEnabled = Boolean(process.env.REACT_APP_GOOGLE_CLIENT_ID);

  const handleChange = (event) =>
    setFormData((previous) => ({ ...previous, [event.target.name]: event.target.value }));

  const switchMode = (nextIsLogin) => {
    setIsLogin(nextIsLogin);
    setErrorMsg("");
  };

  const finishAuth = async (data, destination = "/") => {
    if (!data?.token || !data?.user) throw new Error("Authentication response was incomplete.");
    localStorage.setItem("token", data.token);
    setUser(data.user);
    await refreshUser();
    navigate(destination);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      const response = isLogin
        ? await login({ email: formData.email, password: formData.password })
        : await register({ name: formData.name, email: formData.email, password: formData.password });
      await finishAuth(response.data, "/");
    } catch (error) {
      setErrorMsg(error?.response?.data?.message || error?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setErrorMsg("");
    try {
      const credential = credentialResponse?.credential;
      if (!credential) return;
      const response = await googleAuth(credential);
      const { isNewUser, user } = response.data || {};
      await finishAuth(response.data, isNewUser || user?.isProfileComplete === false ? "/welcome" : "/");
    } catch (error) {
      setErrorMsg(error?.response?.data?.message || "Google sign-in failed.");
    }
  };

  const visualBullets = useMemo(
    () => [
      { icon: <FiGift />, text: "Handpicked gifts, playful finds & beauty favorites." },
      { icon: <FiStar />, text: "AI-powered shopping help tailored for kids and ladies." },
      { icon: <FiHeart />, text: "Wishlist, gifting and a smooth checkout in one cozy place." },
    ],
    []
  );

  return (
    <div className="auth-container auth-v2">
      <div className={`auth-slider-page ${isLogin ? "mode-login" : "mode-register"}`}>
        <div className="auth-visual-side">
          <div className="auth-visual-track">
            <section className="auth-visual-slide auth-visual-login">
              <span className="auth-visual-badge"><FiStar /> Sweet shopping, styled smarter</span>
              <h1>Welcome back to Aura-Mosaic.</h1>
              <p>
                Discover cheerful gifts, lovely beauty picks and little treasures with a playful premium feel.
              </p>
              <ul className="auth-visual-list">
                {visualBullets.map((item) => (
                  <li key={item.text}><span>{item.icon}</span>{item.text}</li>
                ))}
              </ul>
              <div className="auth-visual-footer">
                <div className="auth-stat-card"><strong>Smart gifting</strong><small>AI recommendations & real stock</small></div>
                <div className="auth-stat-card"><strong>Curated joy</strong><small>For birthdays, self-care & surprises</small></div>
              </div>
            </section>

            <section className="auth-visual-slide auth-visual-register">
              <span className="auth-visual-badge"><FiStar /> Join the Aura circle</span>
              <h1>Create your happy little shopping space.</h1>
              <p>
                Save favorites, track your orders and let Aura AI help you build beautiful gift ideas in seconds.
              </p>
              <ul className="auth-visual-list">
                <li><span><FiUser /></span>Create your account in a few taps.</li>
                <li><span><FiGift /></span>Build wishlists and gifting bundles instantly.</li>
                <li><span><FiHeart /></span>Shop faster every time you come back.</li>
              </ul>
              <div className="auth-visual-footer auth-visual-footer-single">
                <div className="auth-stat-chip"><FiStar /> Fun, friendly and made to feel personal</div>
              </div>
            </section>
          </div>
        </div>

        <div className="auth-form-side">
          <div className="auth-form-shell-v2">
            <div className="auth-pill-tabs" role="tablist" aria-label="Authentication mode switcher">
              <button type="button" className={isLogin ? "active" : ""} onClick={() => switchMode(true)}>Login</button>
              <button type="button" className={!isLogin ? "active" : ""} onClick={() => switchMode(false)}>Register</button>
              <span className={`auth-pill-indicator ${isLogin ? "left" : "right"}`} aria-hidden="true" />
            </div>

            <div className="auth-forms-viewport">
              <div className="auth-forms-track-v2">
                <form className="auth-form-panel-v2" onSubmit={(e) => { if (isLogin) handleSubmit(e); else e.preventDefault(); }}>
                  <div className="auth-form-head">
                    <h2>Welcome Back</h2>
                    <p>Login to continue your curated shopping journey.</p>
                  </div>

                  {errorMsg && isLogin && <p className="error-text">{errorMsg}</p>}

                  <label className="auth-field-v2">
                    <span className="auth-field-label">Email</span>
                    <div className="auth-input-wrap">
                      <FiMail className="auth-field-icon" />
                      <input type="email" name="email" value={formData.email} required onChange={handleChange} autoComplete="email" placeholder="Enter your email" />
                    </div>
                  </label>

                  <label className="auth-field-v2">
                    <div className="auth-field-topline">
                      <span className="auth-field-label">Password</span>
                      <Link to="/contact" className="auth-forgot-link">Forgot password?</Link>
                    </div>
                    <div className="auth-input-wrap auth-input-password-wrap">
                      <FiLock className="auth-field-icon" />
                      <input
                        type={showLoginPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        required
                        onChange={handleChange}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        className="auth-password-toggle"
                        onClick={() => setShowLoginPassword((prev) => !prev)}
                        aria-label={showLoginPassword ? "Hide password" : "Show password"}
                      >
                        {showLoginPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </label>

                  <button type="submit" className="btn-auth auth-cta-v2" disabled={loading}>
                    <span>{loading && isLogin ? "Signing in..." : "Login"}</span>
                    <FiArrowRight />
                  </button>

                  {googleEnabled && (
                    <>
                      <div className="oauth-divider"><span>or continue with</span></div>
                      <div className="mt-2 d-flex justify-content-center auth-google-wrap">
                        <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setErrorMsg("Google sign-in was cancelled.")} shape="pill" />
                      </div>
                    </>
                  )}

                  <p className="switch-text switch-text-v2">
                    Don’t have an account? <button type="button" onClick={() => switchMode(false)}>Register</button>
                  </p>
                </form>

                <form className="auth-form-panel-v2" onSubmit={(e) => { if (!isLogin) handleSubmit(e); else e.preventDefault(); }}>
                  <div className="auth-form-head">
                    <h2>Create Account</h2>
                    <p>Start saving favorites and build thoughtful gifts faster.</p>
                  </div>

                  {errorMsg && !isLogin && <p className="error-text">{errorMsg}</p>}

                  <label className="auth-field-v2">
                    <span className="auth-field-label">Name</span>
                    <div className="auth-input-wrap">
                      <FiUser className="auth-field-icon" />
                      <input type="text" name="name" value={formData.name} required onChange={handleChange} autoComplete="name" placeholder="Enter your full name" />
                    </div>
                  </label>

                  <label className="auth-field-v2">
                    <span className="auth-field-label">Email</span>
                    <div className="auth-input-wrap">
                      <FiMail className="auth-field-icon" />
                      <input type="email" name="email" value={formData.email} required onChange={handleChange} autoComplete="email" placeholder="Enter your email" />
                    </div>
                  </label>

                  <label className="auth-field-v2">
                    <span className="auth-field-label">Password</span>
                    <div className="auth-input-wrap auth-input-password-wrap">
                      <FiLock className="auth-field-icon" />
                      <input
                        type={showRegisterPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        minLength={8}
                        required
                        onChange={handleChange}
                        autoComplete="new-password"
                        placeholder="Create a password (8+ characters)"
                      />
                      <button
                        type="button"
                        className="auth-password-toggle"
                        onClick={() => setShowRegisterPassword((prev) => !prev)}
                        aria-label={showRegisterPassword ? "Hide password" : "Show password"}
                      >
                        {showRegisterPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </label>

                  <button type="submit" className="btn-auth auth-cta-v2" disabled={loading}>
                    <span>{loading && !isLogin ? "Creating account..." : "Create Account"}</span>
                    <FiArrowRight />
                  </button>

                  {googleEnabled && (
                    <>
                      <div className="oauth-divider"><span>or continue with</span></div>
                      <div className="mt-2 d-flex justify-content-center auth-google-wrap">
                        <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setErrorMsg("Google sign-in was cancelled.")} shape="pill" />
                      </div>
                    </>
                  )}

                  <p className="switch-text switch-text-v2">
                    Already have an account? <button type="button" onClick={() => switchMode(true)}>Login</button>
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
