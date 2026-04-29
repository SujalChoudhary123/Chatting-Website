import { formatFileSize, formatTime } from "../utils/format";
import { getInitials } from "../utils/initials";

const reactionOptions = ["\u{1F44D}", "\u2764\uFE0F", "\u{1F525}"];

export function MessageList({
  messages,
  username,
  activeRoom,
  currentUser,
  typingUsers,
  messagesEndRef,
  onReact,
  searchQuery,
}) {
  return (
    <section className="conversation-thread">
      {!messages.length && (
        <div className="empty-state">
          <strong>No messages found.</strong>
          <span>
            {searchQuery ? "Try a different search term." : "Start the conversation in this room."}
          </span>
        </div>
      )}

      {messages.map((message) => {
        const isImage = message.attachment?.mimeType?.startsWith("image/");
        const isSelf = message.sender === username;
        const isSystem = message.type === "system";
        const hasReactions = !!Object.keys(message.reactions ?? {}).length;
        const senderLabel = isSelf ? "You" : message.sender;
        const fallbackAvatarUrl = isSelf
          ? currentUser?.profile?.avatarUrl ?? currentUser?.avatarUrl ?? null
          : activeRoom?.participant?.avatarUrl ?? null;
        const fallbackInitials = isSelf
          ? currentUser?.profile?.initials ?? getInitials(currentUser?.name ?? message.sender, "U")
          : message.senderProfile?.initials ?? getInitials(message.sender, "?");

        return (
          <article
            className={`thread-message ${isSelf ? "self" : ""} ${isSystem ? "system" : ""}`}
            key={message.id}
          >
            {!isSystem && (
              <div
                className="thread-avatar"
                style={{ backgroundColor: message.senderProfile?.accentColor ?? "#4e82d8" }}
              >
                {message.senderProfile?.avatarUrl || fallbackAvatarUrl ? (
                  <img src={message.senderProfile?.avatarUrl ?? fallbackAvatarUrl} alt={message.sender} />
                ) : (
                  fallbackInitials
                )}
              </div>
            )}

            <div className={`thread-bubble ${hasReactions ? "has-reactions" : ""}`}>
              {!isSystem && (
                <div className="thread-meta">
                  <strong>{senderLabel}</strong>
                  <span>{formatTime(message.createdAt)}</span>
                </div>
              )}

              {message.text && <p>{message.text}</p>}

              {message.attachment && (
                <a
                  className="attachment"
                  href={message.attachment.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {isImage && (
                    <img
                      className="attachment-preview"
                      src={message.attachment.url}
                      alt={message.attachment.fileName}
                    />
                  )}
                  {!isImage && (
                    <small>
                      {message.attachment.fileName}
                      {message.attachment.fileSize
                        ? ` | ${formatFileSize(message.attachment.fileSize)}`
                        : ""}
                    </small>
                  )}
                </a>
              )}

              {!isSystem && hasReactions && (
                <div className="reaction-row">
                  <div className="reaction-list">
                    {Object.entries(message.reactions ?? {}).map(([emoji, users]) => (
                      <button
                        key={emoji}
                        className={`reaction-chip ${users.includes(username) ? "active" : ""}`}
                        onClick={() => onReact(message.id, emoji)}
                        type="button"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!isSystem && (
                <div className="quick-reactions" aria-label="Quick reactions">
                  {reactionOptions.map((emoji) => (
                    <button
                      key={emoji}
                      className="quick-reaction-button"
                      onClick={() => onReact(message.id, emoji)}
                      type="button"
                      aria-label={`React with ${emoji}`}
                    >
                      <span>{emoji}</span>
                    </button>
                  ))}
                </div>
              )}

              {!isSystem && (
                <small className="thread-timestamp">
                  {isSelf ? "Delivered" : "Seen in room"} · {formatTime(message.createdAt)}
                </small>
              )}
            </div>
          </article>
        );
      })}

      {!!typingUsers.length && (
        <div className="typing-indicator">{typingUsers.join(", ")} typing...</div>
      )}

      <div ref={messagesEndRef} />
    </section>
  );
}
