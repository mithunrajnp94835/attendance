const ORDER = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
const JS_DAY = { sunday:0, monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6 };

// PUT YOUR OWN TIMETABLE HERE (only used the first time, before anything is saved)
const defaultTimetable = {
  monday: [], tuesday: [], wednesday: [], thursday: [],
  friday: [], saturday: [], sunday: []
};

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
}

const TT_KEY = "timetable";
const SUBJ_KEY = "subjects";

let timetable = load(TT_KEY, defaultTimetable);
let marks = load("marks", {});
let subjects = load(SUBJ_KEY, null);

function namesInTimetable() {
  const set = new Set();
  ORDER.forEach(function (d) {
    (timetable[d] || []).forEach(function (n) { set.add(n); });
  });
  return Array.from(set);
}

// first run: copy the subjects already in your timetable
if (subjects === null) {
  subjects = namesInTimetable();
  save(SUBJ_KEY, subjects);
}

function allSubjects() {
  const set = new Set(subjects.concat(namesInTimetable()));
  return Array.from(set).sort();
}

let notes = load("notes", {});

// ---------- attendance records: one per subject per date ----------
let records = load("records", null);

// first run: convert the old marks into records
if (records === null) {
  records = {};
  Object.keys(marks).forEach(function (key) {
    const m = marks[key];
    const k = key.split("|")[0] + "|" + m.subject;
    if (!records[k]) records[k] = { periods: [] };
    records[k].periods.push(m.status);
  });
  save("records", records);
}

function recKey(d, subject) {
  return d + "|" + subject;
}

// "2026-10-19" -> "monday"
function dayNameOf(d) {
  const p = d.split("-");
  const wd = new Date(p[0], p[1] - 1, p[2]).getDay();
  return ORDER.find(function (n) { return JS_DAY[n] === wd; });
}

// how many times the timetable lists this subject on that weekday (at least 1)
function plannedPeriods(subject, dayName) {
  const n = (timetable[dayName] || []).filter(function (x) { return x === subject; }).length;
  return new Array(Math.max(1, n)).fill("");
}

// periods are "p", "a" or "" (not marked yet)
function getPeriods(d, subject) {
  const r = records[recKey(d, subject)];
  return r ? r.periods.slice() : plannedPeriods(subject, dayNameOf(d));
}

function setPeriods(d, subject, periods) {
  records[recKey(d, subject)] = { periods: periods };
  save("records", records);
}

function clearRecord(d, subject) {
  delete records[recKey(d, subject)];
  save("records", records);
}

function summary(periods) {
  let att = 0, marked = 0;
  periods.forEach(function (s) {
    if (s === "p") { att++; marked++; }
    else if (s === "a") { marked++; }
  });
  let cls = "s-some";
  if (marked === 0) cls = "s-none";
  else if (att === periods.length) cls = "s-all";
  else if (att === 0) cls = "s-zero";
  return { attended: att, marked: marked, held: periods.length, cls: cls };
}

// days since the last backup, or null if you never made one
function backupAge() {
  const t = load("lastBackup", null);
  if (!t) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  });
}

let TARGET = load("target", 75);
if (typeof TARGET !== "number" || TARGET < 1 || TARGET > 99) TARGET = 75;

function setTarget(v) {
  TARGET = v;
  save("target", v);
}

