import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { env } from "../config/env.js";

const COOKIE_NAME = "anp_management_session";
const SESSION_DURATION_SECONDS = 8 * 60 * 60;
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const BLOCK_DURATION_MS = 15 * 60 * 1000;

type AttemptState = {
  attempts: number;
  windowStartedAt: number;
  blockedUntil: number;
};

const loginAttempts = new Map<string, AttemptState>();

function digest(value: string): Buffer {
  return createHmac("sha256", env.webSessionSecret)
    .update(value)
    .digest();
}

function safeEqual(left: string, right: string): boolean {
  return timingSafeEqual(digest(left), digest(right));
}

function signature(payload: string): string {
  return createHmac("sha256", env.webSessionSecret)
    .update(payload)
    .digest("base64url");
}

function getCookie(request: IncomingMessage, name: string): string | null {
  const cookies = request.headers.cookie;

  if (!cookies) {
    return null;
  }

  for (const pair of cookies.split(";")) {
    const separator = pair.indexOf("=");

    if (separator === -1) {
      continue;
    }

    const key = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();

    if (key === name) {
      return value;
    }
  }

  return null;
}

function getClientKey(request: IncomingMessage): string {
  const forwarded = request.headers["x-forwarded-for"];

  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0];
  }

  return request.socket.remoteAddress ?? "unknown";
}

function makeSessionToken(): string {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
  const nonce = randomBytes(16).toString("base64url");
  const payload = `${expiresAt}.${nonce}`;

  return `${payload}.${signature(payload)}`;
}

function isSessionTokenValid(token: string): boolean {
  const parts = token.split(".");

  if (parts.length !== 3) {
    return false;
  }

  const [expiresValue, nonce, providedSignature] = parts;

  if (!expiresValue || !nonce || !providedSignature) {
    return false;
  }

  const expiresAt = Number(expiresValue);

  if (!Number.isInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  const payload = `${expiresValue}.${nonce}`;
  return safeEqual(signature(payload), providedSignature);
}

function getAttemptState(key: string): AttemptState {
  const now = Date.now();
  const existing = loginAttempts.get(key);

  if (existing?.blockedUntil && existing.blockedUntil > now) {
    return existing;
  }

  if (!existing || now - existing.windowStartedAt > ATTEMPT_WINDOW_MS) {
    const fresh = {
      attempts: 0,
      windowStartedAt: now,
      blockedUntil: 0,
    };
    loginAttempts.set(key, fresh);
    return fresh;
  }

  return existing;
}

function secureCookieSuffix(): string {
  return process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === "production"
    ? "; Secure"
    : "";
}

export function getLoginBlockSeconds(request: IncomingMessage): number {
  const state = getAttemptState(getClientKey(request));
  const remaining = state.blockedUntil - Date.now();

  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

export function verifyAccessCode(request: IncomingMessage, code: string): boolean {
  const key = getClientKey(request);
  const state = getAttemptState(key);
  const now = Date.now();

  if (state.blockedUntil > now) {
    return false;
  }

  const valid = safeEqual(code.trim(), env.webAccessCode);

  if (valid) {
    loginAttempts.delete(key);
    return true;
  }

  state.attempts += 1;

  if (state.attempts >= MAX_ATTEMPTS) {
    state.blockedUntil = now + BLOCK_DURATION_MS;
    state.attempts = 0;
    state.windowStartedAt = now;
  }

  loginAttempts.set(key, state);
  return false;
}

export function isAuthenticated(request: IncomingMessage): boolean {
  const token = getCookie(request, COOKIE_NAME);
  return token ? isSessionTokenValid(token) : false;
}

export function setSessionCookie(response: ServerResponse): void {
  const token = makeSessionToken();
  response.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly${secureCookieSuffix()}; SameSite=Strict; Max-Age=${SESSION_DURATION_SECONDS}`,
  );
}

export function clearSessionCookie(response: ServerResponse): void {
  response.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly${secureCookieSuffix()}; SameSite=Strict; Max-Age=0`,
  );
}
