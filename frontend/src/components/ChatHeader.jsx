import { useEffect, useRef, useState } from "react";
import appLogo from "../assets/pulsechat-logo.png";
import { getInitials } from "../utils/initials";

export function ChatHeader({
  user,
  activeRoom,
  currentView,
  chatMode,
  searchQuery,
  onSearchQueryChange,
  onLogout,
  onOpenSettings,
  onChangeView,
  onChangeChatMode,
  onlineCount,
}) {
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const headerMenuRef = useRef(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!headerMenuRef.current?.contains(event.target)) {
        setIsHeaderMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const pageTitles = {
    chats: "Chats",
    communities: "Communities",
    calls: "Calls",
    starred: "Starred",
  };

  return (
    <header className="chat-header-shell">
      <div className="chat-header-main">
        <div className="chat-header-brand">
          <div className="dashboard-logo dashboard-logo-header">
            <div className="dashboard-logo-frame">
              <div className="dashboard-logo-lockup">
                <div className="dashboard-logo-mark">
                  <img src={appLogo} alt="PulseChat logo" />
                </div>
                <div className="dashboard-logo-copy">
                  <strong>PulseChat</strong>
                  <span>Connect vibe Share</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="header-tools">
          <nav className="top-nav top-nav-inline" aria-label="Primary workspace navigation">
            {Object.entries(pageTitles).map(([value, label]) => (
              <button
                key={value}
                className={`sidebar-link top-nav-link top-nav-link-inline ${currentView === value ? "active" : ""}`}
                onClick={() => onChangeView(value)}
                type="button"
                aria-label={label}
              >
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <label className="top-search">
            <input
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="Search messages, files, or people"
            />
          </label>

          <div className="top-user">
            <span className="top-user-avatar">
              {user?.profile?.avatarUrl ? (
                <img src={user.profile.avatarUrl} alt={user?.name ?? "User"} />
              ) : (
                user?.profile?.initials ?? getInitials(user?.name, "U")
              )}
            </span>
            <span>
              <strong>{user?.name ?? "John Smith"}</strong>
              <small>{onlineCount} online now</small>
            </span>
          </div>

          <div className="header-menu" ref={headerMenuRef}>
            <button
              className={`header-menu-trigger ${isHeaderMenuOpen ? "active" : ""}`}
              onClick={() => setIsHeaderMenuOpen((current) => !current)}
              type="button"
              aria-label="Open chat options"
              aria-expanded={isHeaderMenuOpen}
            >
              <span />
              <span />
              <span />
            </button>

            {isHeaderMenuOpen && (
              <div className="header-menu-panel header-menu-panel-right">
                <button
                  className={`header-menu-item ${chatMode === "messages" ? "active" : ""}`}
                  onClick={() => {
                    onChangeChatMode("messages");
                    setIsHeaderMenuOpen(false);
                  }}
                  type="button"
                >
                  <span>View</span>
                  <strong>Messages</strong>
                </button>
                <button
                  className={`header-menu-item ${chatMode === "media" ? "active" : ""}`}
                  onClick={() => {
                    onChangeChatMode("media");
                    setIsHeaderMenuOpen(false);
                  }}
                  type="button"
                >
                  <span>View</span>
                  <strong>Media</strong>
                </button>

                <button
                  className="header-menu-item header-menu-item-accent"
                  onClick={() => {
                    onOpenSettings();
                    setIsHeaderMenuOpen(false);
                  }}
                  type="button"
                >
                  <span>Workspace</span>
                  <strong>Settings</strong>
                </button>

                <button
                  className="header-menu-item header-menu-item-danger"
                  onClick={() => {
                    onLogout();
                    setIsHeaderMenuOpen(false);
                  }}
                  type="button"
                >
                  <span>Account</span>
                  <strong>Logout</strong>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
