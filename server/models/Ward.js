import mongoose from "mongoose";

const wardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    wardNumber: {
      type: Number,
      required: true,
      unique: true
    },

    code: {
      type: String,
      required: true,
      unique: true
    },

    city: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("Ward", wardSchema);