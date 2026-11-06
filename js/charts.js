// Small SVG charts drawn to the dashboard's rules: straight lines, faint gridlines, no chart chrome,
// every mark reachable by keyboard, and a state that updates in place so changes can animate.
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const el = (name, attrs = {}, parent) => {
    const node = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (parent) parent.appendChild(node);
    return node;
  };
  // Round tick steps (1, 2, 2.5, 5 x 10^n) with the top tick above the maximum.
  function ticks(max, count = 4) {
    const raw = max / count, mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
    const top = Math.ceil(max / step) * step;
    return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  }
  // The same round steps over a range that may go below zero.
  function ticksRange(min, max, count = 4) {
    if (min >= 0) return ticks(max, count);
    const raw = (max - min) / count, mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
    const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
    return Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
  }
  function activate(node, label, onPick) {
    node.setAttribute("tabindex", "0");
    node.setAttribute("role", "button");
    node.setAttribute("aria-label", label);
    node.addEventListener("click", onPick);
    node.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(); } });
  }

  // The mill wheel: one paddle per month, as long as that month's value; picking one turns it to the top.
  function wheel(host, { values, labels, names, colour, describe, onPick }) {
    const svg = el("svg", { viewBox: "0 0 400 400", class: "wheel", role: "group", "aria-label": "Mill wheel of the twelve months" });
    const defs = el("defs", {}, svg);
    const f = el("filter", { id: "rough", x: "-5%", y: "-5%", width: "110%", height: "110%" }, defs);
    el("feTurbulence", { type: "fractalNoise", baseFrequency: "0.85", numOctaves: "2", seed: "7", result: "n" }, f);
    el("feDisplacementMap", { in: "SourceGraphic", in2: "n", scale: "3.5" }, f);
    const rotor = el("g", { class: "rotor" }, svg);
    const rim = 92, inner = 80;
    const paddles = values.map((v, i) => {
      const g = el("g", { class: "paddle", transform: `rotate(${i * 30} 200 200)` }, rotor);
      const tip = rim + 14 + v * 80; // the fullest month (78%) stops short of the month labels
      el("rect", { x: 186, y: 200 - tip, width: 28, height: tip - inner, rx: 3, fill: colour(v), filter: "url(#rough)" }, g);
      activate(g, describe(i), () => onPick(i));
      return g;
    });
    const frame = el("g", { fill: "none", stroke: "#26323B", "stroke-linecap": "round", filter: "url(#rough)" }, rotor);
    for (let i = 0; i < 12; i++) {
      const a = (i * 30 - 90) * Math.PI / 180;
      el("line", { x1: 200 + 22 * Math.cos(a), y1: 200 + 22 * Math.sin(a), x2: 200 + rim * Math.cos(a), y2: 200 + rim * Math.sin(a), "stroke-width": 4 }, frame);
    }
    el("circle", { cx: 200, cy: 200, r: rim, "stroke-width": 9 }, frame);
    el("circle", { cx: 200, cy: 200, r: 58, fill: "#FFFFFF", "stroke-width": 3.5 }, frame);
    const marks = labels.map((t, i) => {
      const g = el("g", { class: "label", transform: `rotate(${i * 30} 200 200)` }, rotor);
      const text = el("text", { x: 200, y: 200 - 188, "text-anchor": "middle", "dominant-baseline": "middle", class: "month-text" }, g);
      text.textContent = t;
      return { g, text, angle: i * 30 };
    });
    const hub = el("text", { x: 200, y: 203, "text-anchor": "middle", class: "hub-label" }, svg);
    const hubSub = el("text", { x: 200, y: 224, "text-anchor": "middle", class: "hub-sub" }, svg);
    host.replaceChildren(svg);
    // Arrow keys step through the months from any paddle.
    svg.addEventListener("keydown", (e) => {
      const at = paddles.indexOf(document.activeElement);
      if (at < 0 || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
      e.preventDefault();
      const next = (at + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : 11)) % 12;
      paddles[next].focus();
      onPick(next);
    });
    let turn = 0;
    return {
      set(pick, hubText, hubSmall) {
        // Turn the shortest way round, so the wheel never spins a full circle backwards.
        const target = pick === null ? 0 : -pick * 30; // the whole year turns October back to the top
        turn += ((((target - turn) % 360) + 540) % 360) - 180;
        rotor.style.transform = `rotate(${turn}deg)`;
        marks.forEach((m, i) => { m.text.style.transform = `rotate(${-(m.angle + turn)}deg)`; m.g.classList.toggle("on", i === pick); });
        paddles.forEach((p, i) => { p.classList.toggle("on", i === pick); p.setAttribute("aria-pressed", String(i === pick)); });
        svg.classList.toggle("has-pick", pick !== null);
        hub.textContent = hubText;
        hubSub.textContent = hubSmall;
      },
    };
  }

  // Lines over months with a faint area under the first series; a band marks the chosen month.
  function lines(host, { labels, series, format, axisFormat, describe, onPick, tip, width = 760, height = 270 }) {
    const W = width, H = height, L = 56, R = 12, T = 12, B = 30;
    const all = series.flatMap((s) => s.values);
    const ys = ticksRange(Math.min(0, ...all), Math.max(...all), 5);
    const x = (i) => L + (i + 0.5) * ((W - L - R) / labels.length);
    const y = (v) => T + (H - T - B) * (1 - (v - ys[0]) / (ys[ys.length - 1] - ys[0]));
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": series.map((s) => s.name).join(" and ") + " by month" });
    ys.forEach((t) => {
      el("line", { x1: L, x2: W - R, y1: y(t), y2: y(t), class: "grid-line" }, svg);
      el("text", { x: L - 8, y: y(t) + 4, "text-anchor": "end", class: "axis-text" }, svg).textContent = axisFormat(t);
    });
    const colW = (W - L - R) / labels.length;
    const band = el("rect", { x: L, y: T, width: colW, height: H - T - B, rx: 8, class: "band" }, svg);
    band.style.opacity = 0;
    labels.forEach((t, i) => { el("text", { x: x(i), y: H - 8, "text-anchor": "middle", class: "axis-text" }, svg).textContent = t; });
    series.forEach((s, k) => {
      const d = s.values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
      if (k === 0) el("path", { d: `${d}L${x(s.values.length - 1)},${y(0)}L${x(0)},${y(0)}Z`, fill: s.colour, opacity: 0.14 }, svg);
      if (k === 0 && ys[0] < 0) el("line", { x1: L, x2: W - R, y1: y(0), y2: y(0), stroke: "#26323B", "stroke-opacity": 0.45, "stroke-width": 1 }, svg);
      const path = el("path", { d, class: "line", stroke: s.colour }, svg);
      path.style.setProperty("--len", 1);
      s.dots = s.values.map((v, i) => el("circle", { cx: x(i), cy: y(v), r: 0, fill: s.colour, class: "dot" }, svg));
      s.path = path;
    });
    const mark = el("g", { class: "mark", "aria-hidden": "true" }, svg);
    const markPath = el("path", { class: "mark-path", pathLength: 1 }, mark);
    const markText = el("text", { class: "mark-text", "text-anchor": "middle" }, mark);
    labels.forEach((t, i) => {
      const hit = el("rect", { x: L + i * colW, y: T, width: colW, height: H - T - B, class: "hit" }, svg);
      activate(hit, describe(i), () => onPick(i));
      const show = () => { const b = hit.getBoundingClientRect(); tip(describe(i, true), b.left + b.width / 2, b.top + 8); series.forEach((s) => s.dots[i].setAttribute("r", 5)); };
      const hide = () => { tip(null); series.forEach((s) => s.dots[i].setAttribute("r", s.picked === i ? 5 : 0)); };
      hit.addEventListener("mouseenter", show); hit.addEventListener("focus", show);
      hit.addEventListener("mouseleave", hide); hit.addEventListener("blur", hide);
    });
    host.replaceChildren(svg);
    // Draw the lines in on first show.
    series.forEach((s) => {
      const len = s.path.getTotalLength();
      s.path.animate([{ strokeDasharray: len, strokeDashoffset: len }, { strokeDasharray: len, strokeDashoffset: 0 }],
        { duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 900, easing: "cubic-bezier(.2,.8,.2,1)" });
    });
    // A loose, overshooting loop like a marker pen's, the same wobble each time for a given month.
    function loop(cx, cy, rx, ry, seed) {
      const pts = [];
      for (let k = 0; k <= 44; k++) {
        const a = -2.3 + k / 44 * (Math.PI * 2 + 0.6), w = 1 + 0.07 * Math.sin(3 * a + seed) + 0.04 * Math.sin(5 * a + seed * 2);
        pts.push(`${k ? "L" : "M"}${(cx + rx * w * Math.cos(a)).toFixed(1)},${(cy + ry * w * Math.sin(a)).toFixed(1)}`);
      }
      return pts.join("");
    }
    return {
      mark(i, note) {
        if (i === null) { mark.style.opacity = 0; return; }
        const cx = x(i), cy = y(series[0].values[i]);
        markPath.setAttribute("d", loop(cx, cy, 22, 16, i * 1.7));
        // The note goes where no line runs: under the point when the other series is above it,
        // over it when there is room, otherwise beside it on the side away from the year's end.
        const otherAbove = series.slice(1).some((o) => o.values[i] > series[0].values[i]);
        const left = i >= labels.length / 2, side = !otherAbove && cy - 34 <= T;
        markText.setAttribute("text-anchor", side ? (left ? "end" : "start") : "middle");
        markText.setAttribute("x", side ? cx + (left ? -28 : 28) : Math.min(Math.max(cx, L + 50), W - 60));
        markText.setAttribute("y", otherAbove ? cy + 36 : side ? cy + 5 : cy - 24);
        markText.textContent = note;
        mark.style.opacity = 1;
        if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
          markPath.animate([{ strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDasharray: 1, strokeDashoffset: 0 }], { duration: 650, easing: "cubic-bezier(.3,.7,.2,1)" });
          markText.animate([{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], { duration: 400, delay: 350, fill: "backwards" });
        }
      },
      select(i) {
        band.style.transform = `translateX(${(i ?? 0) * colW}px)`;
        band.style.opacity = i === null ? 0 : "";
        series.forEach((s) => { s.picked = i; s.dots.forEach((d, j) => d.setAttribute("r", j === i ? 5 : 0)); });
      },
    };
  }

  const motionOK = () => !matchMedia("(prefers-reduced-motion: reduce)").matches;
  function hover(node, html, tip) {
    const show = () => { const b = node.getBoundingClientRect(); tip(html(), b.left + b.width / 2, b.top); };
    node.addEventListener("mouseenter", show); node.addEventListener("focus", show);
    node.addEventListener("mouseleave", () => tip(null)); node.addEventListener("blur", () => tip(null));
  }
  const grow = (bars, origin) => {
    if (!motionOK()) return;
    bars.forEach((r, i) => r.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: 600, delay: 150 + i * 40, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }));
  };

  // Columns per month around a zero line (negative months hang below it); click or press to pick a month.
  function columns(host, { labels, values, colour, describe, onPick, tip, height = 120, width = 560, aria = "Columns by month", valueFormat }) {
    const W = width, H = height, B = 20, top = valueFormat ? 20 : 2, gap = Math.max(4, width / values.length * 0.22);
    const hi = Math.max(0, ...values), lo = Math.min(0, ...values), span = hi - lo || 1;
    const zero = top + (H - B - top - (lo < 0 && valueFormat ? 16 : 0)) * hi / span;
    const scale = (H - B - top - (lo < 0 && valueFormat ? 16 : 0)) / span;
    const colW = W / values.length;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": aria });
    el("line", { x1: 0, x2: W, y1: zero, y2: zero, stroke: "#26323B", "stroke-opacity": 0.35, "stroke-width": 1 }, svg);
    const bars = values.map((v, i) => {
      const h = Math.abs(v) * scale;
      const r = el("rect", { x: i * colW + gap / 2, y: v >= 0 ? zero - h : zero, width: colW - gap, height: Math.max(h, 1), rx: 3, fill: colour(v, i), class: "col" }, svg);
      r.style.transformOrigin = `0 ${zero}px`;
      if (valueFormat) el("text", { x: i * colW + colW / 2, y: v >= 0 ? zero - h - 6 : zero + h + 14, "text-anchor": "middle", class: "value-text" }, svg).textContent = valueFormat(v);
      el("text", { x: i * colW + colW / 2, y: H - 4, "text-anchor": "middle", class: "axis-text" }, svg).textContent = labels[i];
      const hit = el("rect", { x: i * colW, y: 0, width: colW, height: H - B, class: "hit" }, svg);
      // Month columns pick a month; other columns only explain themselves.
      if (onPick) activate(hit, describe(i), () => onPick(i)); else { hit.setAttribute("tabindex", "0"); hit.setAttribute("aria-label", describe(i)); hit.style.cursor = "default"; }
      hover(hit, () => describe(i, true), tip);
      return r;
    });
    host.replaceChildren(svg);
    grow(bars);
    return { select(i) { bars.forEach((r, j) => r.classList.toggle("dim", i !== null && j !== i)); } };
  }

  // Stacked columns per month (two or three parts), split by a 2px seam.
  function stacked(host, { labels, series, describe, onPick, tip, height = 260, width = 760, aria, valueFormat }) {
    const W = width, H = height, B = 22, top = 8, colW = W / labels.length, gap = colW * 0.26;
    const totals = labels.map((_, i) => series.reduce((s, x) => s + x.values[i], 0));
    const scale = (H - B - top) / Math.max(...totals);
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": aria });
    const cols = labels.map((t, i) => {
      const g = el("g", { class: "stack" }, svg);
      let y0 = H - B;
      series.forEach((s) => {
        const h = s.values[i] * scale;
        el("rect", { x: i * colW + gap / 2, y: y0 - h, width: colW - gap, height: Math.max(h - 2, 0), rx: 2, fill: s.colour }, g);
        if (valueFormat && h > 18) el("text", { x: i * colW + colW / 2, y: y0 - h / 2 + 4, "text-anchor": "middle", class: "seg-text" }, g).textContent = valueFormat(s.values[i]);
        y0 -= h;
      });
      g.style.transformOrigin = `0 ${H - B}px`;
      el("text", { x: i * colW + colW / 2, y: H - 5, "text-anchor": "middle", class: "axis-text" }, svg).textContent = t;
      const hit = el("rect", { x: i * colW, y: 0, width: colW, height: H - B, class: "hit" }, svg);
      activate(hit, describe(i), () => onPick(i));
      hover(hit, () => describe(i, true), tip);
      return g;
    });
    host.replaceChildren(svg);
    grow(cols);
    return { select(i) { cols.forEach((g, j) => g.classList.toggle("dim", i !== null && j !== i)); } };
  }

  // A thin ring of up to five parts; the segments glide to their new shares on update.
  function ring(host, { size = 200, stroke = 20 } = {}) {
    const c = size / 2, r = (size - stroke) / 2;
    const svg = el("svg", { viewBox: `0 0 ${size} ${size}`, class: "ring", role: "img" });
    el("circle", { cx: c, cy: c, r, fill: "none", stroke: "#EEF1F4", "stroke-width": stroke }, svg);
    const segs = [];
    const big = el("text", { x: c, y: c + 4, "text-anchor": "middle", class: "ring-big" }, svg);
    const small = el("text", { x: c, y: c + 24, "text-anchor": "middle", class: "ring-small" }, svg);
    host.replaceChildren(svg);
    return {
      update(parts, bigText, smallText, aria) {
        const total = parts.reduce((s, p) => s + Math.max(0, p.value), 0) || 1;
        while (segs.length < parts.length) segs.push(el("circle", { cx: c, cy: c, r, fill: "none", "stroke-width": stroke, pathLength: 100, transform: `rotate(-90 ${c} ${c})`, class: "seg" }, svg));
        let acc = 0;
        parts.forEach((p, k) => {
          const share = Math.max(0, p.value) / total * 100;
          segs[k].setAttribute("stroke", p.colour);
          segs[k].style.strokeDasharray = `${Math.max(share - 0.8, 0)} 100`;
          segs[k].style.strokeDashoffset = `${-acc}`;
          acc += share;
        });
        svg.appendChild(big); svg.appendChild(small);
        big.textContent = bigText; small.textContent = smallText;
        svg.setAttribute("aria-label", aria);
      },
    };
  }

  // A sorted list of bars in HTML; widths glide when the values change.
  function barList(host, rows, { format, note } = {}) {
    host.innerHTML = `<ul class="barlist">${rows.map((r) => `<li data-key="${r.key}"><span class="bl-label">${r.label}</span>
      <span class="bl-track"><span class="bl-fill" style="background:${r.colour}"></span></span><b class="bl-value"></b>${note ? '<span class="bl-note"></span>' : ""}</li>`).join("")}</ul>`;
    const items = [...host.querySelectorAll("li")];
    return {
      update(values, max = Math.max(...Object.values(values), 1)) {
        items.forEach((li) => {
          const v = values[li.dataset.key] || 0;
          li.querySelector(".bl-fill").style.width = `${Math.max(0, v) / max * 100}%`;
          li.querySelector(".bl-value").textContent = format(v);
          if (note) li.querySelector(".bl-note").textContent = note(li.dataset.key, v);
          li.classList.toggle("zero", !v);
        });
      },
    };
  }

  // Every night of the year as a square, weeks across and Monday to Sunday down.
  function calendar(host, { days, colour, describe, onPick, tip, monthOf }) {
    const cell = 14, step = 17, left = 34, top = 20;
    const lead = (days[0].date.getDay() + 6) % 7; // 0 = Monday
    const weeks = Math.ceil((lead + days.length) / 7);
    const W = left + weeks * step, H = top + 7 * step;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "calendar", role: "img", "aria-label": "Occupancy of every night of the year, one square per night" });
    ["Mon", "", "Wed", "", "Fri", "", "Sun"].forEach((t, k) => { if (t) el("text", { x: left - 6, y: top + k * step + 11, "text-anchor": "end", class: "axis-text" }, svg).textContent = t; });
    let lastMonth = -1;
    const cells = days.map((d, n) => {
      const pos = lead + n, col = Math.floor(pos / 7), row = pos % 7;
      const m = monthOf(d);
      if (m !== lastMonth) { el("text", { x: left + col * step, y: top - 7, class: "axis-text" }, svg).textContent = d.date.toLocaleString("en-GB", { month: "short" }); lastMonth = m; }
      const r = el("rect", { x: left + col * step, y: top + row * step, width: cell, height: cell, rx: 3, fill: colour(d), class: "day" }, svg);
      r.dataset.n = n; r.dataset.m = m;
      return r;
    });
    svg.addEventListener("mouseover", (e) => { const n = e.target.dataset && e.target.dataset.n; if (n === undefined) return; const b = e.target.getBoundingClientRect(); tip(describe(days[n]), b.left + b.width / 2, b.top); });
    svg.addEventListener("mouseleave", () => tip(null));
    svg.addEventListener("click", (e) => { const m = e.target.dataset && e.target.dataset.m; if (m !== undefined) onPick(Number(m)); });
    host.replaceChildren(svg);
    if (motionOK()) cells.forEach((r, n) => r.animate([{ opacity: 0, transform: "scale(.3)" }, { opacity: 1, transform: "none" }], { duration: 300, delay: 100 + Math.floor((lead + n) / 7) * 14, fill: "backwards" }));
    return { select(m) { cells.forEach((r) => r.classList.toggle("dim", m !== null && Number(r.dataset.m) !== m)); } };
  }

  // Popularity (portions, log scale) against margin per portion, one dot per dish or drink.
  function scatter(host, { points, describe, tip, quadrants }) {
    const W = 760, H = 340, L = 54, R = 16, T = 16, B = 36;
    const xs = (p) => Math.log10(Math.max(p, 1));
    const xMax = 3, yMax = ticks(Math.max(...points.map((p) => p.y)))[ticks(Math.max(...points.map((p) => p.y))).length - 1];
    const yMin = Math.min(0, ...points.map((p) => p.y));
    const x = (p) => L + xs(p) / xMax * (W - L - R), y = (v) => T + (H - T - B) * (1 - (v - yMin) / (yMax - yMin));
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Menu items by portions sold and margin per portion" });
    ticks(yMax).forEach((t) => { el("line", { x1: L, x2: W - R, y1: y(t), y2: y(t), class: "grid-line" }, svg); el("text", { x: L - 8, y: y(t) + 4, "text-anchor": "end", class: "axis-text" }, svg).textContent = `€${t}`; });
    [1, 10, 100, 1000].forEach((p) => el("text", { x: x(p), y: H - 14, "text-anchor": "middle", class: "axis-text" }, svg).textContent = String(p));
    el("text", { x: (L + W) / 2, y: H - 1, "text-anchor": "middle", class: "axis-text" }, svg).textContent = "Portions sold in the year (log scale)";
    if (quadrants) {
      const qx = x(quadrants.x), qy = y(quadrants.y);
      el("line", { x1: qx, x2: qx, y1: T, y2: H - B, class: "quad-line" }, svg);
      el("line", { x1: L, x2: W - R, y1: qy, y2: qy, class: "quad-line" }, svg);
      [["Profitable, rarely ordered", L + 8, T + 16, "start"], ["Popular and profitable", W - R - 8, T + 16, "end"],
       ["Neither", L + 8, H - B - 8, "start"], ["Popular, lower margin", W - R - 8, H - B - 8, "end"]].forEach(([t, tx, ty, a]) =>
        el("text", { x: tx, y: ty, "text-anchor": a, class: "quad-text" }, svg).textContent = t);
    }
    const dots = points.map((p, i) => {
      const c = el("circle", { cx: x(p.x), cy: y(p.y), r: p.r, fill: p.colour, class: "pt" }, svg);
      c.dataset.i = i;
      return c;
    });
    svg.addEventListener("mouseover", (e) => { const i = e.target.dataset && e.target.dataset.i; if (i === undefined) return; const b = e.target.getBoundingClientRect(); tip(describe(points[i]), b.left + b.width / 2, b.top); });
    svg.addEventListener("mouseout", (e) => { if (e.target.dataset && e.target.dataset.i !== undefined) tip(null); });
    host.replaceChildren(svg);
    if (motionOK()) dots.forEach((c, i) => c.animate([{ opacity: 0, transform: "scale(0)" }, { opacity: 1, transform: "none" }], { duration: 450, delay: 100 + i * 3, fill: "backwards", easing: "cubic-bezier(.34,1.4,.5,1)" }));
    return { filter(keep) { dots.forEach((c, i) => c.classList.toggle("dim", !keep(points[i]))); } };
  }

  // A hundred coins, one per cent of sales; they change colour in reading order on update.
  function coins(host) {
    host.innerHTML = `<div class="coins">${Array.from({ length: 100 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</div>`;
    const items = [...host.querySelectorAll("i")];
    return {
      update(parts) {
        let k = 0;
        parts.forEach((p) => { for (let n = 0; n < p.count && k < 100; n++, k++) items[k].style.background = p.colour; });
        for (; k < 100; k++) items[k].style.background = "transparent";
      },
    };
  }

  window.Charts = { wheel, lines, columns, stacked, ring, barList, calendar, scatter, coins, ticks, ticksRange };
})();
