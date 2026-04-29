import appLogo from "../assets/pulsechat-logo.png";

export function JoinOverlay({
  authMode,
  authStep,
  authForm,
  authError,
  authBusy,
  devOtp,
  onAuthModeChange,
  onAuthFormChange,
  onSubmit,
  onBackToEmailEntry,
}) {
  const isOtpStep = authStep === "otp";
  const isProfileStep = authStep === "profile";
  const isRegisterFlow = authMode === "register";

  return (
    <div className="overlay">
      <form className="identity-card auth-card" onSubmit={onSubmit}>
        <div className="auth-brand-lockup">
          <div className="auth-brand-mark">
            <img src={appLogo} alt="PulseChat logo" />
          </div>
          <div className="auth-brand-copy">
            <span className="eyebrow">Secure realtime workspace</span>
            <h1>PulseChat</h1>
            <p className="auth-brand-tagline">Connect vibe Share</p>
          </div>
        </div>
        <p className="eyebrow">Secure realtime workspace</p>
        <p className="intro">
          {isRegisterFlow
            ? "Create your account with Gmail verification first, then choose a username and password."
            : "Sign in with your username and password to access your chat workspace."}
        </p>

        <div className="auth-toggle">
          <button
            className={authMode === "login" ? "active" : ""}
            onClick={() => onAuthModeChange("login")}
            type="button"
          >
            Login
          </button>
          <button
            className={authMode === "register" ? "active" : ""}
            onClick={() => onAuthModeChange("register")}
            type="button"
          >
            Create account
          </button>
        </div>

        {authMode === "register" && authStep === "email" && (
          <input
            value={authForm.name}
            onChange={(event) => onAuthFormChange("name", event.target.value)}
            placeholder="Full name"
            maxLength={40}
          />
        )}

        {authMode === "login" ? (
          <>
            <input
              value={authForm.handle}
              onChange={(event) => onAuthFormChange("handle", event.target.value)}
              placeholder="Username"
              maxLength={24}
            />
            <input
              value={authForm.password}
              onChange={(event) => onAuthFormChange("password", event.target.value)}
              placeholder="Password"
              type="password"
            />
          </>
        ) : (
          <>
            {authStep === "email" && (
              <input
                value={authForm.email}
                onChange={(event) => onAuthFormChange("email", event.target.value)}
                placeholder="Gmail address"
                type="email"
              />
            )}

            {isOtpStep && (
              <>
                <input
                  value={authForm.otp}
                  onChange={(event) => onAuthFormChange("otp", event.target.value)}
                  placeholder="Enter 6-digit verification code"
                  inputMode="numeric"
                  maxLength={6}
                />

                {devOtp && <p className="otp-hint">Dev OTP: {devOtp}</p>}

                <button className="secondary-auth-button" onClick={onBackToEmailEntry} type="button">
                  Change email
                </button>
              </>
            )}

            {isProfileStep && (
              <>
                <input
                  value={authForm.handle}
                  onChange={(event) => onAuthFormChange("handle", event.target.value.replace(/^@+/, ""))}
                  placeholder="Choose a username"
                  maxLength={24}
                />
                <input
                  value={authForm.password}
                  onChange={(event) => onAuthFormChange("password", event.target.value)}
                  placeholder="Set a password"
                  type="password"
                />
              </>
            )}
          </>
        )}

        {authError && <p className="auth-error">{authError}</p>}

        <button className="auth-submit-button" type="submit">
          {authBusy
            ? "Please wait..."
            : authMode === "login"
              ? "Login"
              : isOtpStep
                ? "Verify code"
                : isProfileStep
                  ? "Create account"
                  : "Send code"}
        </button>
      </form>
    </div>
  );
}
