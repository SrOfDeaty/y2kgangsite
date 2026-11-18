import { createRemoteJWKSet, jwtVerify } from "jose";
import { put } from "@vercel/blob";
import { Pool } from "pg";
import Busboy from "busboy";
import { randomUUID } from "node:crypto";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, max: 2 }) : null;
const AUDIO_MIME_TYPES = new Set([
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/ogg", "audio/mp4", "audio/aac",
]);
const IMAGE_EXTENSIONS = new Set([
  "avif", "bmp", "gif", "heic", "heif", "ico", "jfif", "jpe", "jpeg", "jpg",
  "jxl", "png", "svg", "tif", "tiff", "webp",
]);
const IMAGE_MIME_BY_EXTENSION = {
  avif: "image/avif", bmp: "image/bmp", gif: "image/gif", heic: "image/heic", heif: "image/heif",
  ico: "image/x-icon", jfif: "image/jpeg", jpe: "image/jpeg", jpeg: "image/jpeg",
  jpg: "image/jpeg", jxl: "image/jxl", png: "image/png", svg: "image/svg+xml",
  tif: "image/tiff", tiff: "image/tiff", webp: "image/webp",
};

function isSupportedFile(mimeType, filename) {
  if (mimeType.startsWith("image/") || AUDIO_MIME_TYPES.has(mimeType)) return true;
  const extension = filename.split(".").pop()?.toLowerCase();
  return (!mimeType || mimeType === "application/octet-stream") && IMAGE_EXTENSIONS.has(extension);
}
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
        if (!isSupportedFile(info.mimeType, info.filename)) failure = new Error("unsupported_file_type");
        else if (!failure) {
          const extension = info.filename.split(".").pop()?.toLowerCase();
          const mimeType = (!info.mimeType || info.mimeType === "application/octet-stream")
            ? IMAGE_MIME_BY_EXTENSION[extension] || info.mimeType || "application/octet-stream"
            : info.mimeType;
          fileResult = { buffer: Buffer.concat(chunks), filename: info.filename, mimeType, size };
        }
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
