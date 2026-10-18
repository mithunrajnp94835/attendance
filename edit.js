const daySelect = document.getElementById("daySelect");
const list = document.getElementById("list");
const subjectSelect = document.getElementById("subjectSelect");
const newSubject = document.getElementById("newSubject");
const addSubjectBtn = document.getElementById("addSubjectBtn");
const subjectList = document.getElementById("subjectList");
const firstRun = document.getElementById("firstRun");

let day = "monday";

function saveTimetable() {
  save(TT_KEY, timetable);
}

function saveSubjects() {
  save(SUBJ_KEY, subjects);
}

function move(i, dir) {
  const arr = timetable[day];
  const j = i + dir;
  if (j < 0 || j >= arr.length) return;
  const temp = arr[i];
  arr[i] = arr[j];
  arr[j] = temp;
  saveTimetable();
  renderDay();
}

function renderDay() {
  list.innerHTML = "";
  const arr = timetable[day] || [];

  if (arr.length === 0) {
    list.textContent = "No classes on this day. Pick one below.";
    return;
  }

  arr.forEach(function (name, i) {
    const row = document.createElement("div");
    row.className = "edit-row";

    const input = document.createElement("input");
    input.value = name;
    input.addEventListener("change", function () {
      const v = input.value.trim();
      if (v === "") {
        input.value = timetable[day][i];
        return;
      }
      timetable[day][i] = v;
      saveTimetable();
      fillSelect();
      renderSubjects();
    });

    const up = document.createElement("button");
    up.textContent = "↑";
    up.disabled = i === 0;
    up.addEventListener("click", function () { move(i, -1); });

    const down = document.createElement("button");
    down.textContent = "↓";
    down.disabled = i === arr.length - 1;
    down.addEventListener("click", function () { move(i, 1); });

    const del = document.createElement("button");
    del.className = "del";
    del.textContent = "✕";
    del.addEventListener("click", function () {
      if (confirm('Delete "' + timetable[day][i] + '" from ' + day + '?')) {
        timetable[day].splice(i, 1);
        saveTimetable();
        renderDay();
        fillSelect();
        renderSubjects();
      }
    });

    row.append(input, up, down, del);
    list.appendChild(row);
  });
}

function fillSelect() {
  const names = allSubjects();
  firstRun.hidden = names.length > 0;

  subjectSelect.innerHTML = "";

  const first = document.createElement("option");
  first.value = "";
  first.textContent = names.length ? "+ Add a class to this day…" : "Create a subject first (below)";
  subjectSelect.appendChild(first);

  names.forEach(function (n) {
    const o = document.createElement("option");
    o.value = n;
    o.textContent = n;
    subjectSelect.appendChild(o);
  });
}

subjectSelect.addEventListener("change", function () {
  const name = subjectSelect.value;
  if (name === "") return;
  if (!timetable[day]) timetable[day] = [];
  timetable[day].push(name);
  saveTimetable();
  subjectSelect.value = "";
  renderDay();
});

function isUsed(name) {
  return ORDER.some(function (d) {
    return (timetable[d] || []).indexOf(name) !== -1;
  });
}

function renderSubjects() {
  subjectList.innerHTML = "";

  allSubjects().forEach(function (name) {
    const row = document.createElement("div");
    row.className = "subj-row";

    const label = document.createElement("span");
    label.textContent = name;

    const del = document.createElement("button");
    del.textContent = "Delete";
    del.addEventListener("click", function () {
      if (isUsed(name)) {
        alert('"' + name + '" is still in your timetable. Remove it from the days first.');
        return;
      }
      const at = subjects.indexOf(name);
      if (at !== -1) subjects.splice(at, 1);
      saveSubjects();
      fillSelect();
      renderSubjects();
    });

    row.append(label, del);
    subjectList.appendChild(row);
  });
}

function createSubject() {
  const name = newSubject.value.trim();
  if (name === "") return;

  const exists = allSubjects().some(function (n) {
    return n.toLowerCase() === name.toLowerCase();
  });
  if (exists) {
    alert('"' + name + '" already exists.');
    return;
  }

  subjects.push(name);
  saveSubjects();
  newSubject.value = "";
  fillSelect();
  renderSubjects();
}

daySelect.addEventListener("change", function () {
  day = daySelect.value;
  renderDay();
});

addSubjectBtn.addEventListener("click", createSubject);
newSubject.addEventListener("keydown", function (e) {
  if (e.key === "Enter") createSubject();
});

renderDay();
fillSelect();
renderSubjects();
