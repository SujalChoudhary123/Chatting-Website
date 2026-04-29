function formatAttachmentTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function MediaPanel({ activeRoom, messages }) {
  const attachmentMessages = messages.filter((message) => message.attachment);
  const imageMessages = attachmentMessages.filter((message) =>
    message.attachment?.mimeType?.startsWith("image/")
  );
  const fileMessages = attachmentMessages.filter(
    (message) => !message.attachment?.mimeType?.startsWith("image/")
  );

  return (
    <section className="media-panel">
      <div className="media-panel-section">
        <div className="details-card-header">
          <strong>Shared images</strong>
          <button type="button">{imageMessages.length} items</button>
        </div>

        {imageMessages.length ? (
          <div className="media-library-grid">
            {imageMessages.map((message) => (
              <a
                key={message.id}
                className="media-library-card"
                href={message.attachment.url}
                rel="noreferrer"
                target="_blank"
              >
                <img
                  className="media-library-thumb"
                  src={message.attachment.url}
                  alt={message.attachment.fileName}
                />
                <span className="media-library-meta">
                  <strong>{message.attachment.fileName}</strong>
                  <small>{formatAttachmentTime(message.createdAt)}</small>
                </span>
              </a>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>No shared images yet.</strong>
            <span>
              {activeRoom?.name
                ? `Images shared in ${activeRoom.name} will appear here.`
                : "Open a conversation to browse its media."}
            </span>
          </div>
        )}
      </div>

      <div className="media-panel-section">
        <div className="details-card-header">
          <strong>Files</strong>
          <button type="button">{fileMessages.length} items</button>
        </div>

        {fileMessages.length ? (
          <div className="media-file-list">
            {fileMessages.map((message) => (
              <a
                key={message.id}
                className="media-file-item"
                href={message.attachment.url}
                rel="noreferrer"
                target="_blank"
              >
                <span className="media-file-icon">File</span>
                <span className="media-file-copy">
                  <strong>{message.attachment.fileName}</strong>
                  <small>{formatAttachmentTime(message.createdAt)}</small>
                </span>
              </a>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>No files shared yet.</strong>
            <span>Documents and other attachments from this chat will show here.</span>
          </div>
        )}
      </div>
    </section>
  );
}
