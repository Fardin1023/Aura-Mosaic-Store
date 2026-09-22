import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { MyContext } from "../../App";
import { googleAuth, login, register } from "../../api/api";

const Auth = () => {
  const { setUser, refreshUser } = useContext(MyContext);
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();
  const googleEnabled = Boolean(process.env.REACT_APP_GOOGLE_CLIENT_ID);

  const handleChange = (event) => setFormData((previous) => ({ ...previous, [event.target.name]: event.target.value }));

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

  return (
    <div className="auth-container">
      <div className={`auth-box ${isLogin ? "login-mode" : "register-mode"}`}>
        <div className="auth-tabs">
          <button type="button" className={isLogin ? "active" : ""} onClick={() => { setIsLogin(true); setErrorMsg(""); }}>Login</button>
          <button type="button" className={!isLogin ? "active" : ""} onClick={() => { setIsLogin(false); setErrorMsg(""); }}>Register</button>
        </div>

        <form className="form login-form" onSubmit={handleSubmit}>
          <h2>Welcome Back</h2>
          {errorMsg && <p className="error-text">{errorMsg}</p>}
          <div className="inputBox">
            <input type="email" name="email" value={formData.email} required onChange={handleChange} autoComplete="email" />
            <span>Email</span>
          </div>
          <div className="inputBox">
            <input type="password" name="password" value={formData.password} required onChange={handleChange} autoComplete="current-password" />
            <span>Password</span>
          </div>
          <button type="submit" className="btn-auth" disabled={loading}>{loading ? "Signing in..." : "Login"}</button>
          {googleEnabled && (
            <div className="mt-3 d-flex justify-content-center">
              <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setErrorMsg("Google sign-in was cancelled.")} shape="pill" />
            </div>
          )}
          <p className="switch-text">Don’t have an account? <span onClick={() => setIsLogin(false)}>Register</span></p>
        </form>

        <form className="form register-form" onSubmit={handleSubmit}>
          <h2>Create Account</h2>
          {errorMsg && <p className="error-text">{errorMsg}</p>}
          <div className="inputBox">
            <input type="text" name="name" value={formData.name} required onChange={handleChange} autoComplete="name" />
            <span>Name</span>
          </div>
          <div className="inputBox">
            <input type="email" name="email" value={formData.email} required onChange={handleChange} autoComplete="email" />
            <span>Email</span>
          </div>
          <div className="inputBox">
            <input type="password" name="password" value={formData.password} minLength={8} required onChange={handleChange} autoComplete="new-password" />
            <span>Password (8+ characters)</span>
          </div>
          <button type="submit" className="btn-auth" disabled={loading}>{loading ? "Creating account..." : "Register"}</button>
          {googleEnabled && (
            <div className="mt-3 d-flex justify-content-center">
              <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setErrorMsg("Google sign-in was cancelled.")} shape="pill" />
            </div>
          )}
          <p className="switch-text">Already have an account? <span onClick={() => setIsLogin(true)}>Login</span></p>
        </form>
      </div>
    </div>
  );
};

export default Auth;
