import { getInitials } from "../utils/initials";

export function DetailsPanel({ members, activeRoom, messages, isOpen }) {
  const featuredMember = members[0];
  const imageMessages = messages
    .filter((message) => message.attachment?.mimeType?.startsWith("image/"))
    .slice(-6)
    .reverse();
  const fileCount = messages.filter((message) => message.attachment).length;
  const activeMemberCount = members.length;
  const contactName = activeRoom?.participant?.name ?? featuredMember?.username ?? activeRoom?.name;
  const contactHandle = activeRoom?.participant?.handle;
  const contactAvatarUrl = activeRoom?.participant?.avatarUrl ?? null;
  const contactStatus = activeRoom?.participant?.status === "online" ? "online" : "offline";

  return (
    <aside
      className={`profile-panel ${isOpen ? "open" : "closed"}`}
      aria-hidden={!isOpen}
    >
      <div className="details-panel-header">
        <div>
          <h3>Chat details</h3>
          <p>{contactName ?? "Conversation"} overview</p>
        </div>
      </div>

      <div className="profile-card">
        <div className="profile-photo">
          {contactAvatarUrl ? (
            <img src={contactAvatarUrl} alt={contactName ?? "Contact"} />
          ) : (
            getInitials(contactName, "DM")
          )}
        </div>
        <h3>{contactName ?? "Direct message"}</h3>
        <p className="profile-status-line">
          <span className={`presence-dot ${contactStatus}`} />
          {contactStatus === "online" ? "Online now" : "Offline"}
          {contactHandle ? ` · @${contactHandle}` : ""}
        </p>
        <div className="badge-row">
          <span className="status-tag">direct chat</span>
          <span className="status-tag secondary">shared media</span>
        </div>
      </div>

      <section className="details-card stats-card">
        <div className="stat-pill">
          <strong>{messages.length}</strong>
          <span>Messages</span>
        </div>
        <div className="stat-pill">
          <strong>{fileCount}</strong>
          <span>Files</span>
        </div>
        <div className="stat-pill">
          <strong>{activeMemberCount}</strong>
          <span>Online</span>
        </div>
      </section>

      <section className="details-card">
        <div className="details-card-header">
          <strong>Media</strong>
          <button type="button">View all</button>
        </div>
        <div className="media-grid">
          {imageMessages.length ? (
            imageMessages.map((message) => (
              <img
                key={message.id}
                className="media-thumb"
                src={message.attachment.url}
                alt={message.attachment.fileName}
              />
            ))
          ) : (
            <div className="media-empty">Shared images will appear here.</div>
          )}
        </div>
      </section>

      <section className="details-card">
        <div className="details-card-header">
          <strong>Shared links and files</strong>
          <button type="button">Open</button>
        </div>
        <p className="details-note">
          Attachments dropped into this room stay grouped here so the chat feels more like a
          real messaging thread and less like a dashboard.
        </p>
      </section>

      <section className="details-card">
        <div className="details-card-header">
          <strong>Room note</strong>
          <button type="button">Edit</button>
        </div>
        <p className="details-note">
          Keep a short room summary here for context, reminders, pinned decisions, and follow
          ups.
        </p>
      </section>
    </aside>
  );
}
