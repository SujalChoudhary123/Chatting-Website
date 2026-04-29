import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "24px",
            color: "#111b21",
            background:
              "radial-gradient(circle at top left, rgba(37, 211, 102, 0.16), transparent 22%), radial-gradient(circle at bottom right, rgba(18, 140, 126, 0.12), transparent 26%), linear-gradient(180deg, #ecf3ef 0%, #dde8e1 100%)",
          }}
        >
          <div
            style={{
              width: "min(720px, 100%)",
              padding: "24px",
              borderRadius: "20px",
              border: "1px solid rgba(17, 27, 33, 0.12)",
              background: "rgba(255, 255, 255, 0.94)",
              boxShadow: "0 24px 60px rgba(17, 27, 33, 0.12)",
            }}
          >
            <h1 style={{ margin: "0 0 12px" }}>PulseChat hit a runtime error</h1>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {String(this.state.error?.stack ?? this.state.error?.message ?? this.state.error)}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
