import { User } from "../models/User.js";

function slugifyHandlePart(value = "") {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 18);
}

async function buildUniqueHandle(baseHandle, excludeUserId = null) {
  const sanitizedBase = slugifyHandlePart(baseHandle) || "user";
  let candidate = sanitizedBase;
  let suffix = 1;

  while (true) {
    const existingUser = await User.findOne({ handle: candidate }).lean();
    if (!existingUser || existingUser._id.toString() === excludeUserId?.toString()) {
      return candidate;
    }

    suffix += 1;
    candidate = `${sanitizedBase}${suffix}`.slice(0, 24);
  }
}

export async function ensureUserHandle(user) {
  if (user.handle) {
    return user.handle;
  }

  user.handle = await buildUniqueHandle(user.name, user._id);
  await user.save();
  return user.handle;
}

export async function searchUsersByHandle({ query, excludeUserId, limit = 8 }) {
  const normalizedQuery = query.trim().toLowerCase().replace(/^@+/, "");
  if (!normalizedQuery) {
    return [];
  }

  const regex = new RegExp(normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const users = await User.find({
    _id: { $ne: excludeUserId },
    $or: [{ handle: regex }, { name: regex }],
    isEmailVerified: true,
  })
    .sort({ handle: 1, name: 1 })
    .limit(limit);

  const hydratedUsers = [];
  for (const user of users) {
    await ensureUserHandle(user);
    hydratedUsers.push(user);
  }

  return hydratedUsers;
}

export async function generateUniqueHandle(baseHandle, excludeUserId = null) {
  return buildUniqueHandle(baseHandle, excludeUserId);
}
