const params = new URLSearchParams(location.search);
const asked = params.get("day");
const day = ORDER.includes(asked) ? asked : "monday";

const title = document.getElementById("dayTitle");
const dateText = document.getElementById("dateText");
const list = document.getElementById("list");
const subjectSelect = document.getElementById("subjectSelect");

function dateOfDay(dayName) {
  const d = new Date();
  const diff = (d.getDay() - JS_DAY[dayName] + 7) % 7;
  d.setDate(d.getDate() - diff);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + dd;
}

const date = dateOfDay(day);
title.textContent = day[0].toUpperCase() + day.slice(1);
dateText.textContent = date;

// read this subject's periods, let fn change them, save, redraw
function change(name, fn) {
  const periods = getPeriods(date, name);
  fn(periods);
  setPeriods(date, name, periods);
  render();
}

// removes the subject from this weekday's timetable and clears THIS date only
function removeClass(name) {
  if (!confirm('Remove "' + name + '" from ' + title.textContent + ' timetable? This week\'s marks for it are cleared. Past weeks stay.')) return;
  timetable[day] = timetable[day].filter(function (n) { return n !== name; });
  clearRecord(date, name);
  save(TT_KEY, timetable);
  render();
}

function render() {
  list.innerHTML = "";

  const names = [];
  (timetable[day] || []).forEach(function (n) {
    if (names.indexOf(n) === -1) names.push(n);
  });

  if (names.length === 0) {
    list.textContent = "No classes on this day. Pick one below.";
    return;
  }

  names.forEach(function (name, i) {
    const periods = getPeriods(date, name);
    const sm = summary(periods);

    const card = document.createElement("div");
    card.className = "subject";

    // title + count badge
    const top = document.createElement("div");
    top.className = "top";

    const t = document.createElement("div");
    t.className = "title";
    t.textContent = (i + 1) + ". " + name;

    const badge = document.createElement("span");
    badge.className = "badge " + sm.cls;
    badge.textContent = sm.attended + "/" + sm.held;

    top.append(t, badge);
    card.appendChild(top);

    // one Present / Absent row per class period
    periods.forEach(function (status, j) {
      const row = document.createElement("div");
      row.className = "period";

      if (periods.length > 1) {
        const lab = document.createElement("span");
        lab.className = "plabel";
        lab.textContent = "Class " + (j + 1);
        row.appendChild(lab);
      }

      const presentBtn = document.createElement("button");
      presentBtn.className = "present";
      presentBtn.textContent = "Present";
      if (status === "a") presentBtn.classList.add("dim");
      presentBtn.addEventListener("click", function () {
        change(name, function (p) { p[j] = p[j] === "p" ? "" : "p"; });
      });

      const absentBtn = document.createElement("button");
      absentBtn.className = "absent";
      absentBtn.textContent = "Absent";
      if (status === "p") absentBtn.classList.add("dim");
      absentBtn.addEventListener("click", function () {
        change(name, function (p) { p[j] = p[j] === "a" ? "" : "a"; });
      });

      row.append(presentBtn, absentBtn);
      card.appendChild(row);
    });

    // how many classes of this subject today
    const ctl = document.createElement("div");
    ctl.className = "ctl";

    const label = document.createElement("span");
    label.textContent = "Classes today";

    const minus = document.createElement("button");
    minus.textContent = "−";
    minus.disabled = periods.length <= 1;
    minus.addEventListener("click", function () {
      change(name, function (p) { p.pop(); });
    });

    const count = document.createElement("span");
    count.className = "ctl-n";
    count.textContent = periods.length;

    const plus = document.createElement("button");
    plus.textContent = "+";
    plus.disabled = periods.length >= 4;
    plus.addEventListener("click", function () {
      change(name, function (p) { p.push(""); });
    });

    ctl.append(label, minus, count, plus);
    card.appendChild(ctl);

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove";
    removeBtn.textContent = "Remove this class";
    removeBtn.addEventListener("click", function () { removeClass(name); });
    card.appendChild(removeBtn);

    list.appendChild(card);
  });
}

function fillSelect() {
  subjectSelect.innerHTML = "";

  const first = document.createElement("option");
  first.value = "";
  first.textContent = "+ Add a class to this day…";
  subjectSelect.appendChild(first);

  allSubjects().forEach(function (n) {
    const o = document.createElement("option");
    o.value = n;
    o.textContent = n;
    subjectSelect.appendChild(o);
  });
}

subjectSelect.addEventListener("change", function () {
  const name = subjectSelect.value;
  subjectSelect.value = "";
  if (name === "") return;

  if ((timetable[day] || []).indexOf(name) !== -1) {
    alert('"' + name + '" is already on this day. Use the + button on its card for a second class.');
    return;
  }

  if (!timetable[day]) timetable[day] = [];
  timetable[day].push(name);
  save(TT_KEY, timetable);
  render();
});

fillSelect();
render();