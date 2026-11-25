import { createRemoteJWKSet, jwtVerify } from "jose";
import { Pool } from "pg";

const DEFAULT_SETTINGS = {
  palette: "basalto",
  backgroundColor: "#000001",
  accentColor: "#c7c7c7",
  cardColor: "#17171a",
  cardOpacity: 0.78,
  cardFillStyle: "solid",
  cardGradientStart: "#17171a",
  cardGradientEnd: "#3a1a26",
  cardGradientDirection: "to bottom right",
  cardGifUrl: "",
  backgroundImage: "/mwa-monochrome-collage.png",
  backgroundShade: 0.16,
  backgroundBlur: 1.2,
  referenceStyleEnabled: true,
  backgroundTextureEnabled: true,
  backgroundGrayscaleEnabled: true,
  backgroundMotionEnabled: true,
  floatingGlyphsEnabled: true,
  profileCardEnabled: false,
  profileBadgesEnabled: false,
  socialLinksEnabled: true,
  discordPresenceEnabled: true,
  cardWidth: 320,
  cardHeight: 620,
  cardPositionX: 50,
  cardPositionY: 50,
  cardRadius: 50,
  avatarSize: 120,
  avatarRadius: 18,
  socialIcons: [
    { href: "https://www.instagram.com/vinocasof/", image: "imagem_2024-03-06_162937509-removebg-preview.png", x: 0, y: 0 },
    { href: "https://open.spotify.com/user/31625fveyimletebkwekjkgmzz3y/", image: "image.png", x: 0, y: 0 },
    { href: "https://www.tiktok.com/@vinocasof", image: "imagem_2024-03-06_163201394-removebg-preview.png", x: 0, y: 0 },
  ],
  fontFamily: "arial",
  customFontFamily: "",
  customFontUrl: "",
  profileNameOverride: "",
  profileUsernameOverride: "",
  presenceNameOverride: "",
  presenceNoteOverride: "",
  profileNameSize: 32,
  profileUsernameSize: 14,
  presenceNameSize: 14,
  presenceBodySize: 12,
  profileNameX: 0,
  profileNameY: 0,
  profileUsernameX: 0,
  profileUsernameY: 0,
  presenceTextX: 0,
  presenceTextY: 0,
  siteEffect: "none",
  entryOverlayEnabled: true,
  entryOverlayTitle: "Y2KGANG",
  entryOverlayMessage: "click here",
  entryOverlayHint: "TOQUE OU CLIQUE PARA ENTRAR",
  entryOverlayOpacity: 0.52,
  musicPlayerEnabled: true,
  musicTitle: "Wanna Be",
  musicArtist: "Lil Peep",
  musicCoverUrl: "/mwa-music-cover.png",
  visitorCounterEnabled: true,
  visitorCounterLabel: "VISITAS",
  cursorStyle: "default",
  cursorImageUrl: "",
  presencePositionMode: "inline",
  presenceX: 50,
  presenceY: 50,
  presenceWidth: 360,
  presenceHeight: 112,
  presenceBackground: "#17171d",
  presenceTextColor: "#f5f5f7",
  presenceBorderColor: "#ffffff",
  presenceOpacity: 0.82,
  presenceRadius: 24,
  presenceBorderWidth: 1,
  presencePadding: 12,
  presenceAvatarSize: 32,
  presenceCoverSize: 88,
  presenceBlur: 18,
  presenceBackgroundImage: "",
  musicUrl: "/lil-peep-wanna-be-lyrics_1T09YWa6.mp3",
  musicVolume: 0.08,
};

const SITE_EFFECTS = new Set(["none", "snow", "rain", "glitch"]);
const CURSOR_STYLES = new Set(["default", "crosshair", "pointer", "text", "wait"]);
const GRADIENT_DIRECTIONS = new Set([
  "to right",
  "to bottom right",
  "to bottom",
  "to bottom left",
  "to left",
  "to top left",
  "to top",
  "to top right",
]);

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

function validateBoolean(value, fallback, name) {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "boolean") throw new TypeError(`Invalid ${name}`);
  return value;
}

function validateText(value, fallback, maximumLength, name) {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string") throw new TypeError(`Invalid ${name}`);
  return value.trim().slice(0, maximumLength);
}

function validateMediaUrl(value, name) {
  if (typeof value !== "string" || value.length > 2048) {
    throw new TypeError(`Invalid ${name}`);
  }
  if (!value) return "";

  const localOrigin = "https://site-settings.invalid";
  const isAbsoluteHttpsUrl = /^https:\/\//i.test(value);
  let url;
  try {
    url = new URL(value, `${localOrigin}/`);
  } catch {
    throw new TypeError(`Invalid ${name}`);
  }

  if (
    url.protocol !== "https:" ||
    (url.origin !== localOrigin && !isAbsoluteHttpsUrl)
  ) {
    throw new TypeError(`Invalid ${name}`);
  }

  return url.origin === localOrigin
    ? `${url.pathname}${url.search}${url.hash}`
    : url.href;
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
    cardFillStyle: ["solid", "gradient"].includes(value.cardFillStyle) ? value.cardFillStyle : "solid",
    cardGradientStart: value.cardGradientStart ?? DEFAULT_SETTINGS.cardGradientStart,
    cardGradientEnd: value.cardGradientEnd ?? DEFAULT_SETTINGS.cardGradientEnd,
    cardGradientDirection: GRADIENT_DIRECTIONS.has(value.cardGradientDirection)
      ? value.cardGradientDirection
      : DEFAULT_SETTINGS.cardGradientDirection,
    cardGifUrl: validateMediaUrl(value.cardGifUrl ?? "", "card GIF URL"),
    backgroundImage: validateMediaUrl(value.backgroundImage, "background image"),
    backgroundShade: clampNumber(value.backgroundShade, 0, 0.65, "background shade"),
    backgroundBlur: clampNumber(value.backgroundBlur ?? DEFAULT_SETTINGS.backgroundBlur, 0, 8, "background blur"),
    referenceStyleEnabled: validateBoolean(value.referenceStyleEnabled, DEFAULT_SETTINGS.referenceStyleEnabled, "reference style"),
    backgroundTextureEnabled: validateBoolean(value.backgroundTextureEnabled, DEFAULT_SETTINGS.backgroundTextureEnabled, "background texture"),
    backgroundGrayscaleEnabled: validateBoolean(value.backgroundGrayscaleEnabled, DEFAULT_SETTINGS.backgroundGrayscaleEnabled, "background grayscale"),
    backgroundMotionEnabled: validateBoolean(value.backgroundMotionEnabled, DEFAULT_SETTINGS.backgroundMotionEnabled, "background motion"),
    floatingGlyphsEnabled: validateBoolean(value.floatingGlyphsEnabled, DEFAULT_SETTINGS.floatingGlyphsEnabled, "floating glyphs"),
    profileCardEnabled: validateBoolean(value.profileCardEnabled, DEFAULT_SETTINGS.profileCardEnabled, "profile card"),
    profileBadgesEnabled: validateBoolean(value.profileBadgesEnabled, DEFAULT_SETTINGS.profileBadgesEnabled, "profile badges"),
    socialLinksEnabled: validateBoolean(value.socialLinksEnabled, DEFAULT_SETTINGS.socialLinksEnabled, "social links"),
    discordPresenceEnabled: validateBoolean(value.discordPresenceEnabled, DEFAULT_SETTINGS.discordPresenceEnabled, "Discord presence"),
    cardWidth: Math.round(clampNumber(value.cardWidth, 260, 420, "card width")),
    cardHeight: Math.round(clampNumber(value.cardHeight ?? DEFAULT_SETTINGS.cardHeight, 360, 760, "card height")),
    cardPositionX: clampNumber(value.cardPositionX ?? DEFAULT_SETTINGS.cardPositionX, 0, 100, "card horizontal position"),
    cardPositionY: clampNumber(value.cardPositionY ?? DEFAULT_SETTINGS.cardPositionY, 0, 100, "card vertical position"),
    cardRadius: Math.round(clampNumber(value.cardRadius, 0, 64, "card radius")),
    avatarSize: Math.round(clampNumber(value.avatarSize, 96, 180, "avatar size")),
    avatarRadius: Math.round(clampNumber(value.avatarRadius ?? DEFAULT_SETTINGS.avatarRadius, 0, 50, "avatar radius")),
    socialIcons: (() => {
      const icons = value.socialIcons ?? DEFAULT_SETTINGS.socialIcons;
      if (!Array.isArray(icons) || icons.length !== DEFAULT_SETTINGS.socialIcons.length) {
        throw new TypeError("Invalid social icons");
      }
      return icons.map((icon, index) => {
      if (!icon || typeof icon !== "object") throw new TypeError(`Invalid social icon ${index}`);
      return {
        href: validateMediaUrl(icon.href ?? "", `social icon ${index} link`),
        image: validateMediaUrl(icon.image ?? "", `social icon ${index} image`),
        x: Math.round(clampNumber(icon.x ?? 0, -120, 120, `social icon ${index} horizontal position`)),
        y: Math.round(clampNumber(icon.y ?? 0, -120, 120, `social icon ${index} vertical position`)),
      };
      });
    })(),
    fontFamily: ["arial", "yanone", "custom"].includes(value.fontFamily) ? value.fontFamily : "arial",
    customFontFamily: typeof value.customFontFamily === "string"
      ? value.customFontFamily.replace(/[^a-zA-Z0-9 _-]/g, "").slice(0, 80)
      : "",
    customFontUrl: validateMediaUrl(value.customFontUrl ?? "", "custom font URL"),
    profileNameOverride: typeof value.profileNameOverride === "string" ? value.profileNameOverride.slice(0, 80) : "",
    profileUsernameOverride: typeof value.profileUsernameOverride === "string" ? value.profileUsernameOverride.slice(0, 80) : "",
    presenceNameOverride: typeof value.presenceNameOverride === "string" ? value.presenceNameOverride.slice(0, 80) : "",
    presenceNoteOverride: typeof value.presenceNoteOverride === "string" ? value.presenceNoteOverride.slice(0, 160) : "",
    profileNameSize: clampNumber(value.profileNameSize ?? DEFAULT_SETTINGS.profileNameSize, 10, 48, "profile name size"),
    profileUsernameSize: clampNumber(value.profileUsernameSize ?? DEFAULT_SETTINGS.profileUsernameSize, 8, 36, "profile username size"),
    presenceNameSize: clampNumber(value.presenceNameSize ?? DEFAULT_SETTINGS.presenceNameSize, 8, 48, "presence name size"),
    presenceBodySize: clampNumber(value.presenceBodySize ?? DEFAULT_SETTINGS.presenceBodySize, 8, 48, "presence text size"),
    profileNameX: clampNumber(value.profileNameX ?? 0, -60, 60, "profile name horizontal position"),
    profileNameY: clampNumber(value.profileNameY ?? 0, -60, 60, "profile name vertical position"),
    profileUsernameX: clampNumber(value.profileUsernameX ?? 0, -60, 60, "profile username horizontal position"),
    profileUsernameY: clampNumber(value.profileUsernameY ?? 0, -60, 60, "profile username vertical position"),
    presenceTextX: clampNumber(value.presenceTextX ?? 0, -80, 80, "presence text horizontal position"),
    presenceTextY: clampNumber(value.presenceTextY ?? 0, -60, 60, "presence text vertical position"),
    siteEffect: SITE_EFFECTS.has(value.siteEffect) ? value.siteEffect : "none",
    entryOverlayEnabled: validateBoolean(value.entryOverlayEnabled, DEFAULT_SETTINGS.entryOverlayEnabled, "entry overlay"),
    entryOverlayTitle: validateText(value.entryOverlayTitle, DEFAULT_SETTINGS.entryOverlayTitle, 50, "overlay title"),
    entryOverlayMessage: validateText(value.entryOverlayMessage, DEFAULT_SETTINGS.entryOverlayMessage, 80, "overlay message"),
    entryOverlayHint: validateText(value.entryOverlayHint, DEFAULT_SETTINGS.entryOverlayHint, 120, "overlay hint"),
    entryOverlayOpacity: clampNumber(value.entryOverlayOpacity ?? DEFAULT_SETTINGS.entryOverlayOpacity, 0.15, 1, "overlay opacity"),
    musicPlayerEnabled: validateBoolean(value.musicPlayerEnabled, DEFAULT_SETTINGS.musicPlayerEnabled, "music player"),
    musicTitle: validateText(value.musicTitle, DEFAULT_SETTINGS.musicTitle, 100, "music title"),
    musicArtist: validateText(value.musicArtist, DEFAULT_SETTINGS.musicArtist, 100, "music artist"),
    musicCoverUrl: validateMediaUrl(value.musicCoverUrl ?? DEFAULT_SETTINGS.musicCoverUrl, "music cover URL"),
    visitorCounterEnabled: validateBoolean(value.visitorCounterEnabled, DEFAULT_SETTINGS.visitorCounterEnabled, "visitor counter"),
    visitorCounterLabel: validateText(value.visitorCounterLabel, DEFAULT_SETTINGS.visitorCounterLabel, 32, "visitor counter label"),
    cursorStyle: ["custom", ...CURSOR_STYLES].includes(value.cursorStyle) ? value.cursorStyle : "default",
    cursorImageUrl: validateMediaUrl(value.cursorImageUrl ?? "", "cursor image URL"),
    presencePositionMode: ["inline", "floating"].includes(value.presencePositionMode)
      ? value.presencePositionMode
      : DEFAULT_SETTINGS.presencePositionMode,
    presenceX: Math.round(clampNumber(value.presenceX ?? DEFAULT_SETTINGS.presenceX, 0, 100, "Discord card horizontal position")),
    presenceY: Math.round(clampNumber(value.presenceY ?? DEFAULT_SETTINGS.presenceY, 0, 100, "Discord card vertical position")),
    presenceWidth: Math.round(clampNumber(value.presenceWidth ?? DEFAULT_SETTINGS.presenceWidth, 240, 520, "Discord card width")),
    presenceHeight: Math.round(clampNumber(value.presenceHeight ?? DEFAULT_SETTINGS.presenceHeight, 90, 320, "Discord card height")),
    presenceBackground: value.presenceBackground ?? DEFAULT_SETTINGS.presenceBackground,
    presenceTextColor: value.presenceTextColor ?? DEFAULT_SETTINGS.presenceTextColor,
    presenceBorderColor: value.presenceBorderColor ?? DEFAULT_SETTINGS.presenceBorderColor,
    presenceOpacity: clampNumber(value.presenceOpacity ?? DEFAULT_SETTINGS.presenceOpacity, 0, 1, "Discord card opacity"),
    presenceRadius: Math.round(clampNumber(value.presenceRadius ?? DEFAULT_SETTINGS.presenceRadius, 0, 48, "Discord card radius")),
    presenceBorderWidth: Math.round(clampNumber(value.presenceBorderWidth ?? DEFAULT_SETTINGS.presenceBorderWidth, 0, 8, "Discord card border width")),
    presencePadding: Math.round(clampNumber(value.presencePadding ?? DEFAULT_SETTINGS.presencePadding, 6, 32, "Discord card padding")),
    presenceAvatarSize: Math.round(clampNumber(value.presenceAvatarSize ?? DEFAULT_SETTINGS.presenceAvatarSize, 32, 96, "Discord avatar size")),
    presenceCoverSize: Math.round(clampNumber(value.presenceCoverSize ?? DEFAULT_SETTINGS.presenceCoverSize, 48, 112, "Discord track cover size")),
    presenceBlur: Math.round(clampNumber(value.presenceBlur ?? DEFAULT_SETTINGS.presenceBlur, 0, 32, "Discord card blur")),
    presenceBackgroundImage: validateMediaUrl(value.presenceBackgroundImage ?? "", "Discord card background image"),
    musicUrl: validateMediaUrl(value.musicUrl, "music URL"),
    musicVolume: clampNumber(value.musicVolume, 0, 0.3, "music volume"),
  };

  if (settings.customFontUrl) {
    const fontUrl = new URL(settings.customFontUrl);
    if (fontUrl.protocol !== "https:" || fontUrl.hostname !== "fonts.googleapis.com") {
      throw new TypeError("Invalid custom font URL");
    }
  }

  if (
    !isHexColor(settings.backgroundColor) ||
    !isHexColor(settings.accentColor) ||
    !isHexColor(settings.cardColor) ||
    !isHexColor(settings.cardGradientStart) ||
    !isHexColor(settings.cardGradientEnd) ||
    !isHexColor(settings.presenceBackground) ||
    !isHexColor(settings.presenceTextColor) ||
    !isHexColor(settings.presenceBorderColor)
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
      const settings = { ...DEFAULT_SETTINGS, ...(result.rows[0]?.config ?? {}) };
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
