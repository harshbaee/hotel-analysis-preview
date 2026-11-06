// Hotel analysis: state, views and interactions. Data: window.HOTEL (js/data.js).
(function () {
  const H = window.HOTEL;
  const T = H.totals[0];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const SHORT = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
  const LONG = ["October 2025", "November 2025", "December 2025", "January 2026", "February 2026", "March 2026",
    "April 2026", "May 2026", "June 2026", "July 2026", "August 2026", "September 2026"];
  const sum = (a) => a.reduce((s, v) => s + v, 0);
  // "/Date(1759269600000)/" is local midnight on the 1st; noon UTC lands safely inside the month.
  const monthIndex = (key) => { const d = new Date(Number(String(key).match(/\d+/)[0]) + 432e5); return (d.getUTCFullYear() - 2025) * 12 + d.getUTCMonth() - 9; };

  // ---------- figures per month, built once and checked against the report's totals ----------
  const byMonth = (rows, value, keep = () => true) => {
    const out = Array(12).fill(0);
    rows.filter(keep).forEach((r) => { const i = monthIndex(r["Month start"]); if (i >= 0 && i < 12) out[i] += r[value] || 0; });
    return out;
  };
  const staffCats = ["Staff wages", "Payroll contributions"];
  const M = H.monthly.map((r, i) => ({ ...r, i, short: SHORT[i], long: LONG[i], covers: r.covers_day + r.covers_eve }));
  const menuMargin = byMonth(H.menu_month, "margin"), menuCosted = byMonth(H.menu_month, "costed");
  const staffM = byMonth(H.cost_month, "net", (r) => staffCats.includes(r.Category));
  const foodM = byMonth(H.cost_month, "net", (r) => r.Category === "Food purchases");
  M.forEach((m, i) => Object.assign(m, { marginPct: menuMargin[i] / menuCosted[i], staff: staffM[i], food: foodM[i] }));
  const close = (a, b, tol, what) => console.assert(Math.abs(a - b) <= tol, `${what}: ${a} vs ${b}`);
  close(sum(M.map((m) => m.profit)), T.profit, 1, "monthly profit adds up");
  close(sum(M.map((m) => m.sales)), T.sales_ex_vat, 1, "monthly sales add up");
  close(sum(staffM) + sum(foodM), sum(H.cost_categories.filter((r) => [...staffCats, "Food purchases"].includes(r.Category)).map((r) => r.running_net)), 0.01, "staff and food add up");
  close(sum(menuMargin), T.gross_margin, 1, "menu margin adds up");

  const year = {
    profit: T.profit, sales: T.sales_ex_vat, running: T.running_net, occupancy: T.occupancy, arrivals: T.arrivals,
    covers: T.covers_day + T.covers_eve, marginPct: T.gross_margin_pct, staff: T.staff, food: H.cost_categories.find((r) => r.Category === "Food purchases").running_net,
  };
  const best = M.reduce((a, b) => (b.occupancy > a.occupancy ? b : a));
  const worst = M.reduce((a, b) => (b.occupancy < a.occupancy ? b : a));
  const topProfit = M.reduce((a, b) => (b.profit > a.profit ? b : a));
  const topCovers = M.reduce((a, b) => (b.covers > a.covers ? b : a));
  const losses = M.filter((m) => m.profit < 0);
  const summer = sum(M.slice(8).map((m) => m.profit));

  // ---------- formatting ----------
  const nf = (d) => new Intl.NumberFormat("en-GB", { minimumFractionDigits: d, maximumFractionDigits: d });
  const eurK = (v, d = 0) => `${v < 0 ? "−" : ""}€${nf(d).format(Math.abs(v) / 1000)}K`;
  const eur = (v) => (Math.abs(v) >= 1e6 ? `€${nf(2).format(v / 1e6)}M` : eurK(v, Math.abs(v) < 1e5 ? 1 : 0));
  const pct = (v, d = 1) => `${nf(d).format(v * 100)}%`;
  const int = (v) => nf(0).format(Math.round(v));
  const list = (a) => (a.length > 1 ? `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}` : a[0] || "");
  const band = (v) => (v >= 0.5 ? "high" : v >= 0.3 ? "mid" : "low");
  const bandColour = (v) => (v >= 0.5 ? "#E58C7A" : v >= 0.3 ? "#E3A93C" : "#4F8FC9");

  // Count from the old value to the new one; the final text is always set exactly.
  function tween(node, to, format) {
    const from = Number(node.dataset.v ?? to);
    node.dataset.v = to;
    if (reduced.matches || from === to) { node.textContent = format(to); return; }
    const start = performance.now(), dur = 520;
    cancelAnimationFrame(node._raf);
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur), e = 1 - (1 - t) ** 3;
      node.textContent = format(from + (to - from) * e);
      if (t < 1) node._raf = requestAnimationFrame(step); else node.textContent = format(to);
    };
    node._raf = requestAnimationFrame(step);
  }

  // ---------- shared shell: the period control, the tooltip and the route ----------
  const state = { view: "overview", month: null };
  const theme = () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  const VIEWS = {};
  const $ = (id) => document.getElementById(id);
  const tipEl = $("tip");
  function tip(html, x, y) {
    if (!html) { tipEl.hidden = true; return; }
    tipEl.innerHTML = html; tipEl.hidden = false;
    tipEl.style.left = `${Math.min(Math.max(x, 140), innerWidth - 140)}px`; tipEl.style.top = `${y}px`;
  }
  const chips = $("month-chips");
  SHORT.forEach((s, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = s; b.setAttribute("aria-label", LONG[i]);
    b.addEventListener("click", () => pick(state.month === i ? null : i));
    chips.appendChild(b);
  });
  $("scope-year").addEventListener("click", () => pick(null));

  function go() {
    const [view, query] = (location.hash.slice(1) || "overview").split("?");
    const m = new URLSearchParams(query || "").get("m");
    const nextView = VIEWS[view] ? view : "overview";
    state.month = m === null || m === "" ? null : Math.max(0, Math.min(11, Number(m)));
    if (nextView !== state.view || !current) {
      state.view = nextView;
      const swap = () => render();
      if (document.startViewTransition && !reduced.matches && current) document.startViewTransition(swap); else swap();
    } else update();
  }
  function pick(i) {
    const hash = `#${state.view}${i === null ? "" : `?m=${i}`}`;
    history.replaceState(null, "", hash);
    state.month = i;
    update();
    $("announce").textContent = i === null ? "Showing the whole year" : `Showing ${LONG[i]}`;
  }

  let current = null;
  function render() {
    document.querySelectorAll(".nav a").forEach((a) => { if (a.dataset.view === state.view) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    const v = VIEWS[state.view];
    $("view-title").textContent = v.title;
    document.title = `${v.title} · Hotel analysis`;
    document.querySelector(".scope").hidden = Boolean(v.noMonths);
    const host = $("view");
    if (v.template) host.replaceChildren(document.getElementById(v.template).content.cloneNode(true));
    else host.innerHTML = v.html;
    host.querySelectorAll(".card").forEach((c, i) => { c.classList.add("reveal"); c.style.setProperty("--i", i); });
    current = v.mount ? v.mount(host) : {};
    update();
  }
  function update() {
    $("scope-year").setAttribute("aria-pressed", String(state.month === null));
    [...chips.children].forEach((b, i) => b.setAttribute("aria-pressed", String(i === state.month)));
    const v = VIEWS[state.view];
    $("view-finding").innerHTML = v.finding ? v.finding(state.month) : "";
    if (current && current.update) current.update(state.month);
  }

  // ---------- Overview ----------
  function overviewFinding(i) {
    if (i === null) return `June to September earned <strong>${pct(summer / T.profit, 0)}</strong> of the year's estimated profit; ${list(losses.map((m) => m.long.split(" ")[0]))} lost <strong>${eurK(-sum(losses.map((m) => m.profit)), 1)}</strong> together.`;
    const m = M[i];
    const tag = m === best ? ", the fullest month of the year" : m === worst ? ", the quietest month of the year" : m.profit < 0 ? ", a month that lost money" : "";
    return `${m.long}: <strong>${pct(m.occupancy, 0)}</strong> of rooms occupied, <strong>${eur(m.sales)}</strong> of sales without VAT and <strong>${eurK(m.profit, 1)}</strong> of estimated profit${tag}.`;
  }
  function streamNote(m) {
    if (m === best) return `Fullest month: ${pct(m.occupancy, 0)}`;
    if (m === worst) return "Quietest month";
    if (m === topProfit) return `Best profit: ${eurK(m.profit)}`;
    if (m === topCovers) return `Most covers: ${int(m.covers)}`;
    if (m.profit < 0) return `Lost ${eurK(-m.profit)}`;
    return `${eurK(m.profit)} profit`;
  }
  function mountOverview(host) {
    const q = (id) => host.querySelector(`#${id}`);
    // The showcase's 3D wheel (js/fx.js); the flat SVG wheel stays for computers without WebGL.
    const onPick = (i) => pick(state.month === i ? null : i);
    let w;
    try {
      if (!window.FX || !document.createElement("canvas").getContext("webgl2")) throw new Error("no WebGL");
      const wheel3d = FX.mountWheel(q("wheel"), { values: M.map((m) => m.occupancy), colour: bandColour, frame: FX.THEMES[theme()].frame,
        picked: null, onPick, still: reduced.matches, distance: 5.6 });
      w = { set(i) { wheel3d.update({ picked: i }); }, theme(t) { wheel3d.update({ frame: FX.THEMES[t].frame }); } };
    } catch {
      const flat = Charts.wheel(q("wheel"), { values: M.map((m) => m.occupancy), labels: SHORT, colour: bandColour,
        describe: (i) => `${LONG[i]}: ${pct(M[i].occupancy, 0)} of rooms occupied`, onPick });
      w = { set(i) { flat.set(i, i === null ? pct(T.occupancy) : pct(M[i].occupancy, 0), i === null ? "full, whole year" : LONG[i]); }, theme() {} };
    }
    const kpiDefs = [
      ["Sales without VAT", (s) => s.sales, eur, "sales"],
      ["Occupancy", (s) => s.occupancy, (v) => pct(v), "occupancy"],
      ["Room arrivals", (s) => s.arrivals, int, "arrivals"],
      ["Restaurant covers", (s) => s.covers, int, "covers"],
      ["Ingredient margin", (s) => s.marginPct, (v) => pct(v), "margin"],
    ];
    const kpis = q("ov-kpis");
    kpis.innerHTML = kpiDefs.map(([label]) => `<div><dt>${label}</dt><dd><span class="v"></span><span class="sub"></span></dd></div>`).join("");
    const line = Charts.lines(q("ov-line"), {
      labels: SHORT, axisFormat: (v) => (v ? `€${v / 1000}K` : "€0"),
      series: [{ name: "Sales without VAT", colour: "#4F8FC9", values: M.map((m) => m.sales) }, { name: "Running costs without VAT", colour: "#E58C7A", values: M.map((m) => m.running) }],
      describe: (i, rich) => (rich ? `<b>${LONG[i]}</b><br>Sales ${eur(M[i].sales)} · costs ${eur(M[i].running)}<br>Estimated profit ${eurK(M[i].profit, 1)}`
        : `${LONG[i]}: sales ${eur(M[i].sales)}, running costs ${eur(M[i].running)}, profit ${eurK(M[i].profit, 1)}`),
      onPick: (i) => pick(state.month === i ? null : i), tip,
    });
    const cols = Charts.columns(q("ov-cols"), {
      labels: SHORT.map((t) => t[0]), values: M.map((m) => m.profit), colour: (v) => (v < 0 ? "#E0674F" : "#26323B"),
      describe: (i, rich) => (rich ? `<b>${LONG[i]}</b><br>Estimated profit ${eurK(M[i].profit, 1)}` : `${LONG[i]}: estimated profit ${eurK(M[i].profit, 1)}`),
      onPick: (i) => pick(state.month === i ? null : i), tip,
    });
    q("ov-line-legend").innerHTML = `<span><i style="background:#4F8FC9"></i>Sales without VAT</span><span><i style="background:#E58C7A"></i>Running costs without VAT</span>`;
    const stream = q("ov-stream");
    stream.innerHTML = M.map((m) => `<li><button type="button" class="band-${band(m.occupancy)}" data-i="${m.i}" aria-label="${m.long}: ${pct(m.occupancy, 0)} occupied, ${streamNote(m)}">
      <span class="m">${m.short}</span><span class="v">${pct(m.occupancy, 0)}</span><span class="s">${streamNote(m)}</span></button></li>`).join("");
    stream.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) pick(state.month === Number(b.dataset.i) ? null : Number(b.dataset.i)); });
    const euro = q("ov-euro");
    const bar = (cls) => `<div class="euro-bar ${cls}" aria-hidden="true"><span style="background:#E58C7A"></span><span style="background:#E3A93C"></span><span style="background:#9FB3C2"></span><span style="background:#5DB08F"></span></div>`;
    euro.innerHTML = `${bar("this")}
      <ul class="euro-list" style="list-style:none;padding:0;margin:0"></ul>
      <div class="euro-year"><p class="muted">Whole year, for comparison</p>${bar("year")}</div><p class="euro-note"></p>`;
    const split = (s) => { const other = s.running - s.staff - s.food, profit = s.sales - s.running;
      return [["Staff wages and payroll", s.staff, "#E58C7A"], ["Food purchases", s.food, "#E3A93C"], ["Other running costs", other, "#9FB3C2"], [profit >= 0 ? "Left as estimated profit" : "Loss", profit, "#5DB08F"]]; };
    const fill = (node, s) => { const scale = Math.max(s.sales, s.running); node.querySelectorAll("span").forEach((sp, k) => { sp.style.flexGrow = Math.max(0, split(s)[k][1]) / scale; }); };
    fill(euro.querySelector(".euro-bar.year"), year);

    return {
      theme(t) { w.theme(t); },
      update(i) {
        const s = i === null ? year : M[i];
        q("ov-hero-label").textContent = i === null ? "Estimated operating profit, whole year" : `Estimated operating profit, ${LONG[i]}`;
        tween(q("ov-profit"), s.profit, (v) => eurK(v));
        q("ov-margin").textContent = `${pct(s.profit / s.sales)} of sales without VAT`;
        q("ov-hero").className = `card hero ${s.profit < 0 ? "tint-coral" : i === null ? "tint-sky" : "tint-mint"}`;
        q("ov-hero-note").textContent = "Sales without VAT minus running costs without VAT. An estimate for management, before depreciation, tax and the previous owner's loan; not audited accounts.";
        q("ov-scrawl").textContent = i === null ? `${pct(summer / T.profit, 0)} of it earned June to September` : s === best ? "best month!" : s.profit < 0 ? "a loss month" : "";
        w.set(i);
        q("wheel-reading").innerHTML = i === null ? `<strong>${pct(T.occupancy)}</strong> of rooms occupied over the year` : `<strong>${pct(s.occupancy, 0)}</strong> of rooms occupied in ${LONG[i]}`;
        [...kpis.children].forEach((cell, k) => {
          const [, get, fmt, key] = kpiDefs[k];
          tween(cell.querySelector(".v"), get(s), fmt);
          const sub = cell.querySelector(".sub");
          if (i === null) sub.textContent = { sales: `${int(T.invoices)} invoices`, occupancy: `${int(T.nights_occ)} of ${int(T.nights_avail)} room-nights`, arrivals: `${int(T.guest_nights)} guest-nights`, covers: `${pct(T.evening_share, 0)} in the evening`, margin: "on dishes with an estimated cost" }[key];
          else sub.textContent = key === "occupancy" || key === "margin" ? `year: ${fmt(get(year))}` : `${pct(get(s) / get(year))} of the year`;
        });
        line.select(i);
        cols.select(i);
        const peak = M.reduce((a, b) => (b.sales > a.sales ? b : a));
        line.mark(i === null ? peak.i : i, i === null ? "summer peak" : s === best ? "best month!" : s.profit < 0 ? "costs above sales" : `${SHORT[i]}: ${eur(s.sales)}`);
        stream.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.i) === i)));
        // Where each euro of sales goes: shares of sales; a loss month shows costs above 100%.
        const parts = split(s), profit = s.sales - s.running;
        fill(euro.querySelector(".euro-bar.this"), s);
        euro.querySelector(".euro-year").hidden = i === null;
        euro.querySelector(".euro-list").innerHTML = parts.map(([n, v, c]) => `<li><i style="background:${c}"></i><span>${n}</span><b>${v < 0 ? "−" : ""}${int(Math.abs(v) / s.sales * 100)}c</b></li>`).join("");
        q("ov-euro-title").textContent = i === null ? "Where each euro of sales goes" : `Where each euro went, ${SHORT[i]}`;
        euro.querySelector(".euro-note").textContent = profit >= 0 ? `Out of every euro of sales without VAT. ${eur(s.sales)} of sales in all.`
          : `Running costs were ${pct(s.running / s.sales, 0)} of sales this month, so each euro of sales lost ${int(-profit / s.sales * 100)} cents.`;
      },
    };
  }

  VIEWS.overview = { title: "Overview", template: "tpl-overview", finding: overviewFinding, mount: mountOverview };
  // A strip of key figures split by hairlines; numbers count to their new value, text is set as is.
  function kpiStrip(host, labels) {
    host.innerHTML = labels.map((l) => `<div><dt>${l}</dt><dd><span class="v"></span><span class="sub"></span></dd></div>`).join("");
    host.style.setProperty("--cols", labels.length);
    const cells = [...host.children];
    return (k, value, format, sub) => {
      const v = cells[k].querySelector(".v");
      if (typeof value === "number") tween(v, value, format); else v.textContent = value;
      cells[k].querySelector(".sub").textContent = sub || "";
    };
  }
  const scopeName = (i) => (i === null ? "the whole year" : LONG[i]);
  // Shared with the view modules in js/views/, which register themselves before the first route.
  window.Dash = {
    H, T, M, year, SHORT, LONG, sum, monthIndex, byMonth, staffCats, nf, eurK, eur, pct, int, list, band, bandColour,
    tween, tip, pick, state, best, worst, losses, summer, kpiStrip, scopeName, theme: () => theme(), reduced,
    register(key, def) { VIEWS[key] = def; },
  };
  // Light or dark, shared with the showcase page through one saved key. The sidebar's gradient field and
  // liquid logo come from js/fx.js, the showcase's own components.
  const SUN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>';
  const MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
  let side = [];
  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem("hotel-theme", t); } catch { /* private window: the choice lasts this visit only */ }
    const b = $("theme-toggle");
    b.setAttribute("aria-pressed", String(t === "dark"));
    b.innerHTML = t === "dark" ? SUN : MOON;
    side.forEach((m) => m.update({ theme: t }));
    if (current && current.theme) current.theme(t);
  }
  $("theme-toggle").addEventListener("click", () => setTheme(theme() === "dark" ? "light" : "dark"));
  document.addEventListener("DOMContentLoaded", () => {
    if (window.FX) {
      try {
        side = [FX.mountField($("side-field"), { theme: theme(), still: reduced.matches }),
          FX.mountLogo($("side-logo"), { theme: theme(), still: reduced.matches, className: "side-wordmark" })];
      } catch (e) { console.warn("Sidebar effects unavailable:", e.message); }
    }
    setTheme(theme());
  });
  addEventListener("hashchange", go);
  document.addEventListener("DOMContentLoaded", go);
})();
