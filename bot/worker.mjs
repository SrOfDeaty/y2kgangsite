import {
  ActivityType,
  Client,
  Events,
  GatewayIntentBits,
} from "discord.js";
import { Redis } from "@upstash/redis";

const requiredEnvironment = [
  "DISCORD_BOT_TOKEN",
  "DISCORD_GUILD_ID",
  "DISCORD_TARGET_USER_ID",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
];
const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]);

if (missingEnvironment.length > 0) {
  console.error(
    `[discord-presence] Missing configuration: ${missingEnvironment.join(", ")}`,
  );
  process.exit(1);
}

const {
  DISCORD_BOT_TOKEN,
  DISCORD_GUILD_ID,
  DISCORD_TARGET_USER_ID,
  KV_REST_API_URL,
  KV_REST_API_TOKEN,
} = process.env;
const keyPrefix = `discord:${DISCORD_GUILD_ID}:${DISCORD_TARGET_USER_ID}`;
const redis = new Redis({
  url: KV_REST_API_URL,
  token: KV_REST_API_TOKEN,
});
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});

async function refreshHeartbeat() {
  await redis.set(`${keyPrefix}:heartbeat`, Date.now().toString(), { ex: 90 });
}

async function savePresence(presence) {
  if (
    presence.guild?.id !== DISCORD_GUILD_ID ||
    presence.userId !== DISCORD_TARGET_USER_ID
  ) {
    return;
  }

  const user = presence.user ?? presence.member?.user;
  const spotifyActivity = presence.activities.find(
    (activity) =>
      activity.type === ActivityType.Listening && activity.name === "Spotify",
  );
  const spotifyImageKey = spotifyActivity?.assets?.largeImage;
  const spotifyImageId =
    typeof spotifyImageKey === "string" && spotifyImageKey.startsWith("spotify:")
      ? spotifyImageKey.slice("spotify:".length)
      : null;
  const spotifyCoverUrl =
    spotifyImageId && /^[a-zA-Z0-9]+$/.test(spotifyImageId)
      ? `https://i.scdn.co/image/${spotifyImageId}`
      : null;
  const payload = {
    userId: presence.userId,
    username: user?.username ?? null,
    displayName:
      presence.member?.displayName ?? user?.globalName ?? user?.username ?? null,
    avatarUrl: user?.displayAvatarURL({ extension: "png", size: 256 }) ?? null,
    status: presence.status ?? "offline",
    activity: spotifyActivity
      ? {
          title: spotifyActivity.details ?? null,
          artist: spotifyActivity.state ?? null,
          album: spotifyActivity.assets?.largeText ?? null,
          coverUrl: spotifyCoverUrl,
        }
      : null,
    updatedAt: new Date().toISOString(),
  };

  try {
    await redis.set(`${keyPrefix}:presence`, JSON.stringify(payload));
    await refreshHeartbeat();
  } catch {
    console.error("[discord-presence] Could not save presence to Redis");
  }
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log("[discord-presence] Discord Gateway connected");

  try {
    await redis.del(`${keyPrefix}:presence`);
    await refreshHeartbeat();
    const guild = readyClient.guilds.cache.get(DISCORD_GUILD_ID);
    const member = guild?.members.cache.get(DISCORD_TARGET_USER_ID);

    if (member?.presence) {
      await savePresence(member.presence);
    }
  } catch {
    console.error("[discord-presence] Initial presence sync failed");
  }
});

client.on(Events.PresenceUpdate, (_oldPresence, newPresence) => {
  void savePresence(newPresence);
});

client.on(Events.ShardDisconnect, () => {
  console.warn("[discord-presence] Discord Gateway disconnected");
});

client.on(Events.Error, () => {
  console.error("[discord-presence] Discord client error");
});

const heartbeatTimer = setInterval(() => {
  if (client.isReady()) {
    void refreshHeartbeat().catch(() => {
      console.error("[discord-presence] Heartbeat update failed");
    });
  }
}, 30_000);
heartbeatTimer.unref();

function shutdown() {
  clearInterval(heartbeatTimer);
  client.destroy();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

client.login(DISCORD_BOT_TOKEN).catch(() => {
  console.error("[discord-presence] Discord Gateway login failed");
  process.exit(1);
});
