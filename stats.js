const list = document.getElementById("list");
const ovPct = document.getElementById("ovPct");
const ovMeta = document.getElementById("ovMeta");

const now = new Date();
const ui = {};   // per subject: is the calendar open, which month is shown

function getUi(name) {
  if (!ui[name]) ui[name] = { open: false, year: now.getFullYear(), month: now.getMonth() };
  return ui[name];
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function dateStr(y, m, d) {
  return y + "-" + pad(m + 1) + "-" + pad(d);
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function noteKey(subject, d) {
  return d + "|" + subject;
}

// ---------- totals ----------
function buildTotals() {
  const totals = {};
  function ensure(name) {
    if (!totals[name]) totals[name] = { attended: 0, total: 0 };
  }
  allSubjects().forEach(ensure);

  Object.keys(records).forEach(function (key) {
    const subject = key.slice(key.indexOf("|") + 1);
    const sm = summary(records[key].periods);
    ensure(subject);
    totals[subject].attended += sm.attended;
    totals[subject].total += sm.marked;
  });
  return totals;
}

function check(att, tot) {
  if (tot === 0) return { pct: 0, cls: "warn", msg: "No classes marked yet." };

  const pct = att / tot * 100;

  if (pct >= TARGET) {
    const skip = Math.floor(att * 100 / TARGET - tot);
    if (skip > 0) {
      return { pct: pct, cls: "ok", msg: "Safe. You can miss " + skip + " more class" + (skip === 1 ? "" : "es") + "." };
    }
    return { pct: pct, cls: "warn", msg: "On the edge. Don't miss the next class." };
  }

  const need = Math.ceil((TARGET * tot - 100 * att) / (100 - TARGET));
  return { pct: pct, cls: "bad", msg: "Below target. Attend the next " + need + " class" + (need === 1 ? "" : "es") + " in a row." };
}

// ---------- the popup for one date ----------
function ask(subject, d) {
  const back = document.createElement("div");
  back.className = "modal-back";

  const box = document.createElement("div");
  box.className = "modal";

  const title = document.createElement("p");
  title.className = "modal-title";
  title.textContent = subject;
  const small = document.createElement("small");
  small.textContent = " " + d;
  title.appendChild(small);
  box.appendChild(title);

  const body = document.createElement("div");
  box.appendChild(body);

  function close() {
    back.remove();
    renderAll();
  }

  function change(fn) {
    const p = getPeriods(d, subject);
    fn(p);
    setPeriods(d, subject, p);
    drawBody();
  }

  function drawBody() {
    body.innerHTML = "";
    const periods = getPeriods(d, subject);

    // how many classes that day
    const step = document.createElement("div");
    step.className = "ctl";

    const lab = document.createElement("span");
    lab.textContent = "Classes that day";

    const minus = document.createElement("button");
    minus.textContent = "−";
    minus.disabled = periods.length <= 1;
    minus.addEventListener("click", function () { change(function (p) { p.pop(); }); });

    const n = document.createElement("span");
    n.className = "ctl-n";
    n.textContent = periods.length;

    const plus = document.createElement("button");
    plus.textContent = "+";
    plus.disabled = periods.length >= 4;
    plus.addEventListener("click", function () { change(function (p) { p.push(""); }); });

    step.append(lab, minus, n, plus);
    body.appendChild(step);

    // one row per class
    periods.forEach(function (status, j) {
      const row = document.createElement("div");
      row.className = "m-row";

      if (periods.length > 1) {
        const l = document.createElement("span");
        l.className = "plabel";
        l.textContent = "Class " + (j + 1);
        row.appendChild(l);
      }

      function pick(label, cls, value) {
        const b = document.createElement("button");
        b.className = "modal-btn " + cls + (status === value ? " current" : "") + (status && status !== value ? " dim" : "");
        b.textContent = label;
        b.addEventListener("click", function () {
          const p = getPeriods(d, subject);
          p[j] = p[j] === value ? "" : value;
          setPeriods(d, subject, p);
          if (p.length === 1) close();   // one class: done after one tap
          else drawBody();
        });
        row.appendChild(b);
      }

      pick("Present", "m-p", "p");
      pick("Absent", "m-a", "a");
      body.appendChild(row);
    });

    const none = document.createElement("button");
    none.className = "modal-btn m-n";
    none.textContent = "No class";
    none.addEventListener("click", function () {
      clearRecord(d, subject);
      close();
    });
    body.appendChild(none);

    const done = document.createElement("button");
    done.className = "modal-cancel";
    done.textContent = "Done";
    done.addEventListener("click", close);
    body.appendChild(done);
  }

  drawBody();

  // note box, below the buttons
  const wrap = document.createElement("div");
  wrap.className = "note-wrap";

  const note = document.createElement("input");
  note.className = "note-input";
  note.maxLength = 50;
  note.placeholder = "Note for this day (optional)";
  note.value = notes[noteKey(subject, d)] || "";

  const count = document.createElement("span");
  count.className = "note-count";
  count.textContent = note.value.length + "/50";

  note.addEventListener("input", function () {
    const v = note.value.trim();
    if (v === "") delete notes[noteKey(subject, d)];
    else notes[noteKey(subject, d)] = v;
    save("notes", notes);
    count.textContent = note.value.length + "/50";
  });

  wrap.append(note, count);
  box.appendChild(wrap);

  back.addEventListener("click", function (e) {
    if (e.target === back) close();
  });

  back.appendChild(box);
  document.body.appendChild(back);
}

// ---------- the month calendar ----------
function buildCalendar(subject, state) {
  const el = document.createElement("div");
  const year = state.year;
  const month = state.month;
  const today = dateStr(now.getFullYear(), now.getMonth(), now.getDate());

  const daysInMonth = new Date(year, month + 1, 0).getDate();   // 28, 29, 30 or 31
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;   // Monday first

  const head = document.createElement("div");
  head.className = "cal-head";

  const prev = document.createElement("button");
  prev.textContent = "‹";
  prev.addEventListener("click", function () {
    state.month--;
    if (state.month < 0) { state.month = 11; state.year--; }
    renderAll();
  });

  const next = document.createElement("button");
  next.textContent = "›";
  next.addEventListener("click", function () {
    state.month++;
    if (state.month > 11) { state.month = 0; state.year++; }
    renderAll();
  });

  const label = document.createElement("span");
  label.textContent = new Date(year, month, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });

  head.append(prev, label, next);
  el.appendChild(head);

  const grid = document.createElement("div");
  grid.className = "cal-grid";

  ["M", "T", "W", "T", "F", "S", "S"].forEach(function (l) {
    const s = document.createElement("span");
    s.className = "dow";
    s.textContent = l;
    grid.appendChild(s);
  });

  for (let i = 0; i < offset; i++) {
    const e = document.createElement("span");
    e.className = "cell empty";
    grid.appendChild(e);
  }

  let attended = 0, missed = 0;
  const noteLines = [];
  const monthShort = new Date(year, month, 1).toLocaleString("en-IN", { month: "short" });

  for (let n = 1; n <= daysInMonth; n++) {
    const d = dateStr(year, month, n);
    const r = records[recKey(d, subject)];
    const sm = summary(r ? r.periods : []);

    attended += sm.attended;
    missed += sm.marked - sm.attended;

    const colour = sm.cls === "s-all" ? " c-p" : sm.cls === "s-zero" ? " c-a" : sm.cls === "s-some" ? " c-m" : "";

    const cell = document.createElement("button");
    cell.className = "cell" + colour;
    cell.textContent = n;

    // small count under the date when there was more than one class
    if (sm.held > 1 && sm.marked > 0) {
      const sub = document.createElement("small");
      sub.textContent = sm.attended + "/" + sm.held;
      cell.appendChild(sub);
    }

    const nt = notes[noteKey(subject, d)];
    if (nt) {
      cell.classList.add("has-note");
      cell.title = nt;
      noteLines.push(n + " " + monthShort + ": " + nt);
    }

    if (d > today) {
      cell.disabled = true;           // future dates can't be marked
      cell.classList.add("future");
    } else {
      cell.addEventListener("click", function () { ask(subject, d); });
    }
    grid.appendChild(cell);
  }

  el.appendChild(grid);

  const sum = document.createElement("p");
  sum.className = "cal-sum";
  sum.textContent = attended + " attended, " + missed + " missed this month. Tap a date to change it.";
  el.appendChild(sum);

  noteLines.forEach(function (line) {
    const p = document.createElement("p");
    p.className = "cal-note";
    p.textContent = line;
    el.appendChild(p);
  });

  return el;
}

function inTimetable(name) {
  return namesInTimetable().indexOf(name) !== -1;
}

function deleteSubject(name) {
  // the subject list
  const at = subjects.indexOf(name);
  if (at !== -1) subjects.splice(at, 1);
  save(SUBJ_KEY, subjects);

  // all attendance records of this subject
  Object.keys(records).forEach(function (key) {
    if (key.slice(key.indexOf("|") + 1) === name) delete records[key];
  });
  save("records", records);

  // all notes of this subject
  Object.keys(notes).forEach(function (key) {
    if (key.slice(key.indexOf("|") + 1) === name) delete notes[key];
  });
  save("notes", notes);

  delete ui[name];
}

function confirmDelete(name) {
  const back = document.createElement("div");
  back.className = "modal-back";

  const box = document.createElement("div");
  box.className = "modal";

  const title = document.createElement("p");
  title.className = "modal-title";
  title.textContent = "Delete subject";
  box.appendChild(title);

  const warn = document.createElement("p");
  warn.className = "del-warn";
  warn.append("This permanently deletes all attendance and notes for ");
  const strong = document.createElement("strong");
  strong.textContent = name;
  warn.append(strong, ". Type the exact name to confirm:");
  box.appendChild(warn);

  const input = document.createElement("input");
  input.className = "note-input";
  input.placeholder = "Type the subject name";
  input.autocomplete = "off";
  box.appendChild(input);

  const go = document.createElement("button");
  go.className = "modal-btn m-a";
  go.textContent = "Delete permanently";
  go.disabled = true;

  input.addEventListener("input", function () {
    go.disabled = input.value !== name;      // exact match, capitals included
  });

  go.addEventListener("click", function () {
    if (input.value !== name) return;
    back.remove();
    deleteSubject(name);
    renderAll();
  });
  box.appendChild(go);

  const cancel = document.createElement("button");
  cancel.className = "modal-cancel";
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", function () { back.remove(); });
  box.appendChild(cancel);

  back.addEventListener("click", function (e) {
    if (e.target === back) back.remove();
  });

  back.appendChild(box);
  document.body.appendChild(back);
}

// ---------- draw the whole page ----------
function renderAll() {
  const totals = buildTotals();

  let allAtt = 0, allTot = 0;
  Object.values(totals).forEach(function (t) {
    allAtt += t.attended;
    allTot += t.total;
  });
  const overall = check(allAtt, allTot);
  ovPct.textContent = (allTot ? overall.pct.toFixed(1) : "0") + "%";
  ovMeta.textContent = allAtt + " of " + allTot + " classes attended";

  // lowest percentage first, subjects with no data last
  const names = Object.keys(totals).sort(function (a, b) {
    const ta = totals[a], tb = totals[b];
    if (ta.total === 0 && tb.total === 0) return 0;
    if (ta.total === 0) return 1;
    if (tb.total === 0) return -1;
    return ta.attended / ta.total - tb.attended / tb.total;
  });

  const frag = document.createDocumentFragment();

  if (names.length === 0) {
    const p = document.createElement("p");
    p.textContent = "No subjects yet.";
    frag.appendChild(p);
  }

  names.forEach(function (name) {
    const t = totals[name];
    const r = check(t.attended, t.total);
    const state = getUi(name);

    const card = document.createElement("div");
    card.className = "subject";

    card.innerHTML =
      '<div class="top"><span class="title">' + esc(name) + '</span>' +
      '<span class="pct ' + r.cls + '">' + (t.total ? r.pct.toFixed(1) : "0") + '%</span></div>' +
      '<div class="count">' + t.attended + ' attended of ' + t.total + '</div>' +
      '<div class="bar"><div class="fill bg-' + r.cls + '" style="width:' + Math.min(100, r.pct) + '%"></div>' +
      '<div class="tick" style="left:' + TARGET + '%"></div></div>' +
      '<p class="msg ' + r.cls + '">' + r.msg + '</p>';

    const btn = document.createElement("button");
    btn.className = "details-btn";
    btn.textContent = state.open ? "Hide details" : "Details";
    btn.addEventListener("click", function () {
      state.open = !state.open;
      renderAll();
    });
    card.appendChild(btn);

        if (!inTimetable(name)) {
      const del = document.createElement("button");
      del.className = "del-subject";
      del.textContent = "Delete subject";
      del.addEventListener("click", function () { confirmDelete(name); });
      card.appendChild(del);
    }

    if (state.open) card.appendChild(buildCalendar(name, state));

    frag.appendChild(card);
  });

  list.replaceChildren(frag);
}


const targetInput = document.getElementById("targetInput");
targetInput.value = TARGET;

targetInput.addEventListener("change", function () {
  const v = Math.round(Number(targetInput.value));
  if (!v || v < 1 || v > 99) {
    targetInput.value = TARGET;           // put the old value back
    alert("Enter a whole number from 1 to 99.");
    return;
  }
  setTarget(v);
  targetInput.value = TARGET;
  renderAll();
});

renderAll();