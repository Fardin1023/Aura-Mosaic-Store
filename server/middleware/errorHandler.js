function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, _next) {
  console.error(`[${req.method} ${req.originalUrl}]`, err);

  if (err?.name === "CastError") {
    return res.status(400).json({ message: "Invalid resource identifier." });
  }
  if (err?.name === "ValidationError") {
    const first = Object.values(err.errors || {})[0];
    return res.status(400).json({ message: first?.message || "The submitted data is invalid." });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ message: "A record with that value already exists." });
  }

  const status = Number(err?.status || 500);
  const message = status >= 500 ? "Something went wrong on the server." : err.message;
  return res.status(status).json({ message });
}

module.exports = { notFound, errorHandler };
