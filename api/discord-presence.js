import { Redis } from "@upstash/redis";

const HEARTBEAT_MAX_AGE_MS = 90_000;

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "public, max-age=0, s-maxage=5, stale-while-revalidate=5");

  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ state: "method_not_allowed" });
  }

  const {
    DISCORD_BOT_TOKEN,
    DISCORD_GUILD_ID,
    DISCORD_TARGET_USER_ID,
    KV_REST_API_URL,
    KV_REST_API_READ_ONLY_TOKEN,
  } = process.env;

  if (
    !DISCORD_BOT_TOKEN ||
    !DISCORD_GUILD_ID ||
    !DISCORD_TARGET_USER_ID ||
    !KV_REST_API_URL ||
    !KV_REST_API_READ_ONLY_TOKEN
  ) {
    return response.status(503).json({ state: "setup_required" });
  }

  try {
    const redis = new Redis({
      url: KV_REST_API_URL,
      token: KV_REST_API_READ_ONLY_TOKEN,
    });
    const keyPrefix = `discord:${DISCORD_GUILD_ID}:${DISCORD_TARGET_USER_ID}`;
    const heartbeat = await redis.get(`${keyPrefix}:heartbeat`);
    const heartbeatTimestamp = Number(heartbeat);

    if (
      !Number.isFinite(heartbeatTimestamp) ||
      Date.now() - heartbeatTimestamp > HEARTBEAT_MAX_AGE_MS
    ) {
      return response.status(503).json({ state: "bot_disconnected" });
    }

    const storedPresence = await redis.get(`${keyPrefix}:presence`);

    if (!storedPresence) {
      return response.status(200).json({ state: "awaiting_presence" });
    }

    const presence =
      typeof storedPresence === "string"
        ? JSON.parse(storedPresence)
        : storedPresence;

    return response.status(200).json({ state: "ready", presence });
  } catch {
    return response.status(503).json({ state: "unavailable" });
  }
}
