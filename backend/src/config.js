import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envCandidates = [
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../.env"),
  path.resolve(__dirname, ".env"),
];

for (const envPath of envCandidates) {
  dotenv.config({ path: envPath, override: false });
}

dotenv.config({ override: false });

export const config = {
  port: Number(process.env.PORT ?? 4000),
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB ?? 10),
  messageHistoryLimit: Number(process.env.MESSAGE_HISTORY_LIMIT ?? 100),
  mongodbUri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/pulsechat",
  mongodbDnsServers: String(process.env.MONGODB_DNS_SERVERS ?? "8.8.8.8,1.1.1.1")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  jwtSecret: process.env.JWT_SECRET ?? "change-this-in-production",
  otpTtlMinutes: Number(process.env.OTP_TTL_MINUTES ?? 5),
  exposeDevOtp: process.env.EXPOSE_DEV_OTP !== "false",
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  otpFromEmail: process.env.OTP_FROM_EMAIL ?? "",
};
