const configuredRuntime = String(import.meta.env.VITE_BACKEND_RUNTIME ?? "node").trim().toLowerCase();

export const backendRuntime =
  configuredRuntime === "java" || configuredRuntime === "cpp" ? configuredRuntime : "node";
export const supportsRealtime = backendRuntime === "node";
export const supportsCalls = backendRuntime === "node" || backendRuntime === "java" || backendRuntime === "cpp";
export const supportsUploads = backendRuntime === "node";
export const supportsAvatarUploads =
  backendRuntime === "node" || backendRuntime === "java" || backendRuntime === "cpp";
