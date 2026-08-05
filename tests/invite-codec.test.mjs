import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  InviteLinkError,
  createInviteUrl,
  crc32,
  decodeInvite,
  encodedInviteFromHash,
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

const knownV1Token = "v1.eyJ2IjoxLCJhIjoi5p6X55-l5aSPIiwiYiI6IuWRqOS6puWuiSDwn5KQIiwiZCI6IjIwMjYtMTAtMTgiLCJ0IjoiMTg6MTgiLCJuIjoi5ZiJ5oKm5a605Lya6Im65pyv5Lit5b-DIiwibCI6Iua5lueVlOi3ryA4OCDlj7cgwrcg5LqR6ZSm5Y6FIiwibSI6IuS4gOe6uOWpmuS5pu-8jOS4pOWnk-S5i-WlveOAguivmumCgOaCqOingeivgeaIkeS7rOeahOW5uOemj-aXtuWIu--8gSJ9.c48f6bdd";

function dynamicV1Token(invite) {
  const payload = {
    v: 1,
    a: invite.personA,
    b: invite.personB,
    d: invite.date,
    t: invite.time,
    n: invite.venue,
    l: invite.address,
    m: invite.message,
  };
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const encodedPayload = Buffer.from(bytes).toString("base64url");
  return `v1.${encodedPayload}.${crc32(bytes).toString(16).padStart(8, "0")}`;
}

test("round-trips Chinese, emoji and punctuation through the compact v2 token", () => {
  const encoded = encodeInvite(fixture);
  assert.match(encoded, /^2\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{6}$/);
  const compactPayload = Buffer.from(encoded.split(".")[1], "base64url").toString("utf8").split("\x1f");
  assert.deepEqual(compactPayload.slice(2, 4), ["20261018", "1818"]);
  assert.deepEqual(decodeInvite(encoded), fixture);
  assert.ok(encoded.length <= knownV1Token.length - 25, `${encoded.length} should be clearly shorter than ${knownV1Token.length}`);
});

test("keeps known and dynamically constructed v1 invitation links compatible", () => {
  assert.deepEqual(decodeInvite(knownV1Token), fixture);
  assert.deepEqual(decodeInvite(dynamicV1Token(fixture)), fixture);
});

test("uses the standard CRC-32 test vector", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")).toString(16), "cbf43926");
});

test("creates a project-path-safe URL, drops queries, and restores from hash", () => {
  const url = createInviteUrl("https://markjinli.github.io/hx/?source=test#old", fixture);
  const parsed = new URL(url);
  assert.equal(parsed.origin, "https://markjinli.github.io");
  assert.equal(parsed.pathname, "/hx/");
  assert.equal(parsed.search, "");
  assert.match(parsed.hash, /^#2\./);
  assert.deepEqual(inviteFromHash(parsed.hash), fixture);
  assert.ok(url.length < 2048);
});

test("extracts both bare v2 and legacy i= hashes", () => {
  const v2 = encodeInvite(fixture);
  assert.equal(encodedInviteFromHash(`#${v2}`), v2);
  assert.equal(encodedInviteFromHash(`#i=${knownV1Token}`), knownV1Token);
  assert.deepEqual(inviteFromHash(`#${v2}`), fixture);
  assert.deepEqual(inviteFromHash(`#i=${knownV1Token}`), fixture);
  assert.equal(encodedInviteFromHash("#not-an-invite"), null);
});

test("rejects missing fields, impossible dates and invalid times", () => {
  assert.throws(() => normalizeInvite({}), (error) => error instanceof InviteLinkError && error.code === "MISSING_FIELDS");
  assert.throws(() => encodeInvite({ ...fixture, date: "2025-02-29" }), /日期格式不正确/);
  assert.throws(() => encodeInvite({ ...fixture, time: "24:00" }), /时间格式不正确/);
  assert.doesNotThrow(() => encodeInvite({ ...fixture, date: "2028-02-29", time: "00:00" }));
});

test("detects truncation, mutation, unknown versions and malformed payloads", () => {
  const encoded = encodeInvite(fixture);
  const parts = encoded.split(".");
  const mutatedPayload = `${parts[1][0] === "A" ? "B" : "A"}${parts[1].slice(1)}`;
  const mutated = `${parts[0]}.${mutatedPayload}.${parts[2]}`;
  assert.throws(() => decodeInvite(encoded.slice(0, -2)), /格式不完整|缺失|改动/);
  assert.throws(() => decodeInvite(mutated), (error) => error instanceof InviteLinkError && error.code === "CHECKSUM_MISMATCH");
  assert.throws(() => decodeInvite(encoded.replace(/^2\./, "3.")), (error) => error instanceof InviteLinkError && error.code === "UNSUPPORTED_VERSION");
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
  assert.match(html, /class="share-crawler-image"\s+src="https:\/\/markjinli\.github\.io\/hx\/thumbs\/a\.jpg"/);
  assert.equal(html.indexOf("<img"), html.indexOf('<img\n      class="share-crawler-image"'));
  assert.match(html, /name="shareIcon"/);
  assert.match(html, /name="shareCopy"/);
  assert.doesNotMatch(`${html}\n${app}\n${css}\n${shareOptions}`, /fetch\(|XMLHttpRequest|https?:\/\/(?!markjinli\.github\.io)/);
  assert.doesNotMatch(app, /innerHTML|localStorage|sessionStorage/);
  assert.match(app, /shareRoutePath\(activeShareIcon\.id, activeShareCopy\.id\)/);
});
