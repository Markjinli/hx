export const SHARE_ICONS = Object.freeze([
  Object.freeze({
    id: "double-happiness",
    label: "双喜团子",
    hint: "经典喜气",
    path: "icons/double-happiness.jpg",
    thumbnailPath: "thumbs/a.jpg",
  }),
  Object.freeze({
    id: "sweet-bears",
    label: "甜蜜小熊",
    hint: "温柔可爱",
    path: "icons/sweet-bears.jpg",
    thumbnailPath: "thumbs/b.jpg",
  }),
  Object.freeze({
    id: "love-birds",
    label: "喜鹊成双",
    hint: "雅致成双",
    path: "icons/love-birds.jpg",
    thumbnailPath: "thumbs/c.jpg",
  }),
  Object.freeze({
    id: "happy-envelope",
    label: "喜信到啦",
    hint: "热闹俏皮",
    path: "icons/happy-envelope.jpg",
    thumbnailPath: "thumbs/d.jpg",
  }),
]);

export const SHARE_COPIES = Object.freeze([
  Object.freeze({
    id: "classic",
    label: "专属请帖",
    text: "填写、生成、分享，一条链接就是一份专属婚礼请帖。",
  }),
  Object.freeze({
    id: "witness",
    label: "见证幸福",
    text: "良辰已定，诚邀您见证我们的幸福时刻。",
  }),
  Object.freeze({
    id: "two-families",
    label: "两姓之好",
    text: "一纸婚书，两姓之好，期待与您欢喜相见。",
  }),
  Object.freeze({
    id: "good-day",
    label: "分享好日子",
    text: "我们的好日子，想和重要的您一起分享。",
  }),
]);

export const DEFAULT_SHARE_ICON_ID = SHARE_ICONS[0].id;
export const DEFAULT_SHARE_COPY_ID = SHARE_COPIES[0].id;

// Current one-character generation. Keep this mapping immutable after release;
// rotate to a disjoint set for future crawler-cache resets.
export const SHARE_ROUTE_LETTERS = Object.freeze({
  "double-happiness:classic": "q",
  "double-happiness:witness": "r",
  "double-happiness:two-families": "s",
  "double-happiness:good-day": "t",
  "sweet-bears:classic": "u",
  "sweet-bears:witness": "v",
  "sweet-bears:two-families": "w",
  "sweet-bears:good-day": "x",
  "love-birds:classic": "y",
  "love-birds:witness": "z",
  "love-birds:two-families": "0",
  "love-birds:good-day": "1",
  "happy-envelope:classic": "2",
  "happy-envelope:witness": "3",
  "happy-envelope:two-families": "4",
  "happy-envelope:good-day": "5",
});

// Keep the first one-letter generation published so invitations that were
// already shared continue to open after the cache-busting route rotation.
export const LEGACY_SHARE_ROUTE_LETTERS = Object.freeze({
  "double-happiness:classic": "a",
  "double-happiness:witness": "b",
  "double-happiness:two-families": "c",
  "double-happiness:good-day": "d",
  "sweet-bears:classic": "e",
  "sweet-bears:witness": "f",
  "sweet-bears:two-families": "g",
  "sweet-bears:good-day": "h",
  "love-birds:classic": "i",
  "love-birds:witness": "j",
  "love-birds:two-families": "k",
  "love-birds:good-day": "l",
  "happy-envelope:classic": "m",
  "happy-envelope:witness": "n",
  "happy-envelope:two-families": "o",
  "happy-envelope:good-day": "p",
});

export function shareIconById(id) {
  return SHARE_ICONS.find((option) => option.id === id) ?? SHARE_ICONS[0];
}

export function shareCopyById(id) {
  return SHARE_COPIES.find((option) => option.id === id) ?? SHARE_COPIES[0];
}

export function shareRoutePath(iconId, copyId) {
  const icon = shareIconById(iconId);
  const copy = shareCopyById(copyId);
  return `${SHARE_ROUTE_LETTERS[`${icon.id}:${copy.id}`]}/`;
}

export function legacyShareRoutePath(iconId, copyId) {
  const icon = shareIconById(iconId);
  const copy = shareCopyById(copyId);
  return `${LEGACY_SHARE_ROUTE_LETTERS[`${icon.id}:${copy.id}`]}/`;
}
