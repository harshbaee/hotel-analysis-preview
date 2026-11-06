// Rooms: how full was the hotel, and when? Every night of the year from Vega's daily report.
(function () {
  const D = window.Dash;
  const { H, M, SHORT, LONG, pct, int, sum } = D;
  const days = H.daily.map((r) => {
    const date = new Date(Number(String(r.Date).match(/\d+/)[0]) + 432e5);
    return { ...r, date, rate: r.available ? r.occupied / r.available : 0, m: D.monthIndex(r.Date) };
  });
  console.assert(Math.abs(sum(days.map((d) => d.occupied)) - D.T.nights_occ) < 0.5, "rooms: nights add up");
  const level = (r) => (r >= 0.8 ? "#D9604A" : r >= 0.5 ? "#EC9F8E" : r >= 0.3 ? "#F2C46D" : r > 0 ? "#BFDCF2" : "#E6EBEF");
  const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const inScope = (i) => (i === null ? days : days.filter((d) => d.m === i));
  const nice = (d) => d.date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const full = days.filter((d) => d.rate >= 0.8), thin = days.filter((d) => d.rate < 0.2);

  // The showcase's liquid-glass lens (liquid-glass-js, from js/fx.js) over the calendar: drag it to read a month.
  // It refracts a static copy of the squares, lives only while the calendar is on screen, and stays off on phones.
  function glassLens(wrap, cal, onMonth) {
    const none = { goTo() {}, refresh() {} };
    if (!window.FX || matchMedia("(max-width: 860px)").matches) return none;
    const SIZE = 104;
    const handle = Object.assign(document.createElement("div"), { className: "lens-handle", tabIndex: 0 });
    Object.assign(handle.style, { width: `${SIZE}px`, height: `${SIZE}px` });
    handle.setAttribute("role", "slider");
    handle.setAttribute("aria-label", "Magnifying glass over the nights");
    wrap.appendChild(handle);
    let glass = null, pos = { x: 120, y: 30 }, dragging = false, last = null;
    const place = () => { const b = wrap.getBoundingClientRect(); glass?.moveTo(b.left + pos.x, b.top + pos.y); handle.style.transform = `translate(${pos.x}px, ${pos.y}px)`; };
    const clamp = (p) => { const b = cal.getBoundingClientRect(); return { x: Math.min(Math.max(p.x, -SIZE / 4), b.width - SIZE * 0.75), y: Math.min(Math.max(p.y, 0), b.height - SIZE * 0.8) }; };
    // The month under the lens centre: the night square the centre sits on.
    const monthUnder = () => {
      const b = wrap.getBoundingClientRect();
      const hit = document.elementsFromPoint(b.left + pos.x + SIZE / 2, b.top + pos.y + SIZE / 2).find((e) => e.dataset && e.dataset.m !== undefined);
      return hit ? Number(hit.dataset.m) : null;
    };
    const moveTo = (p) => {
      pos = clamp(p); place();
      const m = monthUnder();
      if (m !== null && m !== last) { last = m; handle.setAttribute("aria-valuetext", D.LONG[m]); onMonth(m); }
    };
    handle.addEventListener("pointerdown", (e) => {
      dragging = true; handle.setPointerCapture(e.pointerId);
      const start = { x: e.clientX, y: e.clientY, p: { ...pos } };
      const move = (ev) => moveTo({ x: start.p.x + ev.clientX - start.x, y: start.p.y + ev.clientY - start.y });
      const up = () => { dragging = false; handle.removeEventListener("pointermove", move); handle.removeEventListener("pointerup", up); };
      handle.addEventListener("pointermove", move); handle.addEventListener("pointerup", up);
    });
    handle.addEventListener("keydown", (e) => {
      const step = { ArrowLeft: [-17, 0], ArrowRight: [17, 0], ArrowUp: [0, -17], ArrowDown: [0, 17] }[e.key];
      if (step) { e.preventDefault(); moveTo({ x: pos.x + step[0], y: pos.y + step[1] }); }
    });
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !glass && wrap.isConnected) {
        glass = new FX.LiquidGlass({ background: cal, width: SIZE, height: SIZE, radius: SIZE / 2, scale: 60, depth: 50, curvature: 2.2, convexity: 1,
          chroma: 0.14, edge: 0.85, glow: 0.2, draggable: false, zIndex: 30 });
        place();
      } else if ((!e.isIntersecting || !wrap.isConnected) && glass) { glass.destroy(); glass = null; }
    }, { threshold: 0.2 });
    io.observe(wrap);
    const follow = () => { if (!wrap.isConnected) { io.disconnect(); glass?.destroy(); glass = null; removeEventListener("scroll", follow); return; } place(); };
    addEventListener("scroll", follow, { passive: true });
    addEventListener("resize", follow);
    // Leaving the view removes the calendar: take the lens with it.
    new MutationObserver((_, mo) => { if (!wrap.isConnected) { follow(); mo.disconnect(); } }).observe(document.getElementById("view"), { childList: true });
    return {
      goTo(i) {
        if (i !== null && !dragging && i !== last) {
          const days = [...cal.querySelectorAll(`.day[data-m="${i}"]`)], mid = days[Math.floor(days.length / 2)];
          if (mid) { const w = wrap.getBoundingClientRect(), c = mid.getBoundingClientRect(); last = i; pos = clamp({ x: c.left - w.left - SIZE / 2 + c.width / 2, y: c.top - w.top - SIZE / 2 + c.height / 2 }); place(); }
        }
        requestAnimationFrame(() => glass?.refresh());
      },
      refresh() { requestAnimationFrame(() => glass?.refresh()); },
    };
  }

  D.register("rooms", {
    title: "Rooms",
    finding(i) {
      if (i === null) return `The hotel was at least 80% full on <strong>${full.length} nights</strong>, all between ${nice(full[0])} and ${nice(full[full.length - 1])}; on <strong>${thin.length} nights</strong> it sold fewer than one room in five.`;
      const ds = inScope(i), top = ds.reduce((a, b) => (b.rate > a.rate ? b : a));
      return `${LONG[i]}: <strong>${pct(M[i].occupancy, 0)}</strong> of rooms occupied; the fullest night was <strong>${nice(top)}</strong> at ${pct(top.rate, 0)}.`;
    },
    html: `<section class="grid" aria-label="Rooms">
      <article class="card span-12">
        <div class="card-head"><h2>Every night of the year</h2>
          <p class="legend"><span><i style="background:#E6EBEF"></i>None sold</span><span><i style="background:#BFDCF2"></i>Under 30%</span><span><i style="background:#F2C46D"></i>30 to 50%</span><span><i style="background:#EC9F8E"></i>50 to 80%</span><span><i style="background:#D9604A"></i>80% or more</span></p></div>
        <div class="cal-wrap" id="rm-cal-wrap"><div class="chart" id="rm-cal"></div></div>
        <p class="muted cal-note" id="rm-cal-note">One square per night: rooms occupied ÷ rooms available. Drag the glass, or click a night, to read its month.</p>
      </article>
      <article class="card kpis"><dl class="kpi-row" id="rm-kpis"></dl></article>
      <article class="card span-7">
        <div class="card-head"><h2>Occupancy by month</h2><p class="muted">Year average ${pct(D.T.occupancy)}</p></div>
        <div class="chart" id="rm-months"></div>
      </article>
      <article class="card span-5">
        <div class="card-head"><h2 id="rm-week-title">Occupancy by night of the week</h2></div>
        <div class="chart" id="rm-week"></div>
        <p class="scrawl-inline" id="rm-week-note"></p>
      </article>
    </section>`,
    mount(host) {
      const q = (id) => host.querySelector(`#${id}`);
      const pickM = (m) => D.pick(D.state.month === m ? null : m);
      const cal = Charts.calendar(q("rm-cal"), {
        days, colour: (d) => level(d.rate), monthOf: (d) => d.m, onPick: pickM, tip: D.tip,
        describe: (d) => `<b>${nice(d)}</b><br>${int(d.occupied)} of ${int(d.available)} rooms · ${pct(d.rate, 0)}<br>${int(d.arrivals)} arrivals · ${int(d.covers_day + d.covers_eve)} covers`,
      });
      const lens = glassLens(q("rm-cal-wrap"), q("rm-cal"), pickM);
      const set = D.kpiStrip(q("rm-kpis"), ["Occupancy", "Room-nights sold", "Room arrivals", "Fullest night"]);
      const months = Charts.columns(q("rm-months"), {
        labels: SHORT, values: M.map((m) => m.occupancy), colour: (v) => D.bandColour(v), height: 230, width: 620, valueFormat: (v) => pct(v, 0),
        aria: "Occupancy by month", onPick: pickM, tip: D.tip,
        describe: (i, rich) => (rich ? `<b>${LONG[i]}</b><br>${pct(M[i].occupancy)} of rooms occupied` : `${LONG[i]}: ${pct(M[i].occupancy)} occupied`),
      });
      let week = null;
      return {
        theme() { lens.refresh(); },
        update(i) {
          cal.select(i);
          lens.goTo(i);
          months.select(i);
          const ds = inScope(i), occ = sum(ds.map((d) => d.occupied)), avail = sum(ds.map((d) => d.available));
          const top = ds.reduce((a, b) => (b.rate > a.rate ? b : a));
          set(0, occ / avail, (v) => pct(v), i === null ? "of all room-nights" : `year: ${pct(D.T.occupancy)}`);
          set(1, occ, int, `of ${int(avail)} available`);
          set(2, sum(ds.map((d) => d.arrivals)), int, i === null ? `${int(D.T.guest_nights)} guest-nights` : `${pct(sum(ds.map((d) => d.arrivals)) / D.T.arrivals)} of the year`);
          set(3, nice(top), null, `${pct(top.rate, 0)} full`);
          // Night of the week, for the chosen period.
          const rates = WEEK.map((_, k) => { const w = ds.filter((d) => (d.date.getDay() + 6) % 7 === k); return sum(w.map((d) => d.occupied)) / Math.max(1, sum(w.map((d) => d.available))); });
          q("rm-week-title").textContent = i === null ? "Occupancy by night of the week" : `By night of the week, ${SHORT[i]}`;
          week = Charts.columns(q("rm-week"), {
            labels: WEEK, values: rates, colour: (v) => D.bandColour(v), height: 230, width: 420, valueFormat: (v) => pct(v, 0),
            aria: "Occupancy by night of the week", tip: D.tip,
            describe: (k, rich) => (rich ? `<b>${WEEK[k]}</b><br>${pct(rates[k])} of rooms occupied` : `${WEEK[k]}: ${pct(rates[k])}`),
          });
          const hi = rates.indexOf(Math.max(...rates)), lo = rates.indexOf(Math.min(...rates));
          q("rm-week-note").textContent = `${WEEK[hi]} is the fullest night, ${WEEK[lo]} the emptiest`;
        },
      };
    },
  });
})();
