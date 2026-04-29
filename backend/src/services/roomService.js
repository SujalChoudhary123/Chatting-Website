import { Message } from "../models/Message.js";
import { Room } from "../models/Room.js";
import { ensureUserHandle } from "./userService.js";

export async function ensureDefaultRooms() {
  return Promise.resolve();
}

export async function getDirectConversationContactIds(currentUserId) {
  const rooms = await Room.find({
    type: "direct",
    participants: currentUserId,
  }).select("participants");

  return Array.from(
    new Set(
      rooms.flatMap((room) =>
        room.participants
          .map((participant) => participant.toString())
          .filter((participantId) => participantId !== currentUserId.toString())
      )
    )
  );
}

function buildDirectConversationSlug(userIds) {
  return `dm-${userIds.map((id) => id.toString()).sort().join("-")}`;
}

export async function getDirectConversationByParticipants(userIds) {
  const slug = buildDirectConversationSlug(userIds);
  return Room.findOne({ slug, type: "direct" }).populate("participants");
}

async function serializeConversation(room, currentUserId, onlineUserIds = []) {
  const [messageCount, lastMessage] = await Promise.all([
    Message.countDocuments({ roomSlug: room.slug }),
    Message.findOne({ roomSlug: room.slug }).sort({ createdAt: -1 }).lean(),
  ]);

  const otherParticipant =
    room.participants.find((participant) => participant._id.toString() !== currentUserId.toString()) ??
    room.participants[0];

  if (!otherParticipant) {
    return null;
  }

  await ensureUserHandle(otherParticipant);

  return {
    id: room.slug,
    type: room.type,
    name: otherParticipant.name,
    description: `Direct conversation with ${otherParticipant.name}`,
    topic: `@${otherParticipant.handle}`,
    messageCount,
    createdAt: room.createdAt,
    lastMessageAt: lastMessage?.createdAt ?? room.createdAt,
    lastMessagePreview:
      lastMessage?.text || lastMessage?.attachment?.fileName || "No messages yet",
    participant: {
      id: otherParticipant._id.toString(),
      name: otherParticipant.name,
      handle: otherParticipant.handle,
      avatarUrl: otherParticipant.avatarUrl,
      email: otherParticipant.email,
      status: onlineUserIds.includes(otherParticipant._id.toString()) ? "online" : "offline",
    },
  };
}

export async function getSerializedRooms(currentUserId, onlineUserIds = []) {
  const rooms = await Room.find({
    type: "direct",
    participants: currentUserId,
  })
    .populate("participants")
    .sort({ updatedAt: -1 });

  const serializedRooms = await Promise.all(
    rooms.map((room) => serializeConversation(room, currentUserId, onlineUserIds))
  );

  return serializedRooms.filter(Boolean);
}

export async function getRoomBySlug(slug, currentUserId = null) {
  const room = await Room.findOne({ slug }).populate("participants");
  if (!room) {
    return null;
  }

  if (
    currentUserId &&
    !room.participants.some((participant) => participant._id.toString() === currentUserId.toString())
  ) {
    return null;
  }

  return room;
}

export async function createOrGetDirectConversation({ currentUser, targetUser }) {
  const participantIds = [currentUser._id.toString(), targetUser._id.toString()].sort();
  const slug = buildDirectConversationSlug(participantIds);

  let room = await Room.findOne({ slug }).populate("participants");

  if (!room) {
    room = await Room.create({
      slug,
      type: "direct",
      name: `${currentUser.name} and ${targetUser.name}`,
      description: "Direct conversation",
      topic: `@${targetUser.handle}`,
      createdBy: currentUser._id,
      participants: [currentUser._id, targetUser._id],
    });

    room = await Room.findById(room._id).populate("participants");
  }

  return {
    room,
    conversation: await serializeConversation(room, currentUser._id),
  };
}
