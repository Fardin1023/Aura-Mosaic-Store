const { User } = require("../models/user");

module.exports = async (req, res, next) => {
  try {
    const user = await User.findById(req.user?.id).select("role").lean();
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Administrator access required." });
    }
    return next();
  } catch (err) {
    return next(err);
  }
};
