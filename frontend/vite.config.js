import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const certDir = path.resolve(__dirname, "certs");
const keyPath = path.join(certDir, "dev-key.pem");
const certPath = path.join(certDir, "dev-cert.pem");

function buildJavaSocketTarget(apiTarget) {
  try {
    const url = new URL(apiTarget);
    const currentPort =
      url.port || (url.protocol === "https:" ? "443" : "80");
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.port = String(Number(currentPort) + 1);
    return url.toString();
  } catch {
    return "ws://127.0.0.1:8081";
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const backendRuntime = String(env.VITE_BACKEND_RUNTIME ?? "node")
    .trim()
    .toLowerCase();
  const apiTarget = String(
    env.VITE_API_URL ??
      (backendRuntime === "cpp"
        ? "http://127.0.0.1:8091"
        : backendRuntime === "java"
          ? "http://127.0.0.1:8080"
          : "http://127.0.0.1:4000")
  ).trim();

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      https:
        fs.existsSync(keyPath) && fs.existsSync(certPath)
          ? {
              key: fs.readFileSync(keyPath),
              cert: fs.readFileSync(certPath),
            }
          : undefined,
      port: 5173,
      proxy: {
        "/socket.io": {
          target: apiTarget,
          ws: true,
          changeOrigin: true,
          secure: false,
        },
        "/api/socket": {
          target:
            backendRuntime === "java"
              ? buildJavaSocketTarget(apiTarget)
              : apiTarget,
          ws: true,
          secure: false,
        },
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
