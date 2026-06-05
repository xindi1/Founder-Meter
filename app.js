const STORAGE_KEY = "founder-meter-behavior-entries-v1";
const THEME_KEY = "founder-meter-behavior-theme-v1";
const EXPORT_KEY = "founder-meter-behavior-last-export-v1";
const CACHE_BUST = "founder-meter-behavior-v2026-06-05-1";

const behaviors = ["Build", "Research", "Organize", "Share", "Validate", "Monetize"];

const presets = [
  { behavior: "Build", asset: "Founder Meter", effort: 3, output: "Code / build", note: "Built or updated a product.", label: "Build", sub: "product work" },
  { behavior: "Research", asset: "Executive OS", effort: 2, output: "Insight", note: "Explored a market, tool, customer, or commercialization path.", label: "Research", sub: "learn" },
  { behavior: "Organize", asset: "Executive OS", effort: 2, output: "Decision", note: "Structured assets, priorities, or next actions.", label: "Organize", sub: "structure" },
  { behavior: "Share", asset: "Executive OS", effort: 2, output: "Public artifact", note: "Created or shared proof-of-use, demo, post, or screenshot.", label: "Share", sub: "visibility" },
  { behavior: "Validate", asset: "Communication Meter", effort: 3, output: "Feedback", note: "Got feedback or reality contact from a user, buyer, or market.", label: "Validate", sub: "reality" },
  { behavior: "Monetize", asset: "Executive OS", effort: 3, output: "Revenue step", note: "Worked on pricing, licensing, selling, or a revenue path.", label: "Monetize", sub: "money" }
];

const els = {
  localDateLabel: document.getElementById("localDateLabel"),
  timezoneLabel: document.getElementById("timezoneLabel"),
  coverageValue: document.getElementById("coverageValue"),
  todayCount: document.getElementById("todayCount"),
  todayEffort: document.getElementById("todayEffort"),
  todayDominant: document.getElementById("todayDominant"),
  todayDensity: document.getElementById("todayDensity"),
  thresholdStatus: document.getElementById("thresholdStatus"),
  thresholdNote: document.getElementById("thresholdNote"),
  effortBar: document.getElementById("effortBar"),
  form: document.getElementById("entryForm"),
  entryId: document.getElementById("entryId"),
  behavior: document.getElementById("behavior"),
  asset: document.getElementById("asset"),
  effort: document.getElementById("effort"),
  output: document.getElementById("output"),
  date: document.getElementById("date"),
  time: document.getElementById("time"),
  note: document.getElementById("note"),
  resetBtn: document.getElementById("resetBtn"),
  presetGrid: document.getElementById("presetGrid"),
  behaviorBreakdown: document.getElementById("behaviorBreakdown"),
  assetBreakdown: document.getElementById("assetBreakdown"),
  dateFilter: document.getElementById("dateFilter"),
  entriesList: document.getElementById("entriesList"),
  entryTemplate: document.getElementById("entryTemplate"),
  entryCountLabel: document.getElementById("entryCountLabel"),
  exportBtn: document.getElementById("exportBtn"),
  importFile: document.getElementById("importFile"),
  clearAllBtn: document.getElementById("clearAllBtn"),
  themeToggle: document.getElementById("themeToggle"),
  lastExportLabel: document.getElementById("lastExportLabel")
};

let entries = loadEntries();

initialize();

function initialize() {
  applyTheme();
  setDateTimeDefault();
  renderPresets();
  renderLastExport();
  renderAll();

  els.form.addEventListener("submit", handleSubmit);
  els.resetBtn.addEventListener("click", resetForm);
  els.dateFilter.addEventListener("change", renderAll);
  els.exportBtn.addEventListener("click", exportData);
  els.importFile.addEventListener("change", importData);
  els.clearAllBtn.addEventListener("click", clearAll);
  els.themeToggle.addEventListener("click", toggleTheme);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").then((registration) => registration.update()).catch(console.error);
    });
  }
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Could not load entries", error);
    return [];
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function nowLocalDateKey() {
  return toLocalDateKey(new Date());
}

function toLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalTime(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function localDateFromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateLabel(key) {
  const date = localDateFromKey(key);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function yesterdayKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return toLocalDateKey(date);
}

function setDateTimeDefault() {
  const now = new Date();
  els.date.value = toLocalDateKey(now);
  els.time.value = toLocalTime(now);
}

function createEntry(overrides = {}) {
  const now = new Date();
  const behavior = overrides.behavior || els.behavior.value;
  const dateKey = overrides.dateKey || els.date.value || nowLocalDateKey();
  const time = overrides.time || els.time.value || toLocalTime(now);
  const effort = Number(overrides.effort ?? els.effort.value);

  return {
    id: overrides.id || crypto.randomUUID(),
    dateKey,
    time,
    behavior,
    asset: (overrides.asset ?? els.asset.value).trim() || "Unassigned",
    effort,
    output: overrides.output || els.output.value,
    note: (overrides.note ?? els.note.value).trim(),
    createdAt: overrides.createdAt || now.toISOString(),
    updatedAt: now.toISOString(),
    localTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Local"
  };
}

function handleSubmit(event) {
  event.preventDefault();
  const existingId = els.entryId.value || null;
  const existing = existingId ? entries.find(e => e.id === existingId) : null;
  const entry = createEntry({ id: existingId || undefined, createdAt: existing?.createdAt });

  if (existingId) {
    entries = entries.map((item) => item.id === existingId ? entry : item);
    showToast("Founder action updated.");
  } else {
    entries.unshift(entry);
    showToast("Founder action saved.");
  }
  saveEntries();
  resetForm();
  renderAll();
}

function addPreset(preset) {
  const entry = createEntry(preset);
  entries.unshift(entry);
  saveEntries();
  renderAll();
  showToast(`${preset.label} saved.`);
}

function resetForm() {
  els.form.reset();
  els.entryId.value = "";
  setDateTimeDefault();
}

function getEntriesForFilter() {
  const filter = els.dateFilter.value;
  if (filter === "today") return entries.filter((entry) => entry.dateKey === nowLocalDateKey());
  if (filter === "yesterday") return entries.filter((entry) => entry.dateKey === yesterdayKey());
  return [...entries];
}

function getTodayEntries() {
  return entries.filter((entry) => entry.dateKey === nowLocalDateKey());
}

function summarize(list) {
  return list.reduce((acc, entry) => {
    acc.count += 1;
    acc.effort += Number(entry.effort || 0);
    const behavior = entry.behavior || "Build";
    if (!acc.byBehavior[behavior]) acc.byBehavior[behavior] = { label: behavior, count: 0, effort: 0 };
    acc.byBehavior[behavior].count += 1;
    acc.byBehavior[behavior].effort += Number(entry.effort || 0);

    const asset = entry.asset || "Unassigned";
    if (!acc.byAsset[asset]) acc.byAsset[asset] = { label: asset, count: 0, effort: 0 };
    acc.byAsset[asset].count += 1;
    acc.byAsset[asset].effort += Number(entry.effort || 0);
    return acc;
  }, { count: 0, effort: 0, byBehavior: {}, byAsset: {} });
}

function renderAll() {
  renderToday();
  renderBreakdowns();
  renderEntries();
}

function renderToday() {
  const todayKey = nowLocalDateKey();
  const today = getTodayEntries();
  const totals = summarize(today);
  const rows = Object.values(totals.byBehavior);
  const hoursElapsed = Math.max(1, (new Date().getHours() + new Date().getMinutes() / 60));
  const density = totals.count / hoursElapsed;
  const dominant = rows.sort((a, b) => b.effort - a.effort)[0]?.label || "—";
  const nonzero = behaviors.filter((b) => (totals.byBehavior[b]?.count || 0) > 0).length;
  const coverage = Math.round((nonzero / behaviors.length) * 100);

  els.localDateLabel.textContent = formatDateLabel(todayKey);
  els.timezoneLabel.textContent = `Day boundary uses this device’s local timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone || "Local"}`;
  els.todayCount.textContent = totals.count;
  els.todayEffort.textContent = Math.round(totals.effort);
  els.todayDominant.textContent = dominant;
  els.todayDensity.textContent = `${density.toFixed(1)}/hr`;
  els.coverageValue.textContent = `${coverage}%`;
  els.effortBar.style.width = `${Math.min(100, totals.effort * 5)}%`;

  const status = getThresholdStatus(totals, dominant, nonzero);
  els.thresholdStatus.textContent = status.title;
  els.thresholdNote.textContent = status.note;
}

function getThresholdStatus(totals, dominant, nonzero) {
  if (totals.count === 0) return { title: "Quiet", note: "No founder behavior logged yet today." };
  if (nonzero === 1 && totals.count >= 3) return { title: "Narrow", note: `${dominant} is dominating. That may be fine, but check whether another behavior needs a small touch.` };
  if (totals.effort >= 25) return { title: "High Activity", note: "Founder behavior is highly active today. Convert one strong thread into a concrete next step." };
  if (nonzero >= 4) return { title: "Balanced", note: "Multiple founder behaviors are represented today." };
  return { title: "Active", note: "Founder behavior is present. Keep logging the boring repeatable actions." };
}

function renderPresets() {
  els.presetGrid.innerHTML = "";
  presets.forEach((preset) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preset-btn";
    button.innerHTML = `<strong>${escapeHTML(preset.label)}</strong><span>${escapeHTML(preset.sub)}</span>`;
    button.addEventListener("click", () => addPreset(preset));
    els.presetGrid.appendChild(button);
  });
}

function renderBreakdowns() {
  const today = getTodayEntries();
  const totals = summarize(today);
  const behaviorRows = behaviors.map((behavior) => totals.byBehavior[behavior] || { label: behavior, count: 0, effort: 0 });
  renderBarList(els.behaviorBreakdown, behaviorRows, "behavior");

  const assetRows = Object.values(totals.byAsset).sort((a, b) => b.effort - a.effort).slice(0, 8);
  renderBarList(els.assetBreakdown, assetRows.length ? assetRows : [{ label: "No assets yet", count: 0, effort: 0 }], "asset");
}

function renderBarList(container, rows, type) {
  container.innerHTML = "";
  const max = Math.max(...rows.map((row) => row.effort), 1);
  rows.forEach((row) => {
    const item = document.createElement("div");
    item.className = "bar-row";
    if (type === "behavior") item.dataset.behavior = row.label;
    item.innerHTML = `
      <div class="bar-top"><strong>${escapeHTML(row.label)}</strong><span>${row.count} · ${Math.round(row.effort)} effort</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${row.effort ? Math.max(4, (row.effort / max) * 100) : 0}%"></div></div>
    `;
    container.appendChild(item);
  });
}

function renderEntries() {
  const list = getEntriesForFilter().sort((a, b) => {
    const aStamp = `${a.dateKey || ""}T${a.time || "00:00"}`;
    const bStamp = `${b.dateKey || ""}T${b.time || "00:00"}`;
    return bStamp.localeCompare(aStamp);
  });

  els.entriesList.innerHTML = "";
  els.entryCountLabel.textContent = `${list.length} ${list.length === 1 ? "entry" : "entries"}${els.dateFilter.value === "all" ? "" : " shown"}`;

  if (!list.length) {
    els.entriesList.innerHTML = `<div class="empty">No founder actions logged for this view.</div>`;
    return;
  }

  list.forEach((entry) => {
    const node = els.entryTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.behavior = entry.behavior || "Build";
    node.querySelector(".entry-title").textContent = `${entry.behavior} · ${entry.asset || "Unassigned"}`;
    node.querySelector(".entry-meta").textContent = `${entry.dateKey} ${entry.time || ""} · ${entry.output || "Logged action"} · effort ${entry.effort}`;
    const note = node.querySelector(".entry-note");
    note.textContent = entry.note || "";
    note.hidden = !entry.note;
    node.querySelector(".score-pill").textContent = Math.round(entry.effort || 0);
    node.querySelector(".edit-entry").addEventListener("click", () => editEntry(entry.id));
    node.querySelector(".duplicate-entry").addEventListener("click", () => duplicateEntry(entry.id));
    node.querySelector(".delete-entry").addEventListener("click", () => deleteEntry(entry.id));
    els.entriesList.appendChild(node);
  });
}

function editEntry(id) {
  const entry = entries.find((item) => item.id === id);
  if (!entry) return;
  els.entryId.value = entry.id;
  els.behavior.value = entry.behavior || "Build";
  els.asset.value = entry.asset === "Unassigned" ? "" : entry.asset || "";
  els.effort.value = String(entry.effort || 3);
  els.output.value = entry.output || "Logged action";
  els.date.value = entry.dateKey || nowLocalDateKey();
  els.time.value = entry.time || toLocalTime(new Date());
  els.note.value = entry.note || "";
  document.querySelector(".quick-panel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function duplicateEntry(id) {
  const entry = entries.find((item) => item.id === id);
  if (!entry) return;
  const clone = { ...entry, id: crypto.randomUUID(), dateKey: nowLocalDateKey(), time: toLocalTime(new Date()), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  entries.unshift(clone);
  saveEntries();
  renderAll();
  showToast("Founder action duplicated for today.");
}

function deleteEntry(id) {
  entries = entries.filter((item) => item.id !== id);
  saveEntries();
  renderAll();
  showToast("Founder action deleted.");
}

function exportData() {
  const exportedAt = new Date().toISOString();
  const payload = {
    app: "Founder Meter",
    model: "Behavioral",
    version: CACHE_BUST,
    exportedAt,
    localDateAtExport: nowLocalDateKey(),
    localTimeAtExport: toLocalTime(new Date()),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Local",
    behaviors,
    entries
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `founder-meter-export-${nowLocalDateKey()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  localStorage.setItem(EXPORT_KEY, exportedAt);
  renderLastExport();
  showToast(`Exported ${entries.length} ${entries.length === 1 ? "entry" : "entries"}.`);
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const importedEntries = Array.isArray(parsed) ? parsed : parsed.entries;
      if (!Array.isArray(importedEntries)) throw new Error("No entries array found.");
      const existingIds = new Set(entries.map((entry) => entry.id));
      const added = [];
      importedEntries.forEach((item) => {
        const normalized = normalizeImportedEntry(item);
        if (!existingIds.has(normalized.id)) {
          added.push(normalized);
          existingIds.add(normalized.id);
        }
      });
      entries = [...added, ...entries];
      saveEntries();
      renderAll();
      showToast(`Import complete. Added ${added.length} ${added.length === 1 ? "entry" : "entries"}.`);
    } catch (error) {
      showToast("Import failed. Check JSON format.");
      console.error(error);
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function normalizeImportedEntry(entry) {
  return {
    id: entry.id || crypto.randomUUID(),
    dateKey: entry.dateKey || nowLocalDateKey(),
    time: entry.time || "",
    behavior: behaviors.includes(entry.behavior) ? entry.behavior : "Build",
    asset: entry.asset || "Unassigned",
    effort: Number(entry.effort || 1),
    output: entry.output || "Logged action",
    note: entry.note || "",
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || new Date().toISOString(),
    localTimezone: entry.localTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Local"
  };
}

function clearAll() {
  const ok = confirm("Clear all Founder Meter entries from this device?");
  if (!ok) return;
  entries = [];
  saveEntries();
  renderAll();
  showToast("All entries cleared.");
}

function applyTheme() {
  const theme = localStorage.getItem(THEME_KEY);
  document.body.classList.toggle("dark", theme === "dark");
  els.themeToggle.textContent = theme === "dark" ? "◐" : "☼";
}

function toggleTheme() {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  els.themeToggle.textContent = isDark ? "◐" : "☼";
}

function renderLastExport() {
  if (!els.lastExportLabel) return;
  const stamp = localStorage.getItem(EXPORT_KEY);
  els.lastExportLabel.textContent = stamp ? `Last export: ${stamp.slice(0,10)} ${stamp.slice(11,16)}` : "Last export: never";
}

function showToast(message) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[char]));
}
