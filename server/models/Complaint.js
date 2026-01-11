import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    // AI predicted fields
    category: {
      type: String,
      enum: ["Sanitation", "Roads", "Electricity", "Water"],
      required: true,
      index: true,
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      required: true,
      index: true,
    },

    // Citizen-friendly free text
    location: {
      type: String,
      required: true,
    },

    // Administrative unit (CRITICAL for analytics & prediction)
    ward: {
      type: String,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["New", "In Progress", "Resolved"],
      default: "New",
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    imageUrl: {
      type: String,
    },

    // Normalized time fields (CRITICAL)
    complaintMonth: {
      type: Number, // 1 - 12
      index: true,
    },

    complaintYear: {
      type: Number,
      index: true,
    },
  },
  { timestamps: true }
);

// Automatically derive month & year
complaintSchema.pre("save", function (next) {
  const date = this.createdAt || new Date();
  this.complaintMonth = date.getMonth() + 1;
  this.complaintYear = date.getFullYear();
  next();
});

const Complaint = mongoose.model("Complaint", complaintSchema);
export default Complaint;
