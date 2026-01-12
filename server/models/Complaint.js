import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },

    category: {
      type: String,
      enum: ["Sanitation", "Roads", "Electricity", "Water"],
      required: true,
      index: true,
    },

    categoryConfidence: Number,

    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      required: true,
      index: true,
    },

    priorityConfidence: Number,

    location: { type: String, required: true },
    ward: { type: String, required: true, index: true },

    // 🔥 EMBEDDING (for repeat detection)
    embedding: {
      type: [Number],
      index: false, // cosine done in app, not DB
    },

    isRepeated: { type: Boolean, default: false },
    similarityScore: Number,

    matchedComplaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
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
