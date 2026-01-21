import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },

    category: {
      type: String,
      enum: ["Sanitation", "Roads", "Electricity", "Water", "Uncertain"],
      required: true,
      index: true,
    },

    categoryConfidence: Number,

    // Governance fields for category
    categorySource: {
      type: String,
      enum: ["AI", "RULE", "HUMAN"],
      default: "RULE",
    },

    categoryDecisionStatus: {
      type: String,
      enum: ["AI_CONFIRMED", "AI_SUGGESTED", "REQUIRES_REVIEW", "FALLBACK_RULE", "INVALID_INPUT", "INVALID_CONFIDENCE"],
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      required: true,
      index: true,
    },

    priorityConfidence: Number,

    // Governance fields for priority
    prioritySource: {
      type: String,
      enum: ["AI", "RULE", "HUMAN"],
      default: "RULE",
    },

    priorityDecisionStatus: {
      type: String,
      enum: ["AI_CONFIRMED", "AI_SUGGESTED", "REQUIRES_REVIEW", "FALLBACK_RULE", "INVALID_INPUT", "INVALID_CONFIDENCE"],
    },

    // AI model version tracking
    aiModelVersion: {
      type: String,
      default: null,
    },

    location: { type: String, required: true },
    ward: { type: String, required: true, index: true },

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

    complaintMonth: Number,
    complaintYear: Number,
  },
  { timestamps: true }
);

complaintSchema.pre("save", function (next) {
  const date = this.createdAt || new Date();
  this.complaintMonth = date.getMonth() + 1;
  this.complaintYear = date.getFullYear();
  next();
});

export default mongoose.model("Complaint", complaintSchema);
