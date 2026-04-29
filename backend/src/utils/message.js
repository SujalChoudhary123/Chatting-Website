const toInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

const avatarPalette = ["#FFB24D", "#7FD1FF", "#8EE59B", "#FF8A80", "#C4A1FF", "#FFD66B"];

const pickAvatarColor = (name = "") => {
  const hash = Array.from(name).reduce((total, char) => total + char.charCodeAt(0), 0);
  return avatarPalette[hash % avatarPalette.length];
};

export const createUserProfile = (name, avatarUrl = "") => ({
  name,
  initials: toInitials(name),
  accentColor: pickAvatarColor(name),
  avatarUrl: avatarUrl || null,
});

export const createMessage = ({
  roomId,
  sender,
  text = "",
  attachment = null,
  type = "chat",
  reactions = {},
  meta = {},
}) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  roomId,
  sender,
  senderProfile: sender === "System" ? null : createUserProfile(sender),
  text,
  attachment,
  type,
  reactions,
  meta,
  createdAt: new Date().toISOString(),
});
