export function createPresenceStore() {
  const activeUsers = new Map();

  return {
    upsert(socketId, user) {
      const previousUser = activeUsers.get(socketId) ?? null;
      activeUsers.set(socketId, user);
      return previousUser;
    },

    remove(socketId) {
      const user = activeUsers.get(socketId) ?? null;
      activeUsers.delete(socketId);
      return user;
    },

    get(socketId) {
      return activeUsers.get(socketId) ?? null;
    },

    getOnlineUserIds() {
      return Array.from(
        new Set(Array.from(activeUsers.values()).map((user) => user.userId?.toString()).filter(Boolean))
      );
    },

    getRoomMembers(roomSlug) {
      return Array.from(activeUsers.values())
        .filter((user) => user.roomSlug === roomSlug)
        .map((user) => ({
          socketId: user.socketId,
          userId: user.userId,
          username: user.username,
          profile: user.profile,
          status: "online",
        }));
    },
  };
}
