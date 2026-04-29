import { useEffect, useState } from "react";
import { getInitials } from "../utils/initials";

export function SettingsPanel({
  isOpen,
  user,
  onClose,
  onSave,
  saving,
  onLogout,
  uploadsEnabled = true,
}) {
  const [form, setForm] = useState({ name: "", handle: "", avatarFile: null });
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setForm({
      name: user?.name ?? "",
      handle: user?.handle ?? "",
      avatarFile: null,
    });
    setPreviewUrl(user?.avatarUrl ?? "");
  }, [isOpen, user]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="settings-overlay" onClick={onClose} role="presentation">
      <aside
        className="settings-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <div className="settings-header">
          <div>
            <p className="page-eyebrow">Settings</p>
            <h2>Profile and preferences</h2>
          </div>
          <button className="settings-close" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <section className="settings-section">
          <h3>Edit profile</h3>
          <div className="settings-avatar-row">
            <div className="settings-avatar-preview">
              {previewUrl ? (
                <img src={previewUrl} alt={user?.name ?? "Profile"} />
              ) : (
                <span>{user?.profile?.initials ?? getInitials(user?.name, "U")}</span>
              )}
            </div>

            <label className="settings-upload-button">
              <input
                accept="image/*"
                disabled={!uploadsEnabled}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setForm((current) => ({ ...current, avatarFile: file }));

                  if (previewUrl?.startsWith("blob:")) {
                    URL.revokeObjectURL(previewUrl);
                  }

                  setPreviewUrl(file ? URL.createObjectURL(file) : user?.avatarUrl ?? "");
                }}
                type="file"
              />
              {uploadsEnabled ? "Upload photo" : "Upload unavailable"}
            </label>
            {uploadsEnabled ? <small>Use an image up to 1 MB.</small> : null}
          </div>

          <label className="settings-field">
            <span>Name</span>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              maxLength={40}
              placeholder="Your name"
            />
          </label>

          <label className="settings-field">
            <span>User ID</span>
            <div className="settings-handle-input">
              <span>@</span>
              <input
                value={form.handle}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    handle: event.target.value.replace(/^@+/, ""),
                  }))
                }
                maxLength={24}
                placeholder="username"
              />
            </div>
          </label>

          <label className="settings-field">
            <span>Email</span>
            <input value={user?.email ?? ""} disabled readOnly />
          </label>

          <button
            className="settings-save"
            onClick={() => onSave(form)}
            type="button"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </section>

        <section className="settings-section">
          <h3>Preferences</h3>
          <div className="settings-tile-row">
            <div className="settings-tile">
              <strong>Read receipts</strong>
              <small>Keep delivery and seen status visible in chats.</small>
            </div>
            <div className="settings-switch active">On</div>
          </div>
          <div className="settings-tile-row">
            <div className="settings-tile">
              <strong>Desktop alerts</strong>
              <small>Stay updated when a new direct message arrives.</small>
            </div>
            <div className="settings-switch">Soon</div>
          </div>
        </section>

        <section className="settings-section">
          <h3>Account actions</h3>
          <div className="settings-action-list">
            <button className="settings-action-button" type="button">
              Export chat data
            </button>
            <button className="settings-action-button" type="button">
              Blocked contacts
            </button>
            <button className="settings-action-button danger" onClick={onLogout} type="button">
              Logout
            </button>
          </div>
        </section>
      </aside>
    </div>
  );
}
