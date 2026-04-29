import { io } from "socket.io-client";
import { backendRuntime } from "./backendRuntime";

const runtimeHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
const runtimeOrigin = typeof window !== "undefined" ? window.location.origin : "";
const prefersLanBackend =
  typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(runtimeHost);
const configuredApiUrl = import.meta.env.VITE_API_URL;
const defaultApiUrlByRuntime = {
  node: `http://${runtimeHost}:4000`,
  java: `http://${runtimeHost}:8080`,
  cpp: `http://${runtimeHost}:8091`,
};
const fallbackApiUrls = [
  defaultApiUrlByRuntime[backendRuntime],
  `http://${runtimeHost}:4000`,
  "http://localhost:4000",
  `http://${runtimeHost}:8080`,
  "http://localhost:8080",
  `http://${runtimeHost}:8091`,
  "http://localhost:8091",
];
const apiCandidates = Array.from(
  new Set([
    runtimeOrigin,
    prefersLanBackend ? defaultApiUrlByRuntime[backendRuntime] : configuredApiUrl,
    configuredApiUrl,
    ...fallbackApiUrls,
  ].filter(Boolean))
);

let activeApiUrl = apiCandidates[0] ?? "http://localhost:4000";

export const socket = io(activeApiUrl, {
  autoConnect: false,
  auth: {
    token: null,
  },
});

export function getApiBaseUrl() {
  return activeApiUrl;
}

export function getJavaRealtimeUrl(token) {
  if (typeof window !== "undefined") {
    const activeOrigin = new URL(activeApiUrl, window.location.origin).origin;
    if (activeOrigin === window.location.origin) {
      const url = new URL("/api/socket", window.location.origin);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      url.search = token ? `token=${encodeURIComponent(token)}` : "";
      return url.toString();
    }
  }

  const parsedUrl = new URL(activeApiUrl);
  const port = parsedUrl.port ? String(Number(parsedUrl.port) + 1) : parsedUrl.protocol === "https:" ? "443" : "81";
  parsedUrl.protocol = parsedUrl.protocol === "https:" ? "wss:" : "ws:";
  parsedUrl.port = port;
  parsedUrl.pathname = "/api/socket";
  parsedUrl.search = token ? `token=${encodeURIComponent(token)}` : "";
  return parsedUrl.toString();
}

export function getJavaEventsUrl(token) {
  if (typeof window !== "undefined") {
    const activeOrigin = new URL(activeApiUrl, window.location.origin).origin;
    if (activeOrigin === window.location.origin) {
      const url = new URL("/api/events", window.location.origin);
      url.search = token ? `token=${encodeURIComponent(token)}` : "";
      return url.toString();
    }
  }

  const url = new URL(activeApiUrl);
  url.pathname = "/api/events";
  url.search = token ? `token=${encodeURIComponent(token)}` : "";
  return url.toString();
}

export function getApiCandidates() {
  return [...apiCandidates];
}

export function setApiBaseUrl(nextUrl) {
  if (!nextUrl || nextUrl === activeApiUrl) {
    return;
  }

  activeApiUrl = nextUrl;

  const parsedUrl = new URL(nextUrl);
  socket.io.uri = nextUrl;
  socket.io.opts.hostname = parsedUrl.hostname;
  socket.io.opts.port = parsedUrl.port;
  socket.io.opts.secure = parsedUrl.protocol === "https:";
 }

export function setSocketToken(token) {
  socket.auth = {
    token,
  };
}
