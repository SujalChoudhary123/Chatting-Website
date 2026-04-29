import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { createUserProfile } from "./message.js";

export function signAuthToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
    },
    config.jwtSecret,
    { expiresIn: "7d" }
  );
}

export function signSignupToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      purpose: "signup",
    },
    config.jwtSecret,
    { expiresIn: "15m" }
  );
}

export function verifyAuthToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

export function verifySignupToken(token) {
  const payload = jwt.verify(token, config.jwtSecret);
  if (payload?.purpose !== "signup") {
    throw new Error("Invalid signup token.");
  }

  return payload;
}

export function serializeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    handle: user.handle,
    avatarUrl: user.avatarUrl,
    email: user.email,
    profile: createUserProfile(user.name, user.avatarUrl),
  };
}
