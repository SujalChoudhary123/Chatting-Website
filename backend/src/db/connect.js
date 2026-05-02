import dns from "dns";
import mongoose from "mongoose";
import { config } from "../config.js";
import { User } from "../models/User.js";

function buildMongoConnectionHelp(error) {
  const message = String(error?.message ?? "");

  if (message.includes("querySrv")) {
    return [
      "MongoDB Atlas DNS lookup failed.",
      "Set MONGODB_DNS_SERVERS=8.8.8.8,1.1.1.1 or use a network that allows SRV lookups.",
    ].join(" ");
  }

  if (message.includes("Could not connect to any servers in your MongoDB Atlas cluster")) {
    return [
      "MongoDB Atlas rejected the connection.",
      "Check Atlas Network Access and allow your current IP or add 0.0.0.0/0 for development,",
      "then confirm the cluster is running and the database user credentials are correct.",
    ].join(" ");
  }

  return message;
}

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
  if (config.mongodbUri.startsWith("mongodb+srv://") && config.mongodbDnsServers.length > 0) {
    // Some local networks fail Atlas SRV lookups with the default resolver.
    dns.setServers(config.mongodbDnsServers);
  }

  try {
    await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 15000,
    });
    await migrateUserIndexes();
  } catch (error) {
    error.message = buildMongoConnectionHelp(error);
    throw error;
  }
}
