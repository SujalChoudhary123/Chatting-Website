import mongoose from "mongoose";

const connectionRequestSchema = new mongoose.Schema(
  {
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    roomSlug: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const ConnectionRequest = mongoose.model("ConnectionRequest", connectionRequestSchema);
