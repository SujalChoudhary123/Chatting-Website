import { io } from "socket.io-client";
import { backendRuntime } from "./backendRuntime";

const runtimeHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
const runtimeOrigin = typeof window !== "undefined" ? window.location.origin : "";
const configuredApiUrl = String(import.meta.env.VITE_API_URL ?? "").trim();

function isLoopbackHost(hostname = "") {
  return ["localhost", "127.0.0.1", "0.0.0.0"].includes(String(hostname).trim().toLowerCase());
}

function isPrivateNetworkHost(hostname = "") {
  const normalizedHost = String(hostname).trim().toLowerCase();

  if (normalizedHost.endsWith(".local")) {
    return true;
  }

  const ipv4Match = normalizedHost.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4Match) {
    return false;
  }

  const [firstOctet, secondOctet] = ipv4Match.slice(1, 3).map(Number);
  return (
    firstOctet === 10 ||
    (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) ||
    (firstOctet === 192 && secondOctet === 168)
  );
}

function isSameOriginUrl(candidateUrl, origin) {
  if (!candidateUrl || !origin) {
    return false;
  }

  try {
    return new URL(candidateUrl, origin).origin === origin;
  } catch {
    return false;
  }
}

function isLoopbackUrl(candidateUrl) {
  if (!candidateUrl) {
    return false;
  }

  try {
    return isLoopbackHost(new URL(candidateUrl).hostname);
  } catch {
    return false;
  }
}

const runtimeIsLoopback = isLoopbackHost(runtimeHost);
const prefersLanBackend = typeof window !== "undefined" && isPrivateNetworkHost(runtimeHost);
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

const runtimeOriginCanProxyApi =
  Boolean(runtimeOrigin) && (runtimeIsLoopback || isSameOriginUrl(configuredApiUrl, runtimeOrigin));
const primaryApiUrl = runtimeOriginCanProxyApi
  ? runtimeOrigin
  : configuredApiUrl && !isLoopbackUrl(configuredApiUrl)
    ? configuredApiUrl
    : prefersLanBackend
      ? defaultApiUrlByRuntime[backendRuntime]
      : configuredApiUrl || runtimeOrigin;

const apiCandidates = Array.from(
  new Set([
    primaryApiUrl,
    runtimeOriginCanProxyApi ? configuredApiUrl : runtimeOrigin,
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
