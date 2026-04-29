import { getInitials } from "../utils/initials";

export function StarredPanel({ rooms, onSelectChat, onToggleStar }) {
  return (
    <section className="directory-shell">
      <div className="directory-hero-card">
        <p className="page-eyebrow">Saved rooms</p>
        <h2 className="page-title">Starred</h2>
        <p className="page-subtitle">
          Keep your most important conversations one click away.
        </p>
      </div>

      <div className="directory-card">
        <div className="details-card-header">
          <strong>Priority conversations</strong>
          <button type="button">{rooms.length} saved</button>
        </div>

        {rooms.length ? (
          <div className="directory-list">
            {rooms.map((room) => (
              <div className="directory-item directory-item-static" key={room.id}>
                <button className="directory-item-main" onClick={() => onSelectChat(room.id)} type="button">
                  <span className="directory-avatar">
                    {room.participant?.avatarUrl ? (
                      <img src={room.participant.avatarUrl} alt={room.name} />
                    ) : (
                      getInitials(room.participant?.name ?? room.name, "DM")
                    )}
                  </span>
                  <span className="directory-copy">
                    <strong>{room.name}</strong>
                    <small>
                      {room.participant?.handle
                        ? `@${room.participant.handle}`
                        : room.lastMessagePreview || "Starred conversation"}
                    </small>
                  </span>
                </button>
                <button className="directory-secondary-button" onClick={() => onToggleStar(room.id)} type="button">
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>No starred chats yet.</strong>
            <span>Saved priority conversations will appear here.</span>
          </div>
        )}
      </div>
    </section>
  );
}
