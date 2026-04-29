import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  {
    fileName: String,
    fileSize: Number,
    mimeType: String,
    url: String,
  },
  { _id: false }
);

const senderProfileSchema = new mongoose.Schema(
  {
    name: String,
    initials: String,
    accentColor: String,
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    roomSlug: {
      type: String,
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    sender: {
      type: String,
      required: true,
    },
    senderProfile: {
      type: senderProfileSchema,
      default: null,
    },
    text: {
      type: String,
      default: "",
    },
    attachment: {
      type: attachmentSchema,
      default: null,
    },
    type: {
      type: String,
      enum: ["chat", "system"],
      default: "chat",
    },
    reactions: {
      type: Map,
      of: [String],
      default: {},
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export const Message = mongoose.model("Message", messageSchema);

