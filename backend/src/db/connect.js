import mongoose from "mongoose";
import { config } from "../config.js";
import { User } from "../models/User.js";

async function migrateUserIndexes() {
  // Old email-based auth left some documents with `email: null`, which breaks a unique index.
  await User.collection.updateMany(
    { email: null },
    { $unset: { email: "" } }
  );

  await User.collection.updateMany(
    { handle: null },
    { $unset: { handle: "" } }
  );

  await User.collection.updateMany(
    { phone: null },
    { $unset: { phone: "" } }
  );

  await User.collection.updateMany(
    { email: { $exists: true, $ne: null }, isEmailVerified: { $exists: false } },
    { $set: { isEmailVerified: true } }
  );

  await User.syncIndexes();
}

export async function connectToDatabase() {
  await mongoose.connect(config.mongodbUri);
  await migrateUserIndexes();
}
