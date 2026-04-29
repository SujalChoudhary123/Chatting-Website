import { createMessage, createUserProfile } from "../utils/message.js";

export function createChatStore({ messageHistoryLimit = 100 } = {}) {
  const rooms = new Map([
    [
      "general",
      {
        id: "general",
        name: "General",
        description: "Open chat for everyone",
        topic: "Company-wide updates, wins, and quick check-ins",
        messages: [],
        createdAt: new Date().toISOString(),
      },
    ],
    [
      "engineering",
      {
        id: "engineering",
        name: "Engineering",
        description: "Frontend, backend, and architecture talk",
        topic: "Design reviews, incident notes, and shipping plans",
        messages: [],
        createdAt: new Date().toISOString(),
      },
    ],
    [
      "design",
      {
        id: "design",
        name: "Design",
        description: "UX discussions and interface feedback",
        topic: "Critiques, prototypes, and user research highlights",
        messages: [],
        createdAt: new Date().toISOString(),
      },
    ],
  ]);

  const users = new Map();

  const trimHistory = (room) => {
    if (room.messages.length > messageHistoryLimit) {
      room.messages = room.messages.slice(-messageHistoryLimit);
    }
  };

  return {
    getRooms() {
      return Array.from(rooms.values());
    },

    serializeRooms() {
      return Array.from(rooms.values()).map((room) => ({
        id: room.id,
        name: room.name,
        description: room.description,
        topic: room.topic,
        messageCount: room.messages.length,
        createdAt: room.createdAt,
        lastMessageAt: room.messages.at(-1)?.createdAt ?? room.createdAt,
        lastMessagePreview:
          room.messages.at(-1)?.text ||
          room.messages.at(-1)?.attachment?.fileName ||
          "No messages yet",
      }));
    },

    getRoom(roomId) {
      return rooms.get(roomId);
    },

    createRoom(name) {
      const normalizedName = name.trim();
      const id = normalizedName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      if (!id) {
        return { error: "Room name is invalid." };
      }

      if (rooms.has(id)) {
        return { error: "A room with that name already exists." };
      }

      const room = {
        id,
        name: normalizedName,
        description: `Group chat for ${normalizedName}`,
        topic: `Live planning and collaboration for ${normalizedName}`,
        messages: [],
        createdAt: new Date().toISOString(),
      };

      rooms.set(id, room);
      return { room };
    },

    getRoomMembers(roomId) {
      return Array.from(users.values())
        .filter((user) => user.roomId === roomId)
        .map((user) => ({
          socketId: user.socketId,
          username: user.username,
          profile: user.profile,
          status: "online",
        }));
    },

    upsertUser(socketId, username, roomId) {
      const previousUser = users.get(socketId) ?? null;
      const user = {
        socketId,
        username,
        roomId,
        joinedAt: previousUser?.joinedAt ?? new Date().toISOString(),
        profile: createUserProfile(username),
      };
      users.set(socketId, user);
      return { previousUser, user };
    },

    removeUser(socketId) {
      const user = users.get(socketId) ?? null;
      users.delete(socketId);
      return user;
    },

    getUser(socketId) {
      return users.get(socketId);
    },

    addMessage(roomId, payload) {
      const room = rooms.get(roomId);
      if (!room) {
        return null;
      }

      const message = createMessage({ roomId, ...payload });
      room.messages.push(message);
      trimHistory(room);
      return message;
    },

    addSystemMessage(roomId, text) {
      return this.addMessage(roomId, {
        sender: "System",
        text,
        type: "system",
      });
    },

    toggleReaction(roomId, messageId, emoji, username) {
      const room = rooms.get(roomId);
      if (!room) {
        return null;
      }

      const message = room.messages.find((item) => item.id === messageId);
      if (!message) {
        return null;
      }

      const nextReactions = { ...(message.reactions ?? {}) };
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
      return message;
    },
  };
}
