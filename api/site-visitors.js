import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { Redis } from "@upstash/redis";

const VISITOR_SET_KEY = "site:unique-visitors:v1";
let redisClient;

// Use Vercel's normalized client IP instead of accepting a spoofable forwarded chain.
function getClientIp(request) {
  const realIp = request.headers["x-real-ip"];
  if (typeof realIp !== "string") return null;
  const normalizedIp = realIp.trim();
  return isIP(normalizedIp) ? normalizedIp : null;
}

function getRedisClient() {
  const { KV_REST_API_URL, KV_REST_API_TOKEN } = process.env;
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) return null;

  redisClient ??= new Redis({ url: KV_REST_API_URL, token: KV_REST_API_TOKEN });
  return redisClient;
}

function hashClientIp(ip) {
  const privateKey = process.env.DATABASE_URL || process.env.KV_REST_API_TOKEN;
  if (!privateKey) return null;

  return createHmac("sha256", privateKey).update(`site-visitor:v1:${ip}`).digest("hex");
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Referrer-Policy", "no-referrer");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "method_not_allowed" });
  }

  const redis = getRedisClient();
  const ip = getClientIp(request);
  const ipHash = ip ? hashClientIp(ip) : null;
  if (!redis || !ipHash) return response.status(503).json({ error: "visitor_counter_unavailable" });

  try {
    await redis.sadd(VISITOR_SET_KEY, ipHash);
    const count = await redis.scard(VISITOR_SET_KEY);
    return response.status(200).json({ count: Number(count) });
  } catch {
    return response.status(503).json({ error: "visitor_counter_unavailable" });
  }
}
