import mongoose from "mongoose";
import dotenv from "dotenv";
import Ward from "../models/Ward.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI missing in .env");
  process.exit(1);
}

async function seedWards() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);

    console.log("🧹 Clearing existing wards...");
    await Ward.deleteMany({});

    const wards = [];

    for (let i = 1; i <= 150; i++) {
      wards.push({
        name: `Ward ${i}`,
        wardNumber: i,
        code: `W-${String(i).padStart(3, "0")}`, // W-001, W-002 ...
        city: "Chittoor"
      });
    }

    await Ward.insertMany(wards);

    console.log("✅ Seeded 150 wards successfully");
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB connection closed");
  }
}

seedWards();