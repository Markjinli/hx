import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships a compact self-hosted MP3 and accessible playback control", async () => {
  const [audio, html, app, css] = await Promise.all([
    readFile(new URL("../m.mp3", import.meta.url)),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8"),
  ]);

  const frameOffset = audio.findIndex((byte, index) => byte === 0xff && (audio[index + 1] & 0xe0) === 0xe0);
  assert.ok(frameOffset >= 0 && frameOffset < 4096, "music should contain a valid MP3 frame near the start");
  assert.ok(audio.length > 1_000_000, "music should not be an empty placeholder");
  assert.ok(audio.length < 2_500_000, "music should stay compact for mobile visitors");
  assert.match(html, /<audio[^>]+id="invite-music"[^>]+src="\.\/m\.mp3"[^>]+loop[^>]+preload="metadata"[^>]+playsinline/);
  assert.match(html, /id="music-toggle"[^>]+aria-label="播放背景音乐"/s);
  assert.match(app, /inviteMusic\.volume = 0\.38/);
  assert.match(app, /await inviteMusic\.play\(\)/);
  assert.match(css, /\.music-toggle\.is-playing/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});
