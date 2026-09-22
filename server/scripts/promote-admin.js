require("dotenv").config();

const mongoose = require("mongoose");
const { User } = require("../models/user");

async function main() {
  const connectionString = process.env.CONNECTION_STRING;
  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();

  if (!connectionString) throw new Error("CONNECTION_STRING is required.");
  if (!email) throw new Error("Set ADMIN_EMAIL to the registered account you want to promote.");

  await mongoose.connect(connectionString);
  const user = await User.findOneAndUpdate(
    { email },
    { role: "admin" },
    { new: true, runValidators: true }
  ).select("name email role");

  if (!user) throw new Error(`No registered user found for ${email}.`);
  console.log(`Promoted ${user.email} to admin.`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => {});
  });
