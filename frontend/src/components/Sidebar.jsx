import appLogo from "../assets/pulsechat-logo.png";
import { getInitials } from "../utils/initials";

const primaryLinks = [
  { label: "Chats", hint: "Recent conversations" },
  { label: "Communities", hint: "Group spaces" },
  { label: "Calls", hint: "Voice and video" },
  { label: "Starred", hint: "Saved rooms" },
];

export function Sidebar({ user, totalUnreadCount, onlineCount, currentView, onChangeView, onOpenSettings }) {
  return (
    <aside className="messaging-sidebar">
      <div className="dashboard-logo">
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

      <button
        className="workspace-card sidebar-profile-card"
        onClick={onOpenSettings}
        type="button"
      >
        <div className="sidebar-profile-row">
          <div className="sidebar-profile-avatar">
            {user?.profile?.avatarUrl ? (
              <img src={user.profile.avatarUrl} alt={user?.name ?? "User"} />
            ) : (
              user?.profile?.initials ?? getInitials(user?.name, "U")
            )}
          </div>
          <div>
          <strong>{user?.name ?? "Guest user"}</strong>
          <small>{user?.handle ? `@${user.handle}` : user?.email ?? "Private profile"}</small>
          </div>
        </div>
        <div className="workspace-balance">
          <span>Unread</span>
          <strong>{totalUnreadCount}</strong>
        </div>
        <div className="workspace-balance">
          <span>Online now</span>
          <strong>{onlineCount}</strong>
        </div>
      </button>

      <div className="sidebar-section-title">Navigation</div>
      <nav className="sidebar-nav">
        {primaryLinks.map((item) => (
          <button
            key={item.label}
            className={`sidebar-link ${currentView === item.label.toLowerCase() ? "active" : ""}`}
            onClick={() => onChangeView(item.label.toLowerCase())}
            type="button"
          >
            <span>{item.label}</span>
            <small>{item.hint}</small>
          </button>
        ))}
      </nav>
    </aside>
  );
}
