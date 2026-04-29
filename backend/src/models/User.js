import mongoose from "mongoose";

function optionalNormalizedString(value) {
  if (value === null || value === undefined) {
    return undefined;
  }

  const normalizedValue = String(value).trim();
  return normalizedValue ? normalizedValue : undefined;
}

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      default: undefined,
      set: optionalNormalizedString,
    },
    handle: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      default: undefined,
      set: optionalNormalizedString,
    },
    avatarUrl: {
      type: String,
      trim: true,
      default: undefined,
      set: optionalNormalizedString,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      default: undefined,
      set: optionalNormalizedString,
    },
    passwordHash: {
      type: String,
    },
    otpCodeHash: {
      type: String,
    },
    otpExpiresAt: {
      type: Date,
    },
    otpRequestedAt: {
      type: Date,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model("User", userSchema);
