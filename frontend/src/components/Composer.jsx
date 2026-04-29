export function Composer({
  messageInput,
  onMessageInputChange,
  selectedFile,
  onFileChange,
  onSubmit,
  sending,
  uploadsEnabled = true,
}) {
  return (
    <form className="composer-bar" onSubmit={onSubmit}>
      <button className="icon-tool" type="button">
        Emoji
      </button>

      <label className={`icon-tool attach-tool ${uploadsEnabled ? "" : "disabled"}`}>
        <input
          type="file"
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          disabled={!uploadsEnabled}
        />
        <span>{uploadsEnabled ? (selectedFile ? "Attached" : "Attach") : "Attach off"}</span>
      </label>

      <input
        value={messageInput}
        onChange={(event) => onMessageInputChange(event.target.value)}
        placeholder="Type a message"
      />

      <button className="icon-tool" type="button">
        Voice
      </button>

      <button className="send-button" type="submit" disabled={sending}>
        {sending ? "..." : "Send"}
      </button>
    </form>
  );
}
