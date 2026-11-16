importScripts("utils.js");

// Auto-close: when a tab finishes loading and an older tab already has the
// same URL, close the NEW tab and switch to the original one.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  const { autoClose = false } = await chrome.storage.sync.get("autoClose");
  if (!autoClose) return;

  const key = tabKey(tab);
  if (!key) return;

  const all = await chrome.tabs.query({});
  const original = all.find(t => t.id !== tabId && tabKey(t) === key);
  if (!original) return;

  await chrome.tabs.remove(tabId);
  await chrome.tabs.update(original.id, { active: true });
  await chrome.windows.update(original.windowId, { focused: true });
});

// Badge showing the number of extra duplicate tabs
async function updateBadge() {
  const tabs = await chrome.tabs.query({});
  const extra = findDuplicates(tabs).reduce((n, g) => n + g.tabs.length - 1, 0);
  chrome.action.setBadgeText({ text: extra ? String(extra) : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#e11d48" });
}
chrome.tabs.onUpdated.addListener((id, info) => { if (info.status === "complete") updateBadge(); });
chrome.tabs.onRemoved.addListener(updateBadge);
chrome.tabs.onCreated.addListener(updateBadge);
chrome.storage.onChanged.addListener(updateBadge);
chrome.runtime.onStartup.addListener(updateBadge);
chrome.runtime.onInstalled.addListener(updateBadge);