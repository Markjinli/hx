import {
  InviteLinkError,
  createInviteUrl,
  formatWeddingDate,
  inviteFromHash,
  normalizeInvite,
  splitWeddingDate,
} from "./invite-codec.js";

const ORIGINAL_TITLE = "合禧请帖｜生成属于你们的婚礼 H5";
const DEFAULT_MESSAGE = "诚邀您见证我们的幸福时刻，期待与您分享这份喜悦。";

const builderView = document.querySelector("#builder-view");
const inviteView = document.querySelector("#invite-view");
const errorView = document.querySelector("#error-view");
const form = document.querySelector("#invite-form");
const formError = document.querySelector("#form-error");
const messageInput = document.querySelector("#message");
const messageCount = document.querySelector("#message-count");
const inviteStage = document.querySelector("#invite-stage");
const welcomePage = document.querySelector("#welcome-page");
const contentPage = document.querySelector("#content-page");
const toast = document.querySelector("#toast");

let activeInvite = null;
let activePage = "welcome";
let toastTimer = null;
let pointerStart = null;

function byId(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const element = byId(id);
  if (element) element.textContent = value;
}

function setView(view) {
  document.body.dataset.view = view;
  builderView.hidden = view !== "builder";
  inviteView.hidden = view !== "invite";
  errorView.hidden = view !== "error";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function valuesFromForm() {
  const fields = new FormData(form);
  return normalizeInvite({
    personA: fields.get("personA"),
    personB: fields.get("personB"),
    date: fields.get("date"),
    time: fields.get("time"),
    venue: fields.get("venue"),
    address: fields.get("address"),
    message: fields.get("message") || DEFAULT_MESSAGE,
  });
}

function showFormError(message) {
  formError.textContent = message;
  formError.hidden = false;
  formError.scrollIntoView({ block: "center", behavior: "smooth" });
}

function clearFormError() {
  formError.textContent = "";
  formError.hidden = true;
}

function showBuilder() {
  activeInvite = null;
  activePage = "welcome";
  document.title = ORIGINAL_TITLE;
  setView("builder");
  window.scrollTo({ top: 0, behavior: "instant" });
}

function setPage(page, { focus = true } = {}) {
  if (!activeInvite || (page !== "welcome" && page !== "content")) return;
  activePage = page;
  inviteStage.dataset.page = page;

  const showingWelcome = page === "welcome";
  welcomePage.setAttribute("aria-hidden", String(!showingWelcome));
  contentPage.setAttribute("aria-hidden", String(showingWelcome));
  welcomePage.inert = !showingWelcome;
  contentPage.inert = showingWelcome;
  if (showingWelcome) welcomePage.scrollTop = 0;
  else contentPage.scrollTop = 0;

  document.querySelectorAll("[data-page-target]").forEach((dot) => {
    const selected = dot.dataset.pageTarget === page;
    dot.classList.toggle("active", selected);
    if (selected) dot.setAttribute("aria-current", "page");
    else dot.removeAttribute("aria-current");
  });

  if (focus) {
    window.setTimeout(() => {
      const target = showingWelcome ? byId("welcome-title") : byId("content-title");
      target?.setAttribute("tabindex", "-1");
      target?.focus({ preventScroll: true });
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 540);
  }
}

function populateInvite(invite) {
  const dateParts = splitWeddingDate(invite.date);
  const fullDate = formatWeddingDate(invite.date);
  const message = invite.message || DEFAULT_MESSAGE;

  setText("welcome-person-a", invite.personA);
  setText("welcome-person-b", invite.personB);
  setText("welcome-date", fullDate);
  setText("content-person-a", invite.personA);
  setText("content-person-b", invite.personB);
  setText("content-message", message);
  setText("date-year", dateParts.year);
  setText("date-month", dateParts.month);
  setText("date-day", dateParts.day);
  setText("date-full", fullDate);
  setText("content-time", invite.time || "恭候光临");
  setText("content-venue", invite.venue);
  setText("content-address", invite.address);

  byId("time-detail").hidden = !invite.time;
  byId("content-address").hidden = !invite.address;
}

function showInvite(invite) {
  activeInvite = invite;
  populateInvite(invite);
  document.title = `${invite.personA}与${invite.personB}的婚礼请帖｜合禧`;
  setView("invite");
  setPage("welcome", { focus: false });
}

function showLinkError(error) {
  activeInvite = null;
  document.title = `请帖链接错误｜合禧`;
  setText("link-error-message", error instanceof Error ? error.message : "专属链接无法识别。");
  setView("error");
}

function handleLocation() {
  if (!window.location.hash) {
    showBuilder();
    return;
  }
  try {
    const invite = inviteFromHash(window.location.hash);
    if (!invite) {
      showBuilder();
      return;
    }
    showInvite(invite);
  } catch (error) {
    showLinkError(error);
  }
}

function rootUrl() {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  return url.href;
}

function returnToBuilder() {
  window.history.pushState(null, "", rootUrl());
  showBuilder();
}

async function copyText(value) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.className = "clipboard-fallback";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("copy failed");
}

function currentShareUrl() {
  if (!activeInvite) throw new InviteLinkError("当前没有可分享的请帖。", "NO_ACTIVE_INVITE");
  return createInviteUrl(window.location.href, activeInvite);
}

async function copyInviteLink() {
  try {
    await copyText(currentShareUrl());
    showToast("专属链接已复制；来宾打开后会从欢迎封面开始");
  } catch {
    showToast("复制没有成功，请从浏览器地址栏复制完整网址");
  }
}

async function shareInvite() {
  if (!activeInvite) return;
  const shareData = {
    title: `${activeInvite.personA}与${activeInvite.personB}的婚礼请帖`,
    text: `诚邀您见证${activeInvite.personA}与${activeInvite.personB}的幸福时刻`,
    url: currentShareUrl(),
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      showToast("分享面板已打开");
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }

  try {
    await copyText(shareData.url);
    showToast("链接已复制，也可以点击微信右上角 ··· 发送给朋友");
  } catch {
    showToast("请从浏览器地址栏复制完整网址后分享");
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearFormError();

  if (!form.checkValidity()) {
    form.reportValidity();
    const firstInvalid = form.querySelector(":invalid");
    firstInvalid?.focus();
    return;
  }

  try {
    const invite = valuesFromForm();
    const shareUrl = createInviteUrl(window.location.href, invite);
    window.location.hash = new URL(shareUrl).hash.slice(1);
  } catch (error) {
    showFormError(error instanceof Error ? error.message : "生成失败，请检查填写内容。");
  }
});

messageInput.addEventListener("input", () => {
  messageCount.value = String(Array.from(messageInput.value).length);
});

byId("open-invite").addEventListener("click", () => setPage("content"));
byId("back-to-cover").addEventListener("click", () => setPage("welcome"));
byId("content-share-top").addEventListener("click", shareInvite);
byId("share-invite").addEventListener("click", shareInvite);
byId("copy-link").addEventListener("click", copyInviteLink);
byId("make-mine").addEventListener("click", returnToBuilder);
byId("return-builder").addEventListener("click", returnToBuilder);

document.querySelectorAll("[data-page-target]").forEach((button) => {
  button.addEventListener("click", () => setPage(button.dataset.pageTarget));
});

inviteStage.addEventListener("pointerdown", (event) => {
  pointerStart = { x: event.clientX, y: event.clientY };
});

inviteStage.addEventListener("pointerup", (event) => {
  if (!pointerStart) return;
  const deltaX = event.clientX - pointerStart.x;
  const deltaY = event.clientY - pointerStart.y;
  pointerStart = null;
  if (Math.abs(deltaY) < 58 || Math.abs(deltaY) < Math.abs(deltaX) * 0.75) return;
  if (activePage === "welcome" && deltaY < 0) setPage("content");
  if (activePage === "content" && deltaY > 0 && contentPage.scrollTop <= 2) setPage("welcome");
});

window.addEventListener("keydown", (event) => {
  if (document.body.dataset.view !== "invite") return;
  if ((event.key === "ArrowDown" || event.key === "PageDown") && activePage === "welcome") {
    event.preventDefault();
    setPage("content");
  }
  if ((event.key === "ArrowUp" || event.key === "PageUp" || event.key === "Escape") && activePage === "content") {
    event.preventDefault();
    setPage("welcome");
  }
});

window.addEventListener("hashchange", handleLocation);
window.addEventListener("popstate", handleLocation);

handleLocation();
