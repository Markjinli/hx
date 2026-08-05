/**
 * Versioned, serverless invitation-link protocol.
 *
 * The payload lives in the URL fragment, so GitHub Pages always
 * serves the same index.html and the personal details are not part of the HTTP
 * request. Base64url is transport encoding only; it is deliberately not
 * presented as encryption.
 */

export const INVITE_VERSION = 2;
export const HASH_KEY = "i";
export const MAX_PAYLOAD_BYTES = 1400;
export const MAX_ENCODED_LENGTH = 1900;
export const MAX_SHARE_URL_LENGTH = 2048;

export const FIELD_LIMITS = Object.freeze({
  personA: 20,
  personB: 20,
  date: 10,
  time: 5,
  venue: 40,
  address: 80,
  message: 120,
});

export class InviteLinkError extends Error {
  constructor(message, code = "INVALID_INVITE_LINK") {
    super(message);
    this.name = "InviteLinkError";
    this.code = code;
  }
}

export function cleanText(value, maxLength) {
  const cleaned = String(value ?? "")
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return Array.from(cleaned).slice(0, maxLength).join("");
}

function isRealDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(year, month - 1, day, 12, 0, 0);
  return candidate.getFullYear() === year && candidate.getMonth() === month - 1 && candidate.getDate() === day;
}

function isRealTime(value) {
  if (!value) return true;
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  return Boolean(match && Number(match[1]) < 24 && Number(match[2]) < 60);
}

export function normalizeInvite(input, { requireFields = true } = {}) {
  const invite = {
    personA: cleanText(input?.personA, FIELD_LIMITS.personA),
    personB: cleanText(input?.personB, FIELD_LIMITS.personB),
    date: cleanText(input?.date, FIELD_LIMITS.date),
    time: cleanText(input?.time, FIELD_LIMITS.time),
    venue: cleanText(input?.venue, FIELD_LIMITS.venue),
    address: cleanText(input?.address, FIELD_LIMITS.address),
    message: cleanText(input?.message, FIELD_LIMITS.message),
  };

  if (requireFields && (!invite.personA || !invite.personB || !invite.date || !invite.venue)) {
    throw new InviteLinkError("请填写两位新人姓名、婚礼日期和宴会地点。", "MISSING_FIELDS");
  }
  if (invite.date && !isRealDate(invite.date)) {
    throw new InviteLinkError("婚礼日期格式不正确。", "INVALID_DATE");
  }
  if (!isRealTime(invite.time)) {
    throw new InviteLinkError("开席时间格式不正确。", "INVALID_TIME");
  }

  return invite;
}

function bytesToBase64Url(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new InviteLinkError("专属链接包含无法识别的字符。", "BAD_ENCODING");
  }
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  let binary;
  try {
    binary = atob(padded);
  } catch {
    throw new InviteLinkError("专属链接编码不完整。", "BAD_ENCODING");
  }
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

/** Standard CRC-32 (IEEE 802.3), used only to detect truncated/corrupted links. */
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function crc32Hex(bytes) {
  return crc32(bytes).toString(16).padStart(8, "0");
}

function crc32Base64Url(bytes) {
  const checksum = new Uint8Array(4);
  new DataView(checksum.buffer).setUint32(0, crc32(bytes), false);
  return bytesToBase64Url(checksum);
}

function compactDate(value) {
  return value.replace(/-/g, "");
}

function restoreDate(value) {
  const compact = String(value ?? "");
  return /^\d{8}$/.test(compact)
    ? `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`
    : compact;
}

function compactTime(value) {
  return value.replace(/:/g, "");
}

function restoreTime(value) {
  const compact = String(value ?? "");
  return /^\d{4}$/.test(compact) ? `${compact.slice(0, 2)}:${compact.slice(2, 4)}` : compact;
}

function decodePayloadText(payloadToken, checksum, checksumType) {
  try {
    const bytes = base64UrlToBytes(payloadToken);
    if (bytes.length > MAX_PAYLOAD_BYTES) {
      throw new InviteLinkError("专属链接内容过长。", "PAYLOAD_TOO_LARGE");
    }
    const expectedChecksum = checksumType === "base64url" ? crc32Base64Url(bytes) : crc32Hex(bytes);
    const receivedChecksum = checksumType === "hex" ? checksum.toLowerCase() : checksum;
    if (expectedChecksum !== receivedChecksum) {
      throw new InviteLinkError("专属链接在复制时可能缺失或被改动。", "CHECKSUM_MISMATCH");
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    if (error instanceof InviteLinkError) throw error;
    throw new InviteLinkError("专属链接内容已损坏。", "BAD_PAYLOAD");
  }
}

export function encodeInvite(input) {
  const invite = normalizeInvite(input);
  const compactPayload = [
    invite.personA,
    invite.personB,
    compactDate(invite.date),
    compactTime(invite.time),
    invite.venue,
    invite.address,
    invite.message,
  ].join("\x1f");
  const bytes = new TextEncoder().encode(compactPayload);
  if (bytes.length > MAX_PAYLOAD_BYTES) {
    throw new InviteLinkError("填写的内容过长，请精简地址或邀请寄语。", "PAYLOAD_TOO_LARGE");
  }
  const token = `${INVITE_VERSION}.${bytesToBase64Url(bytes)}.${crc32Base64Url(bytes)}`;
  if (token.length > MAX_ENCODED_LENGTH) {
    throw new InviteLinkError("填写的内容过长，请精简地址或邀请寄语。", "PAYLOAD_TOO_LARGE");
  }
  return token;
}

export function decodeInvite(encoded) {
  if (!encoded || encoded.length > MAX_ENCODED_LENGTH) {
    throw new InviteLinkError("专属链接为空或内容过长。", "BAD_LENGTH");
  }

  const v2Match = /^2\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]{6})$/.exec(encoded);
  if (v2Match) {
    const payload = decodePayloadText(v2Match[1], v2Match[2], "base64url").split("\x1f");
    if (payload.length !== 7) {
      throw new InviteLinkError("专属链接内容已损坏。", "BAD_PAYLOAD");
    }
    return normalizeInvite({
      personA: payload[0],
      personB: payload[1],
      date: restoreDate(payload[2]),
      time: restoreTime(payload[3]),
      venue: payload[4],
      address: payload[5],
      message: payload[6],
    });
  }

  const v1Match = /^v1\.([A-Za-z0-9_-]+)\.([0-9a-f]{8})$/i.exec(encoded);
  if (v1Match) {
    let payload;
    try {
      payload = JSON.parse(decodePayloadText(v1Match[1], v1Match[2], "hex"));
    } catch (error) {
      if (error instanceof InviteLinkError) throw error;
      throw new InviteLinkError("专属链接内容已损坏。", "BAD_PAYLOAD");
    }
    if (!payload || payload.v !== 1) {
      throw new InviteLinkError("这个请帖链接版本暂不受支持。", "UNSUPPORTED_VERSION");
    }
    return normalizeInvite({
      personA: payload.a,
      personB: payload.b,
      date: payload.d,
      time: payload.t,
      venue: payload.n,
      address: payload.l,
      message: payload.m,
    });
  }

  const versionMatch = /^(?:v)?(\d+)\./.exec(encoded);
  if (versionMatch && ![1, INVITE_VERSION].includes(Number(versionMatch[1]))) {
    throw new InviteLinkError("这个请帖链接版本暂不受支持。", "UNSUPPORTED_VERSION");
  }
  throw new InviteLinkError("专属链接格式不完整。", "BAD_TOKEN_FORMAT");
}

export function encodedInviteFromHash(hash) {
  const rawHash = String(hash ?? "").replace(/^#/, "");
  if (!rawHash) return null;
  const params = new URLSearchParams(rawHash);
  const legacyToken = params.get(HASH_KEY);
  if (legacyToken) return legacyToken;
  return /^(?:v)?\d+\./.test(rawHash) ? rawHash : null;
}

export function inviteFromHash(hash) {
  const encoded = encodedInviteFromHash(hash);
  return encoded ? decodeInvite(encoded) : null;
}

export function createInviteUrl(currentUrl, input) {
  const url = new URL(currentUrl);
  url.search = "";
  url.hash = encodeInvite(input);
  if (url.href.length > MAX_SHARE_URL_LENGTH) {
    throw new InviteLinkError("生成的专属链接过长，请精简地址或邀请寄语。", "URL_TOO_LONG");
  }
  return url.href;
}

export function formatWeddingDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match || !isRealDate(value)) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0);
  const weekday = new Intl.DateTimeFormat("zh-CN", { weekday: "long" }).format(date);
  return `${match[1]}年${Number(match[2])}月${Number(match[3])}日 · ${weekday}`;
}

export function splitWeddingDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match || !isRealDate(value)) return { year: "", month: "", day: "" };
  return { year: match[1], month: String(Number(match[2])).padStart(2, "0"), day: String(Number(match[3])).padStart(2, "0") };
}
