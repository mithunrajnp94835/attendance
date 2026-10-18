const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const exportBtn = document.getElementById("exportBtn");
const copyBtn = document.getElementById("copyBtn");
const importBtn = document.getElementById("importBtn");
const fileInput = document.getElementById("fileInput");
const pasteBox = document.getElementById("pasteBox");
const pasteBtn = document.getElementById("pasteBtn");

function todayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// message under the buttons: tells you what happened
function say(text, good) {
  resultEl.textContent = text;
  resultEl.className = "backup-status " + (good ? "ok" : "bad");
}

// ---------- building the backup ----------
function makeBackup() {
  return {
    app: "attendance-tracker",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      timetable: load(TT_KEY, {}),
      subjects: load(SUBJ_KEY, []),
      records: load("records", {}),
      notes: load("notes", {}),
      target: TARGET
    }
  };
}

function markBackedUp() {
  save("lastBackup", Date.now());
  showStatus();
}

function showStatus() {
  const age = backupAge();
  if (age === null) {
    statusEl.textContent = "No backup yet. Make one now.";
    statusEl.className = "backup-status bad";
  } else {
    statusEl.textContent = age === 0 ? "Last backup: today" : "Last backup: " + age + " day" + (age === 1 ? "" : "s") + " ago";
    statusEl.className = "backup-status " + (age > 7 ? "bad" : "ok");
  }
}

// ---------- export ----------
function downloadFile(json, name) {
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 10000);   // wait, or some phones cancel the download
}

async function exportBackup() {
  const json = JSON.stringify(makeBackup(), null, 2);
  const name = "attendance-backup-" + todayStr() + ".json";

  // 1. Desktop browsers: a real "Save as" window where you pick the folder
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: name,
        types: [{ description: "Backup file", accept: { "application/json": [".json"] } }]
      });
      const w = await handle.createWritable();
      await w.write(json);
      await w.close();
      markBackedUp();
      say("Saved.", true);
      return;
    } catch (e) {
      if (e.name === "AbortError") { say("Cancelled. Nothing was saved.", false); return; }
      // any other problem: try the next method
    }
  }

  // 2. Phones: the share sheet (Save to Files, Drive, WhatsApp...)
  const file = new File([json], name, { type: "text/plain" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Attendance backup" });
      markBackedUp();
      say("Done. Check that you chose a place that keeps the file, like Files or Drive.", true);
      return;
    } catch (e) {
      if (e.name === "AbortError") { say("Cancelled. Nothing was saved.", false); return; }
      // any other problem: try the next method
    }
  }

  // 3. Last resort: normal download
  downloadFile(json, name);
  markBackedUp();
  say("Downloaded to your Downloads folder as " + name + ".", true);
}

function copyBackup() {
  const json = JSON.stringify(makeBackup());
  navigator.clipboard.writeText(json).then(function () {
    markBackedUp();
    say("Copied. Paste it into a note or a WhatsApp chat with yourself and save it there.", true);
  }).catch(function () {
    say("Copying was blocked. Use Export backup file instead.", false);
  });
}

// ---------- restore ----------
function checkBackup(obj) {
  return obj && obj.app === "attendance-tracker" && obj.data &&
    obj.data.timetable && typeof obj.data.timetable === "object" &&
    Array.isArray(obj.data.subjects) &&
    obj.data.records && typeof obj.data.records === "object" &&
    obj.data.notes && typeof obj.data.notes === "object";
}

function applyBackup(text) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch (e) {
    alert("That is not a valid backup.");
    return;
  }
  if (!checkBackup(obj)) {
    alert("That is not an attendance backup file.");
    return;
  }

  const when = obj.exportedAt ? obj.exportedAt.slice(0, 10) : "an unknown date";
  const count = Object.keys(obj.data.records).length;
  if (!confirm("Replace ALL data in this app with the backup from " + when + " (" + count + " attendance records)?")) return;

  // safety copy of what is in the app right now
  save("preImportBackup", makeBackup());

  save(TT_KEY, obj.data.timetable);
  save(SUBJ_KEY, obj.data.subjects);
  save("records", obj.data.records);
  save("notes", obj.data.notes);
    const t = Number(obj.data.target);
  if (t >= 1 && t <= 99) save("target", Math.round(t));

  alert("Backup restored.");
  location.href = "index.html";      // reload so every page reads the restored data
}

// ---------- buttons ----------
exportBtn.addEventListener("click", function () {
  exportBackup().catch(function (e) {
    say("Export failed: " + e.message, false);
  });
});

copyBtn.addEventListener("click", copyBackup);

importBtn.addEventListener("click", function () { fileInput.click(); });
fileInput.addEventListener("change", function () {
  const f = fileInput.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = function () { applyBackup(reader.result); };
  reader.readAsText(f);
  fileInput.value = "";
});

pasteBtn.addEventListener("click", function () {
  const text = pasteBox.value.trim();
  if (text === "") return;
  applyBackup(text);
});

showStatus();