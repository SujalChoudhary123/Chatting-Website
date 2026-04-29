import { getInitials } from "../utils/initials";

export function CommunitiesPanel({
  rooms,
  incomingRequests,
  outgoingRequests,
  onSelectChat,
}) {
  return (
    <section className="directory-shell">
      <div className="directory-hero-card">
        <p className="page-eyebrow">Group spaces</p>
        <h2 className="page-title">Communities</h2>
        <p className="page-subtitle">
          Your trusted network lives here while group spaces are still being built.
        </p>
      </div>

      <div className="directory-stats-grid">
        <div className="directory-stat-card">
          <strong>{rooms.length}</strong>
          <span>Connected people</span>
        </div>
        <div className="directory-stat-card">
          <strong>{incomingRequests.length}</strong>
          <span>New requests</span>
        </div>
        <div className="directory-stat-card">
          <strong>{outgoingRequests.length}</strong>
          <span>Pending invites</span>
        </div>
      </div>

      <div className="directory-card">
        <div className="details-card-header">
          <strong>Your people</strong>
          <button type="button">Private network</button>
        </div>

        {rooms.length ? (
          <div className="directory-list">
            {rooms.map((room) => (
              <button
                key={room.id}
                className="directory-item"
                onClick={() => onSelectChat(room.id)}
                type="button"
              >
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
                      : "Direct message"}
                  </small>
                </span>
                <span className="directory-pill">Open chat</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>No community members yet.</strong>
            <span>Connect with people from the Chats view to grow this space.</span>
          </div>
        )}
      </div>
    </section>
  );
}
