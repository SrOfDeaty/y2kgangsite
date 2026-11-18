import { createRemoteJWKSet, jwtVerify } from "jose";
import { put } from "@vercel/blob";
import { Pool } from "pg";
import Busboy from "busboy";
import { randomUUID } from "node:crypto";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, max: 2 }) : null;
const MIME_TYPES = new Set([
  "image/png", "image/jpeg", "image/gif", "image/webp",
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/ogg", "audio/mp4", "audio/aac",
]);
let jwks;

async function isAdmin(request) {
  const allowedEmail = process.env.SITE_ADMIN_EMAIL?.trim().toLowerCase();
  const authBaseUrl = process.env.NEON_AUTH_BASE_URL;
  const token = request.headers.authorization?.startsWith("Bearer ")
    ? request.headers.authorization.slice(7).trim()
    : "";
  if (!allowedEmail || !authBaseUrl || !token || !pool) return false;

  try {
    const baseUrl = authBaseUrl.endsWith("/") ? authBaseUrl : `${authBaseUrl}/`;
    jwks ??= createRemoteJWKSet(new URL(".well-known/jwks.json", baseUrl));
    const { payload } = await jwtVerify(token, jwks);
    if (typeof payload.sub !== "string" || typeof payload.email !== "string" ||
        payload.email.trim().toLowerCase() !== allowedEmail) return false;
    const verifiedUser = await pool.query(
      `SELECT 1 FROM neon_auth."user"
       WHERE id = $1::uuid AND lower(email) = $2
         AND "emailVerified" = true AND COALESCE(banned, false) = false
       LIMIT 1`,
      [payload.sub, allowedEmail],
    );
    return verifiedUser.rowCount === 1;
  } catch {
    return false;
  }
}

function readUpload(request) {
  return new Promise((resolve, reject) => {
    let fileResult;
    let failure;
    let settled = false;
    const parser = Busboy({ headers: request.headers, limits: { files: 1, fileSize: MAX_FILE_SIZE } });
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      error ? reject(error) : resolve(result);
    };

    parser.on("file", (fieldName, stream, info) => {
      if (fieldName !== "file") {
        stream.resume();
        return;
      }
      const chunks = [];
      let size = 0;
      stream.on("data", (chunk) => {
        size += chunk.length;
        chunks.push(chunk);
      });
      stream.on("limit", () => { failure = new Error("file_too_large"); });
      stream.on("end", () => {
        if (!MIME_TYPES.has(info.mimeType)) failure = new Error("unsupported_file_type");
        else if (!failure) fileResult = { buffer: Buffer.concat(chunks), filename: info.filename, mimeType: info.mimeType, size };
      });
    });
    parser.on("filesLimit", () => { failure = new Error("too_many_files"); });
    parser.on("error", (error) => finish(error));
    parser.on("close", () => finish(failure || (!fileResult ? new Error("file_required") : null), fileResult));
    request.pipe(parser);
  });
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "method_not_allowed" });
  }
  if (!(await isAdmin(request))) return response.status(403).json({ error: "admin_access_required" });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return response.status(503).json({ error: "blob_not_configured" });

  try {
    const file = await readUpload(request);
    const extension = file.filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const blob = await put(`site-media/${randomUUID()}.${extension}`, file.buffer, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.mimeType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return response.status(201).json({ url: blob.url, size: file.size });
  } catch (error) {
    const status = error.message === "file_too_large" ? 413 :
      ["unsupported_file_type", "too_many_files", "file_required"].includes(error.message) ? 400 : 500;
    return response.status(status).json({ error: status === 500 ? "upload_failed" : error.message });
  }
}
