import cors from "cors";
import express from "express";
import fs from "fs";
import { createServer } from "http";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import { connectToDatabase } from "./db/connect.js";
import { requireAuth } from "./middleware/auth.js";
import { ConnectionRequest } from "./models/ConnectionRequest.js";
import { User } from "./models/User.js";
import { createPersistedMessage, getRoomMessages, toggleReaction } from "./services/messageService.js";
import { getOtpMode, sendOtp, verifyOtpCode } from "./services/otpService.js";
import { getSerializedConnectionRequests } from "./services/connectionRequestService.js";
import { createPresenceStore } from "./services/presenceStore.js";
import {
  createOrGetDirectConversation,
  getDirectConversationContactIds,
  getDirectConversationByParticipants,
  ensureDefaultRooms,
  getRoomBySlug,
  getSerializedRooms,
} from "./services/roomService.js";
import { ensureUserHandle, generateUniqueHandle, searchUsersByHandle } from "./services/userService.js";
import { signAuthToken, signSignupToken, serializeUser, verifyAuthToken, verifySignupToken } from "./utils/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const presenceStore = createPresenceStore();
const app = express();
const httpServer = createServer(app);
const allowedOrigins = new Set([
  ...config.clientUrls,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://localhost:5173",
  "https://127.0.0.1:5173",
]);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  methods: ["GET", "POST", "OPTIONS"],
};

const io = new Server(httpServer, {
  cors: corsOptions,
});

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadsDir),
  filename: (_req, file, callback) => {
    const safeName = file.originalname.replace(/\s+/g, "-");
    callback(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSizeMb * 1024 * 1024,
  },
});

app.set("trust proxy", 1);
app.use(cors(corsOptions));
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[a-z0-9._%+-]+@gmail\.com$/i.test(email);
}

async function emitRoomsUpdate(userIds = []) {
  const onlineUserIds = presenceStore.getOnlineUserIds();
  const uniqueUserIds = Array.from(new Set(userIds.map((id) => id?.toString()).filter(Boolean)));
  await Promise.all(
    uniqueUserIds.map(async (userId) => {
      io.to(`user:${userId}`).emit("rooms:update", {
        rooms: await getSerializedRooms(userId, onlineUserIds),
      });
    })
  );
}

async function emitConnectionRequestsUpdate(userIds = []) {
  const uniqueUserIds = Array.from(new Set(userIds.map((id) => id?.toString()).filter(Boolean)));
  await Promise.all(
    uniqueUserIds.map(async (userId) => {
      io.to(`user:${userId}`).emit(
        "connection-requests:update",
        await getSerializedConnectionRequests(userId)
      );
    })
  );
}

function emitRoomPresence(roomSlug) {
  io.to(roomSlug).emit("room:presence", {
    roomId: roomSlug,
    members: presenceStore.getRoomMembers(roomSlug),
  });
}

function serializeSearchedUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    handle: user.handle,
    profile: serializeUser(user).profile,
  };
}

async function resolveCallTargetUserId({ roomId, callerUserId, requestedTargetUserId = null }) {
  const room = await getRoomBySlug(roomId, callerUserId);
  if (!room) {
    return { room: null, targetUserId: null };
  }

  const otherParticipant =
    room.participants.find((participant) => participant._id.toString() !== callerUserId.toString()) ??
    null;

  if (!otherParticipant) {
    return { room, targetUserId: null };
  }

  const derivedTargetUserId = otherParticipant._id.toString();

  if (requestedTargetUserId && requestedTargetUserId.toString() !== derivedTargetUserId) {
    return { room, targetUserId: null };
  }

  return { room, targetUserId: derivedTargetUserId };
}

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication required."));
    }

    const payload = verifyAuthToken(token);
    const user = await User.findById(payload.sub);

    if (!user) {
      return next(new Error("Invalid authentication token."));
    }

    await ensureUserHandle(user);
    socket.data.user = serializeUser(user);
    return next();
  } catch {
    return next(new Error("Invalid authentication token."));
  }
});

app.get("/api/health", async (_req, res) => {
  res.json({
    status: "ok",
    conversations: await mongoose.connection.db.collection("rooms").countDocuments({ type: "direct" }),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/auth/request-otp", async (req, res) => {
  const name = req.body?.name?.trim();
  const email = normalizeEmail(req.body?.email ?? "");

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Enter a valid Gmail address." });
  }

  let user = await User.findOne({ email });

  if (!name) {
    return res.status(400).json({ error: "Name is required to create an account." });
  }

  if (!user) {
    user = await User.create({
      name,
      email,
      isEmailVerified: false,
    });
  } else if (user.isEmailVerified) {
    return res.status(409).json({ error: "An account with that email already exists." });
  } else {
    user.name = name;
  }

  await ensureUserHandle(user);

  const otpResult = await sendOtp({ email, user });

  return res.json({
    message: otpResult.message,
    devOtp: otpResult.devOtp,
    delivery: getOtpMode(),
  });
});

app.post("/api/auth/verify-otp", async (req, res) => {
  const email = normalizeEmail(req.body?.email ?? "");
  const otp = String(req.body?.otp ?? "").trim();

  if (!isValidEmail(email) || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ error: "Enter a valid Gmail address and 6-digit verification code." });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ error: "Request a new verification code and try again." });
  }

  let isValidOtp = false;

  try {
    isValidOtp = await verifyOtpCode({ otp, user });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  if (!isValidOtp) {
    return res.status(401).json({ error: "Incorrect verification code." });
  }

  user.isEmailVerified = true;
  user.otpCodeHash = undefined;
  user.otpExpiresAt = undefined;
  await ensureUserHandle(user);
  await user.save();

  return res.json({
    signupToken: signSignupToken(user),
  });
});

app.post("/api/auth/register", async (req, res) => {
  const signupToken = String(req.body?.signupToken ?? "").trim();
  const requestedHandle = String(req.body?.handle ?? "").trim().toLowerCase().replace(/^@+/, "");
  const password = String(req.body?.password ?? "");

  if (!signupToken) {
    return res.status(400).json({ error: "Verification expired. Start again." });
  }

  if (!requestedHandle) {
    return res.status(400).json({ error: "Username is required." });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  let payload;
  try {
    payload = verifySignupToken(signupToken);
  } catch {
    return res.status(401).json({ error: "Verification expired. Start again." });
  }

  const user = await User.findById(payload.sub);
  if (!user || user.email !== payload.email) {
    return res.status(401).json({ error: "Verification expired. Start again." });
  }

  if (user.isEmailVerified && user.passwordHash) {
    return res.status(409).json({ error: "This account is already registered. Please log in." });
  }

  const sanitizedHandle = requestedHandle.replace(/[^a-z0-9]/g, "").slice(0, 24);
  if (!sanitizedHandle) {
    return res.status(400).json({ error: "Username must include letters or numbers." });
  }

  user.handle = await generateUniqueHandle(sanitizedHandle, user._id);
  user.passwordHash = await bcrypt.hash(password, 10);
  user.isEmailVerified = true;
  user.otpCodeHash = undefined;
  user.otpExpiresAt = undefined;
  await user.save();

  return res.json({
    token: signAuthToken(user),
    user: serializeUser(user),
  });
});

app.post("/api/auth/login", async (req, res) => {
  const requestedHandle = String(req.body?.handle ?? "").trim().toLowerCase().replace(/^@+/, "");
  const password = String(req.body?.password ?? "");

  if (!requestedHandle || !password) {
    return res.status(400).json({ error: "Enter your username and password." });
  }

  const user = await User.findOne({
    handle: requestedHandle,
    isEmailVerified: true,
  });

  if (!user?.passwordHash) {
    return res.status(401).json({ error: "Invalid username or password." });
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    return res.status(401).json({ error: "Invalid username or password." });
  }

  await ensureUserHandle(user);

  return res.json({
    token: signAuthToken(user),
    user: serializeUser(user),
  });
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  await ensureUserHandle(req.user);
  res.json({
    user: serializeUser(req.user),
  });
});

app.post("/api/auth/profile", requireAuth, async (req, res) => {
  const nextName = String(req.body?.name ?? "").trim();
  const requestedHandle = String(req.body?.handle ?? "").trim().toLowerCase().replace(/^@+/, "");
  const avatarUrl = String(req.body?.avatarUrl ?? "").trim();

  if (!nextName) {
    return res.status(400).json({ error: "Name is required." });
  }

  if (nextName.length > 40) {
    return res.status(400).json({ error: "Name must be 40 characters or less." });
  }

  req.user.name = nextName;

  if (requestedHandle) {
    const sanitizedHandle = requestedHandle.replace(/[^a-z0-9]/g, "").slice(0, 24);
    if (!sanitizedHandle) {
      return res.status(400).json({ error: "Handle must include letters or numbers." });
    }

    const uniqueHandle = await generateUniqueHandle(sanitizedHandle, req.user._id);
    req.user.handle = uniqueHandle;
  } else {
    req.user.handle = await generateUniqueHandle(nextName, req.user._id);
  }

  req.user.avatarUrl = avatarUrl || undefined;

  await req.user.save();

  res.json({
    user: serializeUser(req.user),
  });
});

app.get("/api/rooms", requireAuth, async (req, res) => {
  await ensureUserHandle(req.user);
  res.json({
    rooms: await getSerializedRooms(req.user._id, presenceStore.getOnlineUserIds()),
  });
});

app.get("/api/users/search", requireAuth, async (req, res) => {
  await ensureUserHandle(req.user);
  const query = String(req.query?.q ?? "").trim();
  const users = await searchUsersByHandle({
    query,
    excludeUserId: req.user._id,
  });

  res.json({
    users: users.map(serializeSearchedUser),
  });
});

app.get("/api/connection-requests", requireAuth, async (req, res) => {
  await ensureUserHandle(req.user);
  return res.json(await getSerializedConnectionRequests(req.user._id));
});

app.post("/api/connection-requests", requireAuth, async (req, res) => {
  await ensureUserHandle(req.user);
  const targetHandle = String(req.body?.handle ?? "").trim().toLowerCase().replace(/^@+/, "");

  if (!targetHandle) {
    return res.status(400).json({ error: "A valid user handle is required." });
  }

  const targetUser = await User.findOne({
    handle: targetHandle,
    isEmailVerified: true,
    _id: { $ne: req.user._id },
  });

  if (!targetUser) {
    return res.status(404).json({ error: "No user found with that handle." });
  }

  await ensureUserHandle(targetUser);

  const existingRoom = await getDirectConversationByParticipants([req.user._id, targetUser._id]);
  if (existingRoom) {
    return res.status(409).json({ error: "You are already connected with this user." });
  }

  const incomingRequest = await ConnectionRequest.findOne({
    fromUser: targetUser._id,
    toUser: req.user._id,
    status: "pending",
  });
  if (incomingRequest) {
    return res.status(409).json({ error: "This user already sent you a request. Accept it to chat." });
  }

  let request = await ConnectionRequest.findOne({
    fromUser: req.user._id,
    toUser: targetUser._id,
    status: "pending",
  }).populate("toUser");

  if (!request) {
    request = await ConnectionRequest.create({
      fromUser: req.user._id,
      toUser: targetUser._id,
      status: "pending",
    });
    request = await ConnectionRequest.findById(request._id).populate("toUser");
  }

  await emitConnectionRequestsUpdate([req.user._id, targetUser._id]);

  return res.status(201).json({
    request: {
      id: request._id.toString(),
      status: request.status,
      createdAt: request.createdAt,
      user: serializeSearchedUser(targetUser),
    },
  });
});

app.post("/api/connection-requests/:requestId/accept", requireAuth, async (req, res) => {
  await ensureUserHandle(req.user);

  const request = await ConnectionRequest.findOne({
    _id: req.params.requestId,
    toUser: req.user._id,
    status: "pending",
  }).populate("fromUser toUser");

  if (!request) {
    return res.status(404).json({ error: "Connection request not found." });
  }

  await ensureUserHandle(request.fromUser);
  const { room, conversation } = await createOrGetDirectConversation({
    currentUser: req.user,
    targetUser: request.fromUser,
  });

  request.status = "accepted";
  request.roomSlug = room.slug;
  await request.save();

  await emitRoomsUpdate([request.fromUser._id, req.user._id]);
  await emitConnectionRequestsUpdate([request.fromUser._id, req.user._id]);

  return res.json({
    room: conversation,
    request: {
      id: request._id.toString(),
      status: request.status,
      roomSlug: request.roomSlug,
    },
  });
});

app.get("/api/rooms/:roomId/messages", requireAuth, async (req, res) => {
  const room = await getRoomBySlug(req.params.roomId, req.user._id);

  if (!room) {
    return res.status(404).json({ error: "Conversation not found." });
  }

  const otherParticipant =
    room.participants.find((participant) => participant._id.toString() !== req.user._id.toString()) ??
    room.participants[0];

  return res.json({
    room: {
      id: room.slug,
      name: otherParticipant?.name ?? room.name,
      description: `Direct conversation with ${otherParticipant?.name ?? "user"}`,
      topic: otherParticipant?.handle ? `@${otherParticipant.handle}` : "",
    },
    messages: await getRoomMessages(room.slug, config.messageHistoryLimit),
  });
});

app.post("/api/rooms/:roomId/messages", requireAuth, async (req, res) => {
  const room = await getRoomBySlug(req.params.roomId, req.user._id);

  if (!room) {
    return res.status(404).json({ error: "Conversation not found." });
  }

  const text = req.body?.text?.trim?.() ?? "";
  const attachment = req.body?.attachment ?? null;

  if (!text && !attachment) {
    return res.status(400).json({ error: "Message cannot be empty." });
  }

  await ensureUserHandle(req.user);

  const message = await createPersistedMessage({
    roomSlug: room.slug,
    senderId: req.user._id,
    sender: req.user.name,
    senderProfile: serializeUser(req.user).profile,
    text,
    attachment,
  });

  io.to(room.slug).emit("message:new", message);
  await emitRoomsUpdate(room.participants.map((participant) => participant._id?.toString?.() ?? participant.toString()));

  return res.status(201).json({ message });
});

app.post("/api/rooms/:roomId/messages/:messageId/reactions", requireAuth, async (req, res) => {
  const room = await getRoomBySlug(req.params.roomId, req.user._id);

  if (!room) {
    return res.status(404).json({ error: "Conversation not found." });
  }

  const emoji = String(req.body?.emoji ?? "").trim();
  if (!emoji) {
    return res.status(400).json({ error: "Emoji is required." });
  }

  const updatedMessage = await toggleReaction({
    roomSlug: room.slug,
    messageId: req.params.messageId,
    emoji,
    username: req.user.name,
  });

  if (!updatedMessage) {
    return res.status(404).json({ error: "Message not found." });
  }

  io.to(room.slug).emit("message:updated", updatedMessage);

  return res.json({ message: updatedMessage });
});

app.post("/api/upload", requireAuth, (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: `File is too large. Max size is ${config.maxFileSizeMb}MB.` });
    }

    if (error) {
      return next(error);
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    return res.status(201).json({
      attachment: {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        url: `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`,
      },
    });
  });
});

io.on("connection", async (socket) => {
  const socketUser = socket.data.user;
  presenceStore.upsert(socket.id, {
    socketId: socket.id,
    userId: socketUser.id,
    username: socketUser.name,
    profile: socketUser.profile,
    roomSlug: null,
  });
  socket.join(`user:${socketUser.id}`);
  socket.emit("rooms:update", {
    rooms: await getSerializedRooms(socketUser.id, presenceStore.getOnlineUserIds()),
  });
  socket.emit("connection-requests:update", await getSerializedConnectionRequests(socketUser.id));
  await emitRoomsUpdate([socketUser.id, ...(await getDirectConversationContactIds(socketUser.id))]);

  socket.on("room:join", async ({ roomId }) => {
    const room = await getRoomBySlug(roomId, socketUser.id);
    const user = socket.data.user;

    if (!room || !user) {
      socket.emit("error:message", { message: "Valid conversation and authenticated user are required." });
      return;
    }

    const previousUser = presenceStore.upsert(socket.id, {
      socketId: socket.id,
      userId: user.id,
      username: user.name,
      profile: user.profile,
      roomSlug: roomId,
    });

    const previousRoomId = previousUser?.roomSlug;
    if (previousRoomId) {
      socket.leave(previousRoomId);
      socket.to(previousRoomId).emit("typing:update", {
        roomId: previousRoomId,
        username: user.name,
        isTyping: false,
      });
    }

    socket.join(roomId);
    socket.emit("room:history", {
      roomId,
      messages: await getRoomMessages(roomId, config.messageHistoryLimit),
    });

    if (previousRoomId && previousRoomId !== roomId) {
      emitRoomPresence(previousRoomId);
    }

    emitRoomPresence(roomId);
  });

  socket.on("message:send", async ({ roomId, text, attachment }) => {
    const activeUser = presenceStore.get(socket.id);
    const resolvedRoomId = roomId || activeUser?.roomSlug;
    if (!resolvedRoomId) {
      socket.emit("error:message", { message: "Open a conversation before sending a message." });
      return;
    }

    const room = await getRoomBySlug(resolvedRoomId, socketUser.id);
    if (!room) {
      socket.emit("error:message", { message: "Conversation not found." });
      return;
    }

    const trimmedText = text?.trim() ?? "";
    if (!trimmedText && !attachment) {
      return;
    }

    const message = await createPersistedMessage({
      roomSlug: resolvedRoomId,
      senderId: socketUser.id,
      sender: socketUser.name,
      senderProfile: socketUser.profile,
      text: trimmedText,
      attachment: attachment ?? null,
    });

    io.to(resolvedRoomId).emit("message:new", message);
    await emitRoomsUpdate(room.participants.map((participant) => participant._id.toString()));
    socket.to(resolvedRoomId).emit("typing:update", {
      roomId: resolvedRoomId,
      username: socketUser.name,
      isTyping: false,
    });
  });

  socket.on("message:react", async ({ roomId, messageId, emoji }) => {
    const activeUser = presenceStore.get(socket.id);
    const resolvedRoomId = roomId || activeUser?.roomSlug;
    if (!resolvedRoomId || !emoji) {
      return;
    }

    const room = await getRoomBySlug(resolvedRoomId, socketUser.id);
    if (!room) {
      socket.emit("error:message", { message: "Conversation not found." });
      return;
    }

    const updatedMessage = await toggleReaction({
      roomSlug: resolvedRoomId,
      messageId,
      emoji,
      username: socketUser.name,
    });

    if (!updatedMessage) {
      return;
    }

    io.to(resolvedRoomId).emit("message:updated", updatedMessage);
  });

  socket.on("typing:start", ({ roomId } = {}) => {
    const activeUser = presenceStore.get(socket.id);
    const resolvedRoomId = roomId || activeUser?.roomSlug;
    if (!resolvedRoomId) {
      return;
    }

    socket.to(resolvedRoomId).emit("typing:update", {
      roomId: resolvedRoomId,
      username: socketUser.name,
      isTyping: true,
    });
  });

  socket.on("typing:stop", ({ roomId } = {}) => {
    const activeUser = presenceStore.get(socket.id);
    const resolvedRoomId = roomId || activeUser?.roomSlug;
    if (!resolvedRoomId) {
      return;
    }

    socket.to(resolvedRoomId).emit("typing:update", {
      roomId: resolvedRoomId,
      username: socketUser.name,
      isTyping: false,
    });
  });

  socket.on("call:invite", async ({ callId, roomId, mode, targetUserId }) => {
    if (!callId || !roomId || !targetUserId || !["voice", "video"].includes(mode)) {
      socket.emit("error:message", { message: "Invalid call request." });
      return;
    }

    const { room, targetUserId: resolvedTargetUserId } = await resolveCallTargetUserId({
      roomId,
      callerUserId: socketUser.id,
      requestedTargetUserId: targetUserId,
    });
    if (!room) {
      socket.emit("error:message", { message: "Conversation not found." });
      return;
    }

    if (!resolvedTargetUserId) {
      socket.emit("error:message", { message: "This user is not part of the selected conversation." });
      return;
    }

    io.to(`user:${resolvedTargetUserId}`).emit("call:incoming", {
      callId,
      roomId,
      mode,
      fromUser: {
        id: socketUser.id,
        name: socketUser.name,
        handle: socketUser.handle,
        avatarUrl: socketUser.avatarUrl ?? null,
        profile: socketUser.profile,
      },
    });
  });

  socket.on("call:accept", async ({ callId, roomId, targetUserId, mode }) => {
    if (!callId || !roomId || !targetUserId || !["voice", "video"].includes(mode)) {
      socket.emit("error:message", { message: "Invalid call acceptance." });
      return;
    }

    const { targetUserId: resolvedTargetUserId } = await resolveCallTargetUserId({
      roomId,
      callerUserId: socketUser.id,
      requestedTargetUserId: targetUserId,
    });
    if (!resolvedTargetUserId) {
      socket.emit("error:message", { message: "Conversation not found for this call." });
      return;
    }

    io.to(`user:${resolvedTargetUserId}`).emit("call:accepted", {
      callId,
      roomId,
      mode,
      byUser: {
        id: socketUser.id,
        name: socketUser.name,
        handle: socketUser.handle,
        avatarUrl: socketUser.avatarUrl ?? null,
        profile: socketUser.profile,
      },
    });
  });

  socket.on("call:decline", async ({ callId, roomId, targetUserId }) => {
    if (!callId || !roomId || !targetUserId) {
      socket.emit("error:message", { message: "Invalid call decline." });
      return;
    }

    const { targetUserId: resolvedTargetUserId } = await resolveCallTargetUserId({
      roomId,
      callerUserId: socketUser.id,
      requestedTargetUserId: targetUserId,
    });
    if (!resolvedTargetUserId) {
      socket.emit("error:message", { message: "Conversation not found for this call." });
      return;
    }

    io.to(`user:${resolvedTargetUserId}`).emit("call:declined", {
      callId,
      roomId,
      byUser: {
        id: socketUser.id,
        name: socketUser.name,
        handle: socketUser.handle,
      },
    });
  });

  socket.on("call:end", async ({ callId, roomId, targetUserId }) => {
    if (!callId || !roomId || !targetUserId) {
      return;
    }

    const { targetUserId: resolvedTargetUserId } = await resolveCallTargetUserId({
      roomId,
      callerUserId: socketUser.id,
      requestedTargetUserId: targetUserId,
    });
    if (!resolvedTargetUserId) {
      return;
    }

    io.to(`user:${resolvedTargetUserId}`).emit("call:ended", {
      callId,
      roomId,
      byUser: {
        id: socketUser.id,
        name: socketUser.name,
        handle: socketUser.handle,
      },
    });
  });

  socket.on("call:offer", async ({ callId, roomId, targetUserId, description }) => {
    if (!callId || !roomId || !targetUserId || !description) {
      socket.emit("error:message", { message: "Invalid call offer." });
      return;
    }

    const { targetUserId: resolvedTargetUserId } = await resolveCallTargetUserId({
      roomId,
      callerUserId: socketUser.id,
      requestedTargetUserId: targetUserId,
    });
    if (!resolvedTargetUserId) {
      socket.emit("error:message", { message: "Conversation not found for this call." });
      return;
    }

    io.to(`user:${resolvedTargetUserId}`).emit("call:offer", {
      callId,
      roomId,
      fromUserId: socketUser.id,
      description,
    });
  });

  socket.on("call:answer", async ({ callId, roomId, targetUserId, description }) => {
    if (!callId || !roomId || !targetUserId || !description) {
      socket.emit("error:message", { message: "Invalid call answer." });
      return;
    }

    const { targetUserId: resolvedTargetUserId } = await resolveCallTargetUserId({
      roomId,
      callerUserId: socketUser.id,
      requestedTargetUserId: targetUserId,
    });
    if (!resolvedTargetUserId) {
      socket.emit("error:message", { message: "Conversation not found for this call." });
      return;
    }

    io.to(`user:${resolvedTargetUserId}`).emit("call:answer", {
      callId,
      roomId,
      fromUserId: socketUser.id,
      description,
    });
  });

  socket.on("call:ice-candidate", async ({ callId, roomId, targetUserId, candidate }) => {
    if (!callId || !roomId || !targetUserId || !candidate) {
      return;
    }

    const { targetUserId: resolvedTargetUserId } = await resolveCallTargetUserId({
      roomId,
      callerUserId: socketUser.id,
      requestedTargetUserId: targetUserId,
    });
    if (!resolvedTargetUserId) {
      return;
    }

    io.to(`user:${resolvedTargetUserId}`).emit("call:ice-candidate", {
      callId,
      roomId,
      fromUserId: socketUser.id,
      candidate,
    });
  });

  socket.on("disconnect", () => {
    const activeUser = presenceStore.remove(socket.id);
    if (!activeUser) {
      return;
    }

    if (activeUser.roomSlug) {
      socket.to(activeUser.roomSlug).emit("typing:update", {
        roomId: activeUser.roomSlug,
        username: activeUser.username,
        isTyping: false,
      });
      emitRoomPresence(activeUser.roomSlug);
    }
    void getDirectConversationContactIds(activeUser.userId).then((contactIds) => {
      void emitRoomsUpdate([activeUser.userId, ...contactIds]);
    });
  });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Something went wrong on the server." });
});

function listen(server, port) {
  return new Promise((resolve, reject) => {
    const handleError = (error) => {
      server.off("listening", handleListening);
      reject(error);
    };

    const handleListening = () => {
      server.off("error", handleError);
      resolve();
    };

    server.once("error", handleError);
    server.once("listening", handleListening);
    server.listen(port);
  });
}

async function startServer() {
  await connectToDatabase();
  await ensureDefaultRooms();

  try {
    await listen(httpServer, config.port);
    console.log(`PulseChat backend listening on http://localhost:${config.port}`);
  } catch (error) {
    if (error?.code === "EADDRINUSE") {
      console.error(
        `Port ${config.port} is already in use. Update PORT in backend/src/.env or stop the process using that port.`
      );
      process.exit(1);
    }

    throw error;
  }
}

startServer().catch((error) => {
  console.error("Failed to start PulseChat backend", error);
  process.exit(1);
});
