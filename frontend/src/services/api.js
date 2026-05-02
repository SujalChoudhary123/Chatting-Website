import { getApiBaseUrl, getApiCandidates, setApiBaseUrl } from "../lib/socket";

function isLikelyFrontendHtmlResponse(response) {
  const contentType = String(response.headers.get("content-type") ?? "").toLowerCase();
  return !response.ok && contentType.includes("text/html");
}

async function request(path, { token, headers, ...options } = {}) {
  const requestOptions = {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  };

  const candidates = [
    getApiBaseUrl(),
    ...getApiCandidates().filter((candidate) => candidate !== getApiBaseUrl()),
  ];

  let response;

  for (const candidate of candidates) {
    try {
      const nextResponse = await fetch(`${candidate}${path}`, requestOptions);

      if (isLikelyFrontendHtmlResponse(nextResponse) && candidate !== candidates[candidates.length - 1]) {
        continue;
      }

      response = nextResponse;
      setApiBaseUrl(candidate);
      break;
    } catch {
    }
  }

  if (!response) {
    if (
      typeof window !== "undefined" &&
      !["localhost", "127.0.0.1"].includes(window.location.hostname) &&
      candidates.some((candidate) => /^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?$/i.test(candidate))
    ) {
      throw new Error("This frontend is still pointing at a localhost backend. Set VITE_API_URL to your deployed backend URL.");
    }

    throw new Error(
      `Cannot reach the backend. Tried: ${candidates.join(", ")}. Check that the backend is running.`
    );
  }

  let payload = {};

  try {
    payload = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(`Server error (${response.status}).`);
    }
  }

  if (!response.ok) {
    const message = String(payload.error ?? "Request failed.");

    if (/mobile number|phone number/i.test(message)) {
      throw new Error("Enter a valid Gmail address.");
    }

    throw new Error(message);
  }

  return payload;
}

export function requestOtp({ name, email }) {
  return request("/api/auth/request-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "register", name, email }),
  });
}

export function verifyOtp({ email, otp }) {
  return request("/api/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
}

export function completeRegistration({ signupToken, handle, password }) {
  return request("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signupToken, handle, password }),
  });
}

export function loginWithPassword({ handle, password }) {
  return request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ handle, password }),
  });
}

export function fetchCurrentUser(token) {
  return request("/api/auth/me", { token });
}

export function updateProfile({ name, handle, avatarUrl }, token) {
  return request("/api/auth/profile", {
    token,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, handle, avatarUrl }),
  });
}

export function fetchRooms(token) {
  return request("/api/rooms", { token });
}

export function fetchRoomMessages(roomId, token) {
  return request(`/api/rooms/${encodeURIComponent(roomId)}/messages`, { token });
}

export function sendMessage({ roomId, text, attachment }, token) {
  return request(`/api/rooms/${encodeURIComponent(roomId)}/messages`, {
    token,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, attachment }),
  });
}

export function reactToMessage({ roomId, messageId, emoji }, token) {
  return request(
    `/api/rooms/${encodeURIComponent(roomId)}/messages/${encodeURIComponent(messageId)}/reactions`,
    {
      token,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    }
  );
}

export function searchUsers(query, token) {
  const params = new URLSearchParams({ q: query });
  return request(`/api/users/search?${params.toString()}`, { token });
}

export function fetchConnectionRequests(token) {
  return request("/api/connection-requests", { token });
}

export function sendConnectionRequest(handle, token) {
  return request("/api/connection-requests", {
    token,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ handle }),
  });
}

export function acceptConnectionRequest(requestId, token) {
  return request(`/api/connection-requests/${encodeURIComponent(requestId)}/accept`, {
    token,
    method: "POST",
  });
}

export function sendCallSignal(payload, token) {
  return request("/api/calls/signal", {
    token,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function uploadFile(file, token) {
  const formData = new FormData();
  formData.append("file", file);

  return request("/api/upload", {
    token,
    method: "POST",
    body: formData,
  }).then((payload) => payload.attachment);
}
