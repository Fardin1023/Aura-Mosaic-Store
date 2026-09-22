const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const header = req.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!token) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, role: decoded.role || "customer" };
    return next();
  } catch (_err) {
    return res.status(401).json({ message: "Session expired or invalid. Please sign in again." });
  }
};
