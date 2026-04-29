import { Message } from "../models/Message.js";

export async function getRoomMessages(roomSlug, limit) {
  const messages = await Message.find({ roomSlug })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return messages.reverse().map(serializeMessage);
}

export async function createPersistedMessage({
  roomSlug,
  senderId = null,
  sender,
  senderProfile = null,
  text = "",
  attachment = null,
  type = "chat",
  meta = {},
}) {
  const message = await Message.create({
    roomSlug,
    senderId,
    sender,
    senderProfile,
    text,
    attachment,
    type,
    meta,
  });

  return serializeMessage(message.toObject({ flattenMaps: true }));
}

export async function toggleReaction({ roomSlug, messageId, emoji, username }) {
  const message = await Message.findOne({ _id: messageId, roomSlug });
  if (!message) {
    return null;
  }

  const nextReactions = { ...(message.toObject({ flattenMaps: true }).reactions ?? {}) };
  const usersForEmoji = new Set(nextReactions[emoji] ?? []);

  if (usersForEmoji.has(username)) {
    usersForEmoji.delete(username);
  } else {
    usersForEmoji.add(username);
  }

  if (usersForEmoji.size) {
    nextReactions[emoji] = Array.from(usersForEmoji);
  } else {
    delete nextReactions[emoji];
  }

  message.reactions = nextReactions;
  await message.save();

  return serializeMessage(message.toObject({ flattenMaps: true }));
}

export function serializeMessage(message) {
  return {
    id: message._id?.toString?.() ?? message.id,
    roomId: message.roomSlug,
    sender: message.sender,
    senderProfile: message.senderProfile ?? null,
    text: message.text,
    attachment: message.attachment ?? null,
    type: message.type,
    reactions: message.reactions ?? {},
    meta: message.meta ?? {},
    createdAt: message.createdAt,
  };
}

