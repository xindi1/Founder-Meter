const STORAGE_KEY = "founder-meter-entries-v1";
const THEME_KEY = "founder-meter-theme-v1";
const EXPORT_KEY = "founder-meter-last-export-v1";
const CACHE_BUST = "founder-meter-v2026-06-05-comm-backbone2";

const meters = ["Build", "Revenue", "Marketing", "Customer", "Strategy"];

const meterMeta = {
  Build: { words: /build|bug|fix|feature|app|code|pwa|deploy|zip|github|ui|ux|spacing|version|update|prototype/i },
  Revenue: { words: /revenue|money|monetiz|price|pricing|subscription|license|licensing|sell|sales|commercial|marketplace|paid|profit/i },
  Marketing: { words: /marketing|post|launch|linkedin|video|demo|screenshot|content|brand|audience|visibility|landing page|copy/i },
  Customer: { words: /customer|user|persona|feedback|interview|therapist|founder|buyer|client|validation|market/i },
  Strategy: { words: /strategy|thesis|opportunity|positioning|flagship|roadmap|pathway|agent|framework|priority|focus/i }
};

const presets = [
  { thought: "Fix or improve the current app experience.", meters: ["Build"], intensity: 3, product: "Founder Meter", label: "Build Fix", sub: "product work" },
  { thought: "Define or test a revenue path.", meters: ["Revenue", "Strategy"], intensity: 3, product: "Executive OS", label: "Revenue Path", sub: "money work" },
  { thought: "Create a proof-of-use screenshot, demo, or post.", meters: ["Marketing"], intensity: 2, product: "Executive OS", label: "Marketing Proof", sub: "visibility" },
  { thought: "Collect feedback from a potential user or buyer.", meters: ["Customer"], intensity: 3, product: "Communication Meter", label: "Customer Signal", sub: "validation" }
];

const els = {
  localDateLabel: document.getElementById("localDateLabel"),
  timezoneLabel: document.getElementById("timezoneLabel"),
  balanceValue: document.getElementById("balanceValue"),
  todayCount: document.getElementById("todayCount"),
  todayPressure: document.getElementById("todayPressure"),
  todayDominant: document.getElementById("todayDominant"),
  todayDensity: document.getElementById("todayDensity"),
  thresholdStatus: document.getElementById("thresholdStatus"),
  thresholdNote: document.getElementById("thresholdNote"),
  pressureBar: document.getElementById("pressureBar"),
  form: document.getElementById("entryForm"),
  entryId: document.getElementById("entryId"),
  thought: document.getElementById("thought"),
  product: document.getElementById("product"),
  intensity: document.getElementById("intensity"),
  convertTo: document.getElementById("convertTo"),
  date: document.getElementById("date"),
  time: document.getElementById("time"),
  resetBtn: document.getElementById("resetBtn"),
  presetGrid: document.getElementById("presetGrid"),
  meterBreakdown: document.getElementById("meterBreakdown"),
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
let selectedMeter = "Auto";

initialize();

function initialize() {
  applyTheme();
  setDateTimeDefault();
  renderPresets();
  renderLastExport();
  renderAll();

  document.querySelectorAll("[data-meter]").forEach((button) => {
    button.addEventListener("click", () => setMeter(button.dataset.meter));
  });

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

function setMeter(meter) {
  selectedMeter = meter;
  document.querySelectorAll("[data-meter]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.meter === meter);
  });
}

function classifyThought(text, forced = selectedMeter) {
  if (forced && forced !== "Auto") return [forced];

  const found = meters.filter((meter) => meterMeta[meter].words.test(text || ""));
  if (!found.length) return ["Strategy"];
  return found;
}

function createEntry(overrides = {}) {
  const now = new Date();
  const text = (overrides.thought ?? els.thought.value).trim();
  const dateKey = overrides.dateKey || els.date.value || nowLocalDateKey();
  const time = overrides.time || els.time.value || toLocalTime(now);
  const intensity = Number(overrides.intensity ?? els.intensity.value);
  const meterList = overrides.meters || classifyThought(text);

  return {
    id: overrides.id || crypto.randomUUID(),
    dateKey,
    time,
    thought: text,
    product: (overrides.product ?? els.product.value).trim() || "Unassigned",
    meters: meterList,
    primaryMeter: meterList[0] || "Strategy",
    intensity,
    convertTo: overrides.convertTo || els.convertTo.value,
    pressure: intensity * Math.max(1, meterList.length),
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
    showToast("Founder thought updated.");
  } else {
    entries.unshift(entry);
    showToast("Founder thought saved.");
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
  setMeter("Auto");
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
    acc.pressure += Number(entry.pressure || 0);
    (entry.meters || [entry.primaryMeter || "Strategy"]).forEach((meter) => {
      if (!acc.byMeter[meter]) acc.byMeter[meter] = { label: meter, count: 0, pressure: 0 };
      acc.byMeter[meter].count += 1;
      acc.byMeter[meter].pressure += Number(entry.intensity || 1);
    });
    return acc;
  }, { count: 0, pressure: 0, byMeter: {} });
}

function renderAll() {
  renderToday();
  renderBreakdown();
  renderEntries();
}

function renderToday() {
  const todayKey = nowLocalDateKey();
  const today = getTodayEntries();
  const totals = summarize(today);
  const rows = Object.values(totals.byMeter);
  const hoursElapsed = Math.max(1, (new Date().getHours() + new Date().getMinutes() / 60));
  const density = totals.count / hoursElapsed;
  const dominant = rows.sort((a,b) => b.pressure - a.pressure)[0]?.label || "—";
  const nonzero = rows.filter(r => r.count > 0).length;
  const balance = Math.round((nonzero / meters.length) * 100);

  els.localDateLabel.textContent = formatDateLabel(todayKey);
  els.timezoneLabel.textContent = `Day boundary uses this device’s local timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone || "Local"}`;
  els.todayCount.textContent = totals.count;
  els.todayPressure.textContent = Math.round(totals.pressure);
  els.todayDominant.textContent = dominant;
  els.todayDensity.textContent = `${density.toFixed(1)}/hr`;
  els.balanceValue.textContent = `${balance}%`;
  els.pressureBar.style.width = `${Math.min(100, totals.pressure * 4)}%`;

  const status = getThresholdStatus(totals, dominant, nonzero);
  els.thresholdStatus.textContent = status.title;
  els.thresholdNote.textContent = status.note;
}

function getThresholdStatus(totals, dominant, nonzero) {
  if (totals.count === 0) return { title: "Quiet", note: "No founder activity logged yet today." };
  if (nonzero <= 2 && totals.count >= 5) return { title: "Narrow Band", note: `${dominant} is dominating. Check whether another founder channel needs attention.` };
  if (totals.pressure >= 30) return { title: "High Pressure", note: "Founder attention is highly active. Convert the strongest signal into one next action." };
  if (nonzero >= 4) return { title: "Balanced", note: "Founder attention is spread across several channels today." };
  return { title: "Active", note: "Founder activity is present. Watch for Build-heavy drift." };
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

function renderBreakdown() {
  const today = getTodayEntries();
  const totals = summarize(today);
  const rows = meters.map((meter) => totals.byMeter[meter] || { label: meter, count: 0, pressure: 0 });
  renderBarList(els.meterBreakdown, rows);
}

function renderBarList(container, rows) {
  container.innerHTML = "";
  const max = Math.max(...rows.map((row) => row.pressure), 1);
  rows.forEach((row) => {
    const item = document.createElement("div");
    item.className = "bar-row";
    item.dataset.meter = row.label;
    item.innerHTML = `
      <div class="bar-top"><strong>${escapeHTML(row.label)}</strong><span>${row.count} · ${Math.round(row.pressure)} pressure</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${row.pressure ? Math.max(4, (row.pressure / max) * 100) : 0}%"></div></div>
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
    els.entriesList.innerHTML = `<div class="empty">No founder thoughts logged for this view.</div>`;
    return;
  }

  list.forEach((entry) => {
    const node = els.entryTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.primary = entry.primaryMeter || "Strategy";
    node.querySelector(".entry-title").textContent = `${entry.product || "Unassigned"} · ${(entry.meters || []).join(" + ") || entry.primaryMeter || "Strategy"}`;
    node.querySelector(".entry-meta").textContent = `${entry.dateKey} ${entry.time || ""} · ${entry.convertTo || "Entry only"} · intensity ${entry.intensity}`;
    const note = node.querySelector(".entry-note");
    note.textContent = entry.thought || "";
    note.hidden = !entry.thought;
    node.querySelector(".score-pill").textContent = Math.round(entry.pressure || 0);
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
  els.thought.value = entry.thought || "";
  els.product.value = entry.product === "Unassigned" ? "" : entry.product || "";
  setMeter(entry.primaryMeter || "Auto");
  els.intensity.value = String(entry.intensity || 3);
  els.convertTo.value = entry.convertTo || "Entry only";
  els.date.value = entry.dateKey || nowLocalDateKey();
  els.time.value = entry.time || toLocalTime(new Date());
  document.querySelector(".quick-panel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function duplicateEntry(id) {
  const entry = entries.find((item) => item.id === id);
  if (!entry) return;
  const clone = { ...entry, id: crypto.randomUUID(), dateKey: nowLocalDateKey(), time: toLocalTime(new Date()), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  entries.unshift(clone);
  saveEntries();
  renderAll();
  showToast("Founder thought duplicated for today.");
}

function deleteEntry(id) {
  entries = entries.filter((item) => item.id !== id);
  saveEntries();
  renderAll();
  showToast("Founder thought deleted.");
}

function exportData() {
  const exportedAt = new Date().toISOString();
  const payload = {
    app: "Founder Meter",
    version: CACHE_BUST,
    exportedAt,
    localDateAtExport: nowLocalDateKey(),
    localTimeAtExport: toLocalTime(new Date()),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Local",
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
  const intensity = Number(entry.intensity || 3);
  const thought = entry.thought || entry.note || "";
  const meterList = Array.isArray(entry.meters) ? entry.meters : classifyThought(thought, entry.primaryMeter || "Auto");
  return {
    id: entry.id || crypto.randomUUID(),
    dateKey: entry.dateKey || nowLocalDateKey(),
    time: entry.time || "",
    thought,
    product: entry.product || "Unassigned",
    meters: meterList,
    primaryMeter: entry.primaryMeter || meterList[0] || "Strategy",
    intensity,
    convertTo: entry.convertTo || "Entry only",
    pressure: Number(entry.pressure || intensity * Math.max(1, meterList.length)),
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
