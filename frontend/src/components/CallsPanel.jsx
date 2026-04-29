import { getInitials } from "../utils/initials";

export function CallsPanel({ callHistory, onSelectChat }) {
  return (
    <section className="calls-shell">
      <div className="calls-header-card">
        <p className="page-eyebrow">Voice and video</p>
        <h2 className="page-title">Call History</h2>
        <p className="page-subtitle">Recent voice and video calls appear here.</p>
      </div>

      <div className="calls-list-card">
        {callHistory.length ? (
          <div className="calls-list">
            {callHistory.map((entry) => (
              <button
                key={entry.id}
                className="call-history-item"
                onClick={() => onSelectChat(entry.roomId)}
                type="button"
              >
                <span className="call-history-avatar">
                  {entry.participant.avatarUrl ? (
                    <img src={entry.participant.avatarUrl} alt={entry.participant.name} />
                  ) : (
                    getInitials(entry.participant.name, "DM")
                  )}
                </span>
                <span className="call-history-copy">
                  <strong>{entry.participant.name}</strong>
                  <small>@{entry.participant.handle}</small>
                  <small>
                    {entry.mode === "video" ? "Video call" : "Voice call"} · {entry.direction}
                  </small>
                </span>
                <span className={`call-history-status ${entry.status}`}>{entry.status}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>No calls yet.</strong>
            <span>Start a voice or video call from any open conversation to build history.</span>
          </div>
        )}
      </div>
    </section>
  );
}
