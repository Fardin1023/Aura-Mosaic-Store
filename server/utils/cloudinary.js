const crypto = require("crypto");

const PRODUCT_IMAGE_FOLDER = "aura-mosaic/products";

function cloudinaryConfig() {
  return {
    cloudName: String(process.env.CLOUDINARY_CLOUD_NAME || "").trim(),
    apiKey: String(process.env.CLOUDINARY_API_KEY || "").trim(),
    apiSecret: String(process.env.CLOUDINARY_API_SECRET || "").trim(),
  };
}

function requireCloudinaryConfig() {
  const config = cloudinaryConfig();
  const missing = [];
  if (!config.cloudName) missing.push("CLOUDINARY_CLOUD_NAME");
  if (!config.apiKey) missing.push("CLOUDINARY_API_KEY");
  if (!config.apiSecret) missing.push("CLOUDINARY_API_SECRET");

  if (missing.length) {
    const error = new Error(
      `Image uploads are not configured. Missing: ${missing.join(", ")}.`
    );
    error.status = 503;
    throw error;
  }

  return config;
}

function signCloudinaryParams(params, apiSecret) {
  const serialized = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto
    .createHash("sha1")
    .update(`${serialized}${apiSecret}`)
    .digest("hex");
}

function createProductImageUploadSignature() {
  const { cloudName, apiKey, apiSecret } = requireCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const params = {
    folder: PRODUCT_IMAGE_FOLDER,
    timestamp,
  };

  return {
    cloudName,
    apiKey,
    timestamp,
    folder: PRODUCT_IMAGE_FOLDER,
    signature: signCloudinaryParams(params, apiSecret),
    maxFiles: 6,
    maxFileSizeBytes: 8 * 1024 * 1024,
    acceptedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"],
  };
}

function publicIdFromProductImageUrl(value) {
  const { cloudName } = cloudinaryConfig();
  if (!cloudName) return null;

  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com") return null;

    const segments = url.pathname
      .split("/")
      .filter(Boolean)
      .map((part) => decodeURIComponent(part));

    if (segments[0] !== cloudName || segments[1] !== "image" || segments[2] !== "upload") {
      return null;
    }

    let assetSegments = segments.slice(3);
    const versionIndex = assetSegments.findIndex((segment) => /^v\d+$/.test(segment));
    if (versionIndex >= 0) assetSegments = assetSegments.slice(versionIndex + 1);

    if (!assetSegments.length) return null;

    const lastIndex = assetSegments.length - 1;
    assetSegments[lastIndex] = assetSegments[lastIndex].replace(/\.[a-z0-9]+$/i, "");
    const publicId = assetSegments.join("/");

    if (!publicId.startsWith(`${PRODUCT_IMAGE_FOLDER}/`)) return null;
    return publicId;
  } catch (_error) {
    return null;
  }
}

async function destroyProductImageByUrl(url) {
  const publicId = publicIdFromProductImageUrl(url);
  if (!publicId) return { skipped: true };

  const { cloudName, apiKey, apiSecret } = requireCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signCloudinaryParams({ public_id: publicId, timestamp }, apiSecret);

  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: apiKey,
    signature,
  });

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/destroy`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.message || "Could not delete the Cloudinary image.");
    error.status = 502;
    throw error;
  }

  return data;
}

module.exports = {
  PRODUCT_IMAGE_FOLDER,
  createProductImageUploadSignature,
  destroyProductImageByUrl,
  publicIdFromProductImageUrl,
};
