import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["ACKNOWLEDGEMENT", "STATUS_UPDATE", "SLA_DELAY", "RESOLUTION"],
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ["EMAIL"],
      default: "EMAIL",
    },
    // Optional basic outcome flag; message content is NOT stored.
    success: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Notification", notificationSchema);

