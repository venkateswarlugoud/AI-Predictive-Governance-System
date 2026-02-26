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

    // GeoJSON field for geospatial queries (Phase-2)
    // Optional - only set in controller when valid coordinates provided.
    // Using Mixed type to avoid Mongoose auto-creating { type: "Point" } without coordinates.
    geoLocation: { type: mongoose.Schema.Types.Mixed },

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

    // Notification metadata (minimal, governance-safe)
    lastNotifiedAt: {
      type: Date,
      default: null,
    },
    apologySent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

complaintSchema.pre("save", function (next) {
  const date = this.createdAt || new Date();
  this.complaintMonth = date.getMonth() + 1;
  this.complaintYear = date.getFullYear();
  
  // Remove geoLocation if it exists but has no valid coordinates (Phase-2)
  // This ensures backward compatibility - complaints without geoLocation are valid
  if (this.isModified('geoLocation') || this.geoLocation) {
    const hasValidCoordinates = 
      this.geoLocation && 
      this.geoLocation.coordinates && 
      Array.isArray(this.geoLocation.coordinates) && 
      this.geoLocation.coordinates.length === 2 &&
      typeof this.geoLocation.coordinates[0] === 'number' &&
      typeof this.geoLocation.coordinates[1] === 'number' &&
      !isNaN(this.geoLocation.coordinates[0]) &&
      !isNaN(this.geoLocation.coordinates[1]);
    
    if (!hasValidCoordinates) {
      // Completely remove the field from the document to prevent MongoDB errors
      delete this.geoLocation;
      this.set('geoLocation', undefined);
    }
  }
  
  next();
});

// 2dsphere index for geospatial queries (Phase-2)
// Sparse index - only indexes documents with valid geoLocation
complaintSchema.index({ geoLocation: "2dsphere" }, { sparse: true });

export default mongoose.model("Complaint", complaintSchema);
