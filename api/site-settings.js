import { createRemoteJWKSet, jwtVerify } from "jose";
import { Pool } from "pg";

const DEFAULT_SETTINGS = {
  palette: "basalto",
  backgroundColor: "#000001",
  accentColor: "#c7c7c7",
  cardColor: "#17171a",
  cardOpacity: 0.78,
  backgroundImage: "https://i.imgur.com/vMQx7AE.jpeg",
  backgroundShade: 0.16,
  cardWidth: 320,
  cardRadius: 50,
  avatarSize: 146,
  fontFamily: "arial",
  musicUrl: "lil-peep-wanna-be-lyrics_1T09YWa6.mp3",
  musicVolume: 0.08,
};

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
    })
  : null;

let jwks;

function getJwks() {
  if (!jwks) {
    const authBaseUrl = process.env.NEON_AUTH_BASE_URL;
    if (!authBaseUrl) throw new Error("Auth is not configured");
    const baseUrl = authBaseUrl.endsWith("/") ? authBaseUrl : `${authBaseUrl}/`;
    jwks = createRemoteJWKSet(new URL(".well-known/jwks.json", baseUrl));
  }
  return jwks;
}

function isHexColor(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function clampNumber(value, minimum, maximum, name) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum) {
    throw new TypeError(`Invalid ${name}`);
  }
  return number;
}

function validateMediaUrl(value, name) {
  if (typeof value !== "string" || value.length > 2048) {
    throw new TypeError(`Invalid ${name}`);
  }
  if (!value) return "";
  if (/^\/(?!\/)/.test(value) || value.startsWith("./")) return value;

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError(`Invalid ${name}`);
  }
  if (url.protocol !== "https:") throw new TypeError(`Invalid ${name}`);
  return url.href;
}

function validateSettings(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Invalid settings");
  }

  const settings = {
    palette: ["basalto", "sangue", "violeta", "gelo", "custom"].includes(value.palette)
      ? value.palette
      : "custom",
    backgroundColor: value.backgroundColor,
    accentColor: value.accentColor,
    cardColor: value.cardColor,
    cardOpacity: clampNumber(value.cardOpacity, 0.35, 1, "card opacity"),
    backgroundImage: validateMediaUrl(value.backgroundImage, "background image"),
    backgroundShade: clampNumber(value.backgroundShade, 0, 0.65, "background shade"),
    cardWidth: Math.round(clampNumber(value.cardWidth, 260, 420, "card width")),
    cardRadius: Math.round(clampNumber(value.cardRadius, 0, 64, "card radius")),
    avatarSize: Math.round(clampNumber(value.avatarSize, 96, 180, "avatar size")),
    fontFamily: ["arial", "yanone"].includes(value.fontFamily) ? value.fontFamily : "arial",
    musicUrl: validateMediaUrl(value.musicUrl, "music URL"),
    musicVolume: clampNumber(value.musicVolume, 0, 0.3, "music volume"),
  };

  if (
    !isHexColor(settings.backgroundColor) ||
    !isHexColor(settings.accentColor) ||
    !isHexColor(settings.cardColor)
  ) {
    throw new TypeError("Invalid color");
  }

  return settings;
}

function getBearerToken(request) {
  const authorization = request.headers.authorization;
  if (typeof authorization !== "string" || !authorization.startsWith("Bearer ")) return null;
  return authorization.slice(7).trim() || null;
}

async function getAdminIdentity(request) {
  const allowedEmail = process.env.SITE_ADMIN_EMAIL?.trim().toLowerCase();
  if (!allowedEmail || !process.env.NEON_AUTH_BASE_URL || !pool) return null;

  const token = getBearerToken(request);
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getJwks());
    const userId = typeof payload.sub === "string" ? payload.sub : "";
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    if (!userId || email !== allowedEmail) return null;

    const verifiedUser = await pool.query(
      `SELECT id::text AS id
       FROM neon_auth."user"
       WHERE id = $1::uuid
         AND lower(email) = $2
         AND "emailVerified" = true
         AND COALESCE(banned, false) = false
       LIMIT 1`,
      [userId, allowedEmail],
    );
    return verifiedUser.rows[0]?.id ?? null;
  } catch {
    return null;
  }

  return null;
}

function sendError(response, status, error) {
  return response.status(status).json({ error });
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "private, no-store, max-age=0");
  response.setHeader("Vary", "Authorization");

  if (request.method !== "GET" && request.method !== "PUT") {
    response.setHeader("Allow", "GET, PUT");
    return sendError(response, 405, "method_not_allowed");
  }

  if (!pool) return sendError(response, 503, "database_not_configured");

  if (request.method === "GET") {
    try {
      const result = await pool.query(
        "SELECT config FROM site_aesthetic_settings WHERE id = $1 LIMIT 1",
        ["site"],
      );
      const settings = result.rows[0]?.config ?? DEFAULT_SETTINGS;
      const userId = await getAdminIdentity(request);

      return response.status(200).json({
        settings,
        adminConfigured: Boolean(process.env.SITE_ADMIN_EMAIL),
        isAdmin: Boolean(userId),
      });
    } catch {
      return sendError(response, 503, "settings_unavailable");
    }
  }

  const userId = await getAdminIdentity(request);
  if (!userId) {
    return sendError(response, process.env.SITE_ADMIN_EMAIL ? 403 : 503, "admin_access_required");
  }

  let settings;
  try {
    const body =
      request.body && typeof request.body === "object"
        ? request.body
        : JSON.parse(String(request.body || "{}"));
    settings = validateSettings(body);
  } catch {
    return sendError(response, 400, "invalid_settings");
  }

  try {
    const result = await pool.query(
      `INSERT INTO site_aesthetic_settings (id, "userId", config)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (id) DO UPDATE
       SET config = EXCLUDED.config, updated_at = now()
       WHERE site_aesthetic_settings."userId" = $2
       RETURNING config`,
      ["site", userId, JSON.stringify(settings)],
    );

    if (result.rowCount !== 1) {
      return sendError(response, 403, "site_owner_mismatch");
    }

    return response.status(200).json({ settings: result.rows[0].config });
  } catch {
    return sendError(response, 503, "settings_unavailable");
  }
}
