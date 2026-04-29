import { getInitials } from "../utils/initials";

export function InboxPanel({
  rooms,
  activeRoomId,
  onSelectRoom,
  unreadCounts,
  searchQuery,
  discoverQuery,
  onDiscoverQueryChange,
  discoverResults,
  discoverBusy,
  discoverError,
  connectedHandles,
  incomingRequests,
  outgoingRequests,
  onConnectAction,
  busyConnectHandle,
  onAcceptRequest,
  acceptingRequestId,
}) {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleRooms = rooms.filter((room) => {
    if (!normalizedQuery) {
      return true;
    }

    return [room.name, room.lastMessagePreview, room.participant?.handle]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });

  return (
    <aside className="inbox-panel">
      <div className="discover-panel">
        <label className="discover-search">
          <span>Find by @id</span>
          <input
            value={discoverQuery}
            onChange={(event) => onDiscoverQueryChange(event.target.value)}
            placeholder="@username"
            type="text"
          />
        </label>

        {discoverBusy && <p className="discover-hint">Searching people...</p>}
        {!discoverBusy && discoverError && <p className="discover-error">{discoverError}</p>}
        {!discoverBusy && !discoverError && discoverQuery.trim() && !discoverResults.length && (
          <p className="discover-hint">No matching ID found.</p>
        )}

        {!!discoverResults.length && (
          <div className="discover-results">
            {discoverResults.map((person) => (
              <div className="discover-item" key={person.id}>
                <div>
                  <strong>{person.name}</strong>
                  <small>@{person.handle}</small>
                </div>
                <button
                  className="discover-action"
                  onClick={() => onConnectAction(person)}
                  type="button"
                  disabled={busyConnectHandle === person.handle || getActionLabel(person) === "Pending"}
                >
                  {busyConnectHandle === person.handle ? "Please wait..." : getActionLabel(person)}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {!!incomingRequests.length && (
        <div className="inbox-group">
          <div className="inbox-group-title">Requests</div>
          <div className="discover-results request-list">
            {incomingRequests.map((request) => (
              <div className="discover-item request-item" key={request.id}>
                <div className="request-user">
                  <span className="inbox-avatar">
                    {request.user.avatarUrl ? (
                      <img src={request.user.avatarUrl} alt={request.user.name} />
                    ) : (
                      getInitials(request.user.name, "U")
                    )}
                  </span>
                  <span className="request-copy">
                    <strong>{request.user.name}</strong>
                    <small>@{request.user.handle}</small>
                  </span>
                </div>
                <button
                  className="discover-action"
                  onClick={() => onAcceptRequest(request.id)}
                  type="button"
                  disabled={acceptingRequestId === request.id}
                >
                  {acceptingRequestId === request.id ? "Accepting..." : "Accept"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!!outgoingRequests.length && (
        <div className="inbox-group">
          <div className="inbox-group-title">Pending</div>
          <div className="discover-results request-list">
            {outgoingRequests.map((request) => (
              <div className="discover-item request-item" key={request.id}>
                <div className="request-user">
                  <span className="inbox-avatar">
                    {request.user.avatarUrl ? (
                      <img src={request.user.avatarUrl} alt={request.user.name} />
                    ) : (
                      getInitials(request.user.name, "U")
                    )}
                  </span>
                  <span className="request-copy">
                    <strong>{request.user.name}</strong>
                    <small>@{request.user.handle}</small>
                  </span>
                </div>
                <span className="request-pending-badge">Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="inbox-group">
        <div className="inbox-group-title">Conversations</div>
        <div className="inbox-list">
          {visibleRooms.length ? (
            visibleRooms.map((room) => renderRoom(room))
          ) : (
            <p className="inbox-empty">Search by @id to start your first conversation.</p>
          )}
        </div>
      </div>
    </aside>
  );

  function renderRoom(room) {
    const hasUnread = Boolean(unreadCounts[room.id]);

    return (
      <button
        key={room.id}
        className={`inbox-item ${room.id === activeRoomId ? "active" : ""} ${hasUnread ? "unread" : ""}`}
        onClick={() => onSelectRoom(room.id)}
        type="button"
      >
        <span className="inbox-avatar">
          {room.participant?.avatarUrl ? (
            <img src={room.participant.avatarUrl} alt={room.name} />
          ) : (
            getInitials(room.participant?.name ?? room.name, "DM")
          )}
        </span>
        <span className="inbox-copy">
          <span className="inbox-copy-top">
            <strong>{room.name}</strong>
            <small>{room.lastMessageAt ? formatRelativeTime(room.lastMessageAt) : "Now"}</small>
          </span>
          <small className="presence-text">
            <span className={`presence-dot ${room.participant?.status === "online" ? "online" : "offline"}`} />
            {room.participant?.status === "online" ? "Online" : "Offline"}
            {room.participant?.handle ? ` Â· @${room.participant.handle}` : ""}
          </small>
          <small>{room.lastMessagePreview || "Say hello"}</small>
        </span>
        {hasUnread && <span className="inbox-unread-dot" aria-label="Unread messages" />}
      </button>
    );
  }

  function getActionLabel(person) {
    if (connectedHandles.includes(person.handle)) {
      return "Open chat";
    }

    if (incomingRequests.some((request) => request.user.handle === person.handle)) {
      return "Accept";
    }

    if (outgoingRequests.some((request) => request.user.handle === person.handle)) {
      return "Pending";
    }

    return "Connect";
  }
}

function formatRelativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Now";
  }

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
