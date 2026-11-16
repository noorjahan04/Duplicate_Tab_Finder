const listEl = document.getElementById("list");
const autoEl = document.getElementById("autoClose");

async function render() {
  const tabs = await chrome.tabs.query({});
  const groups = findDuplicates(tabs);
  listEl.innerHTML = "";

  if (!groups.length) {
    listEl.innerHTML = '<div class="empty">✅ No duplicate tabs found</div>';
    return;
  }

  groups.forEach(g => {
    const box = document.createElement("div");
    box.className = "group";

    const head = document.createElement("div");
    head.className = "group-head";
    const title = document.createElement("div");
    title.className = "group-title";
    title.textContent = g.tabs[0].title || g.key;
    const right = document.createElement("div");
    right.innerHTML = `<span class="badge">${g.tabs.length} tabs</span> `;
    const closeAll = document.createElement("button");
    closeAll.className = "closeAll";
    closeAll.textContent = "Close dupes";
    closeAll.title = "Keep the first tab, close the rest";
    closeAll.onclick = async () => {
      await chrome.tabs.remove(g.tabs.slice(1).map(t => t.id));
      render();
    };
    right.appendChild(closeAll);
    head.append(title, right);
    box.appendChild(head);

    g.tabs.forEach((t, i) => {
      const row = document.createElement("div");
      row.className = "tab";

      const icon = document.createElement("img");
      icon.src = t.favIconUrl || "";
      icon.onerror = () => (icon.style.visibility = "hidden");

      const info = document.createElement("div");
      info.className = "tab-info";
      info.title = "Click to go to this tab";
      info.innerHTML = `
        <div class="tab-title"></div>
        <div class="tab-url"></div>
        <div class="tab-meta">Window ${t.windowId} · Tab ${t.index + 1}${i === 0 ? " · original" : ""}</div>`;
      info.querySelector(".tab-title").textContent = t.title || "(no title)";
      info.querySelector(".tab-url").textContent = t.url;
      info.onclick = async () => {
        await chrome.tabs.update(t.id, { active: true });
        await chrome.windows.update(t.windowId, { focused: true });
      };

      const x = document.createElement("button");
      x.className = "x";
      x.textContent = "✕";
      x.title = "Close this tab";
      x.onclick = async () => {
        await chrome.tabs.remove(t.id);
        render();
      };

      row.append(icon, info, x);
      box.appendChild(row);
    });

    listEl.appendChild(box);
  });
}

autoEl.onchange = async () => {
  await chrome.storage.sync.set({ autoClose: autoEl.checked });
  if (autoEl.checked) await closeAllDuplicates(); // clean existing dupes now
  render();
};

(async function init() {
  const { autoClose = false } = await chrome.storage.sync.get("autoClose");
  autoEl.checked = autoClose;
  render();
})();

chrome.tabs.onRemoved.addListener(render);
chrome.tabs.onUpdated.addListener((id, info) => info.status === "complete" && render());