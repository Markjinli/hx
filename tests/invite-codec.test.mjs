import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  InviteLinkError,
  createInviteUrl,
  crc32,
  decodeInvite,
  encodeInvite,
  formatWeddingDate,
  inviteFromHash,
  normalizeInvite,
} from "../invite-codec.js";

const fixture = {
  personA: "林知夏",
  personB: "周亦安 💐",
  date: "2026-10-18",
  time: "18:18",
  venue: "嘉悦宴会艺术中心",
  address: "湖畔路 88 号 · 云锦厅",
  message: "一纸婚书，两姓之好。诚邀您见证我们的幸福时刻！",
};

test("round-trips Chinese, emoji and punctuation through a versioned token", () => {
  const encoded = encodeInvite(fixture);
  assert.match(encoded, /^v1\.[A-Za-z0-9_-]+\.[0-9a-f]{8}$/);
  assert.deepEqual(decodeInvite(encoded), fixture);
});

test("uses the standard CRC-32 test vector", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")).toString(16), "cbf43926");
});

test("creates a project-path-safe URL, drops queries, and restores from hash", () => {
  const url = createInviteUrl("https://markjinli.github.io/hexi-wedding-invitation/?source=test#old", fixture);
  const parsed = new URL(url);
  assert.equal(parsed.origin, "https://markjinli.github.io");
  assert.equal(parsed.pathname, "/hexi-wedding-invitation/");
  assert.equal(parsed.search, "");
  assert.match(parsed.hash, /^#i=v1\./);
  assert.deepEqual(inviteFromHash(parsed.hash), fixture);
  assert.ok(url.length < 2048);
});

test("rejects missing fields, impossible dates and invalid times", () => {
  assert.throws(() => normalizeInvite({}), (error) => error instanceof InviteLinkError && error.code === "MISSING_FIELDS");
  assert.throws(() => encodeInvite({ ...fixture, date: "2025-02-29" }), /日期格式不正确/);
  assert.throws(() => encodeInvite({ ...fixture, time: "24:00" }), /时间格式不正确/);
  assert.doesNotThrow(() => encodeInvite({ ...fixture, date: "2028-02-29", time: "00:00" }));
});

test("detects truncation, mutation, unknown versions and malformed payloads", () => {
  const encoded = encodeInvite(fixture);
  const mutated = `${encoded.slice(0, 7)}${encoded[7] === "A" ? "B" : "A"}${encoded.slice(8)}`;
  assert.throws(() => decodeInvite(encoded.slice(0, -2)), /格式不完整|缺失|改动/);
  assert.throws(() => decodeInvite(mutated), (error) => error instanceof InviteLinkError && error.code === "CHECKSUM_MISMATCH");
  assert.throws(() => decodeInvite(encoded.replace(/^v1\./, "v2.")), (error) => error instanceof InviteLinkError && error.code === "UNSUPPORTED_VERSION");
  assert.throws(() => decodeInvite("v1.not+base64.00000000"), /格式不完整/);
});

test("cleans control and bidi characters without interpreting markup", () => {
  const cleaned = normalizeInvite({ ...fixture, personA: "<img src=x>\u202e\u0000 林" });
  assert.equal(cleaned.personA, "<img src=x> 林");
});

test("formats dates in local calendar terms", () => {
  assert.match(formatWeddingDate("2026-10-18"), /^2026年10月18日 · 星期/);
});

test("the published surface is static, relative-path safe, and network-free", async () => {
  const [html, app, css, shareOptions] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8"),
    readFile(new URL("../share-options.js", import.meta.url), "utf8"),
  ]);

  assert.match(html, /<script type="module" src="\.\/app\.js"><\/script>/);
  assert.match(html, /<link rel="stylesheet" href="\.\/styles\.css"/);
  assert.match(html, /id="welcome-page"/);
  assert.match(html, /id="content-page"/);
  assert.match(html, /icons\/double-happiness\.jpg/);
  assert.match(html, /name="shareIcon"/);
  assert.match(html, /name="shareCopy"/);
  assert.doesNotMatch(`${html}\n${app}\n${css}\n${shareOptions}`, /fetch\(|XMLHttpRequest|https?:\/\/(?!markjinli\.github\.io)/);
  assert.doesNotMatch(app, /innerHTML|localStorage|sessionStorage/);
});
