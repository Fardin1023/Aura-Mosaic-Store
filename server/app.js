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

const {
  securityHeaders,
  rateLimit,
} = require("./middleware/security");

const {
  notFound,
  errorHandler,
} = require("./middleware/errorHandler");

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

/* =========================================================
   CORS CONFIGURATION
========================================================= */

function normalizeOrigin(value) {
  if (!value) {
    return "";
  }

  try {
    /*
     * URL.origin automatically converts:
     *
     * http://localhost:3000/
     *
     * into:
     *
     * http://localhost:3000
     */
    return new URL(String(value).trim()).origin;
  } catch {
    /*
     * Fallback in case an invalid URL gets supplied.
     */
    return String(value)
      .trim()
      .replace(/\/+$/, "");
  }
}

function allowedOrigins() {
  return String(process.env.CLIENT_ORIGINS || "")
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);
}

const origins = allowedOrigins();

app.use(
  cors({
    origin(origin, callback) {
      /*
       * Some requests, such as Postman or server-to-server
       * requests, may not include an Origin header.
       */
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = normalizeOrigin(origin);

      /*
       * Allow explicitly configured frontend origins.
       */
      if (origins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      /*
       * During local development, allow localhost and
       * 127.0.0.1 on any port.
       *
       * This does NOT apply in production.
       */
      const isLocalDevelopment =
        process.env.NODE_ENV !== "production" &&
        (
          /^http:\/\/localhost:\d+$/.test(normalizedOrigin) ||
          /^http:\/\/127\.0\.0\.1:\d+$/.test(normalizedOrigin)
        );

      if (isLocalDevelopment) {
        return callback(null, true);
      }

      /*
       * Debug output.
       */
      console.error("CORS rejected origin:", origin);
      console.error("Normalized origin:", normalizedOrigin);
      console.error("Allowed origins:", origins);

      return callback(
        Object.assign(
          new Error(
            `Origin ${origin} is not allowed by CORS.`
          ),
          {
            status: 403,
          }
        )
      );
    },

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],

    credentials: true,
  })
);

/* =========================================================
   SECURITY
========================================================= */

app.use(securityHeaders);

app.use(
  rateLimit({
    windowMs: 60_000,
    max: Number(
      process.env.RATE_LIMIT_PER_MINUTE || 180
    ),
  })
);

/* =========================================================
   BODY PARSING
========================================================= */

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: false,
    limit: "1mb",
  })
);

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,

    service: "aura-mosaic-api",

    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
  });
});

/* =========================================================
   API ROUTES
========================================================= */

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/users",
  userRoutes
);

app.use(
  "/api/categories",
  categoryRoutes
);

app.use(
  "/api/products",
  productRoutes
);

app.use(
  "/api/orders",
  orderRoutes
);

app.use(
  "/api/transactions",
  transactionRoutes
);

app.use(
  "/api/cities",
  citiesRoutes
);

app.use(
  "/api/recommendations",
  recommendationRoutes
);

app.use(
  "/api/contact",
  contactRoutes
);

app.use(
  "/api/newsletter",
  newsletterRoutes
);

/* =========================================================
   404 HANDLER
========================================================= */

app.use(notFound);

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use(errorHandler);

/* =========================================================
   START SERVER
========================================================= */

async function start() {
  const requiredVariables = [
    "CONNECTION_STRING",
    "JWT_SECRET",
  ];

  /*
   * Production must explicitly specify which
   * frontend URLs may call the API.
   */
  if (
    process.env.NODE_ENV === "production"
  ) {
    requiredVariables.push(
      "CLIENT_ORIGINS"
    );
  }

  const missingVariables =
    requiredVariables.filter(
      (key) => !process.env[key]
    );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missingVariables.join(
        ", "
      )}`
    );
  }

  const port = Number(
    process.env.PORT || 4000
  );

  /*
   * Connect to MongoDB before accepting requests.
   */
  await mongoose.connect(
    process.env.CONNECTION_STRING
  );

  console.log(
    "MongoDB connected successfully."
  );

  const server = app.listen(
    port,
    () => {
      console.log(
        `Aura-Mosaic API listening on port ${port}`
      );

      console.log(
        "Allowed CORS origins:",
        origins
      );
    }
  );

  /* =======================================================
     GRACEFUL SHUTDOWN
  ======================================================= */

  const shutdown = async (
    signal
  ) => {
    console.log(
      `${signal} received. Shutting down...`
    );

    server.close(async () => {
      try {
        await mongoose.connection.close();

        console.log(
          "MongoDB connection closed."
        );

        process.exit(0);
      } catch (error) {
        console.error(
          "Shutdown error:",
          error
        );

        process.exit(1);
      }
    });
  };

  process.on(
    "SIGTERM",
    () => shutdown("SIGTERM")
  );

  process.on(
    "SIGINT",
    () => shutdown("SIGINT")
  );

  return server;
}

/* =========================================================
   RUN APPLICATION
========================================================= */

if (
  require.main === module
) {
  start().catch((error) => {
    console.error(
      "Failed to start server:"
    );

    console.error(
      error
    );

    process.exit(1);
  });
}

module.exports = {
  app,
  start,
};