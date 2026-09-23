const jwt = require("jsonwebtoken");
const { User } = require("../models/user");

module.exports = async (req, res, next) => {
  const header = req.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("role isActive").lean();
    if (!user) return res.status(401).json({ message: "Account not found. Please sign in again." });
    if (user.isActive === false) {
      return res.status(403).json({ message: "This account has been disabled. Please contact support." });
    }
    req.user = { id: String(user._id), role: user.role || "customer" };
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Session expired or invalid. Please sign in again." });
  }
};
