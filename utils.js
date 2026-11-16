// Shared duplicate-detection logic (used by popup and background)

// Duplicates are matched by exact URL (the #hash part is ignored)
function tabKey(tab) {
  const url = tab.url || tab.pendingUrl || "";
  if (!url || /^(chrome|edge|about|chrome-extension|devtools):/i.test(url)) return null;
  try {
    const u = new URL(url);
    u.hash = "";
    return u.href.replace(/\/$/, "");
  } catch (e) {
    return url;
  }
}

// Returns groups: [{ key, tabs: [tab, tab, ...] }] where tabs.length > 1
function findDuplicates(tabs) {
  const map = new Map();
  tabs.forEach(t => {
    const k = tabKey(t);
    if (!k) return;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(t);
  });
  return [...map.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([key, list]) => ({ key, tabs: list }));
}

// Close every duplicate except the first tab of each group
async function closeAllDuplicates() {
  const tabs = await chrome.tabs.query({});
  const groups = findDuplicates(tabs);
  const ids = groups.flatMap(g => g.tabs.slice(1).map(t => t.id));
  if (ids.length) await chrome.tabs.remove(ids);
  return ids.length;
}