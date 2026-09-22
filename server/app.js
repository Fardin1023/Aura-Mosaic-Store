require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const categoryRoutes = require("./routes/categories");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const transactionRoutes = require("./routes/transactions");
const citiesRoutes = require("./routes/cities");
const recommendationRoutes = require("./routes/recommendations");
const contactRoutes = require("./routes/contact");
const newsletterRoutes = require("./routes/newsletter");
const { securityHeaders, rateLimit } = require("./middleware/security");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

function allowedOrigins() {
  return String(process.env.CLIENT_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const origins = allowedOrigins();
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origins.length === 0 || origins.includes(origin)) return callback(null, true);
      return callback(Object.assign(new Error("Origin is not allowed by CORS."), { status: 403 }));
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(securityHeaders);
app.use(rateLimit({ windowMs: 60_000, max: Number(process.env.RATE_LIMIT_PER_MINUTE || 180) }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "aura-mosaic-api", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/cities", citiesRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/newsletter", newsletterRoutes);

app.use(notFound);
app.use(errorHandler);

async function start() {
  const required = ["CONNECTION_STRING", "JWT_SECRET"];
  if (process.env.NODE_ENV === "production") required.push("CLIENT_ORIGINS");
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variable(s): ${missing.join(", ")}`);
  }

  const port = Number(process.env.PORT || 4000);
  await mongoose.connect(process.env.CONNECTION_STRING);
  const server = app.listen(port, () => {
    console.log(`Aura-Mosaic API listening on port ${port}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
  return server;
}

if (require.main === module) {
  start().catch((err) => {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  });
}

module.exports = { app, start };
