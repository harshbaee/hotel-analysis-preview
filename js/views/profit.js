// Profit: what is left? Estimated operating profit = sales without VAT minus running costs without VAT.
(function () {
  const D = window.Dash;
  const { H, T, M, year, SHORT, LONG, pct, int, eur, eurK, sum } = D;
  const running = M.reduce((acc, m, i) => { acc.push((acc[i - 1] || 0) + m.profit); return acc; }, []);
  const low = running.indexOf(Math.min(...running));
  const backInBlack = running.findIndex((v, i) => i > low && v > 0);
  console.assert(Math.abs(running[11] - T.profit) < 1, "profit: the running total ends at the year's profit");
  const PARTS = [["Staff wages and payroll", "#E58C7A", (s) => s.staff], ["Food purchases", "#E3A93C", (s) => s.food],
    ["Other running costs", "#9FB3C2", (s) => s.running - s.staff - s.food], ["Left as estimated profit", "#5DB08F", (s) => s.sales - s.running]];
  // Largest remainder, so the hundred coins always add up to exactly 100.
  function cents(s) {
    const scale = Math.max(s.sales, s.running), exact = PARTS.map(([, , get]) => Math.max(0, get(s)) / scale * 100);
    const whole = exact.map(Math.floor);
    exact.map((v, k) => [v - whole[k], k]).sort((a, b) => b[0] - a[0]).slice(0, 100 - sum(whole)).forEach(([, k]) => whole[k]++);
    return whole;
  }

  D.register("profit", {
    title: "Profit",
    finding(i) {
      if (i === null) return `By the end of ${LONG[low].split(" ")[0]} the year was <strong>${eurK(-running[low], 1)} behind</strong>; it was back above zero in ${LONG[backInBlack].split(" ")[0]}, and summer took it to <strong>${eurK(T.profit, 1)}</strong>.`;
      return `${LONG[i]}: <strong>${eurK(M[i].profit, 1)}</strong> of estimated profit, ${pct(M[i].profit / M[i].sales)} of sales; the running total stood at <strong>${eurK(running[i], 1)}</strong> at the end of the month.`;
    },
    html: `<section class="grid" aria-label="Profit">
      <article class="card kpis"><dl class="kpi-row" id="pf-kpis"></dl></article>
      <article class="card span-7 tint-mint profit-hero" id="pf-hero">
        <div class="card-head"><h2>Estimated profit by month</h2><p class="muted">Sales without VAT minus running costs without VAT</p></div>
        <div class="chart" id="pf-cols"></div>
        <p class="scrawl-inline" id="pf-note"></p>
      </article>
      <article class="card span-5">
        <div class="card-head"><h2 id="pf-coins-title">Where each euro of sales goes</h2></div>
        <div class="coin-wrap"><div id="pf-coins"></div><ul class="ring-legend" id="pf-coins-legend"></ul></div>
        <p class="muted small-note" id="pf-coins-note"></p>
      </article>
      <article class="card span-12">
        <div class="card-head"><h2>The running total through the year</h2><p class="muted">Estimated profit added up month after month</p></div>
        <div class="chart" id="pf-run"></div>
      </article>
    </section>`,
    mount(host) {
      const q = (id) => host.querySelector(`#${id}`);
      const pickM = (m) => D.pick(D.state.month === m ? null : m);
      const set = D.kpiStrip(q("pf-kpis"), ["Estimated operating profit", "Profit margin", "Staff costs, share of sales", "Running costs, share of sales"]);
      const cols = Charts.columns(q("pf-cols"), {
        labels: SHORT, values: M.map((m) => m.profit), colour: (v) => (v < 0 ? "#E0674F" : "#26323B"), height: 250, width: 640,
        valueFormat: (v) => eurK(v), aria: "Estimated profit by month", onPick: pickM, tip: D.tip,
        describe: (i, rich) => (rich ? `<b>${LONG[i]}</b><br>Sales ${eur(M[i].sales)} − costs ${eur(M[i].running)}<br>= ${eurK(M[i].profit, 1)}` : `${LONG[i]}: estimated profit ${eurK(M[i].profit, 1)}`),
      });
      const coins = Charts.coins(q("pf-coins"));
      const run = Charts.lines(q("pf-run"), {
        labels: SHORT, axisFormat: (v) => (v ? `${v < 0 ? "−" : ""}€${Math.abs(v) / 1000}K` : "€0"),
        series: [{ name: "Running total of estimated profit", colour: "#5DB08F", values: running }],
        describe: (i, rich) => (rich ? `<b>End of ${LONG[i]}</b><br>Running total ${eurK(running[i], 1)}<br>This month ${eurK(M[i].profit, 1)}` : `End of ${LONG[i]}: running total ${eurK(running[i], 1)}`),
        onPick: pickM, tip: D.tip, width: 1100, height: 280,
      });
      return {
        update(i) {
          cols.select(i); run.select(i);
          run.mark(i === null ? low : i, i === null ? `${eurK(running[low])} behind` : `${eurK(running[i])} so far`);
          const s = i === null ? year : M[i];
          set(0, s.profit, (v) => eurK(v, 1), i === null ? "before depreciation, tax and the loan" : `${pct(s.profit / T.profit)} of the year's profit`);
          set(1, s.profit / s.sales, (v) => pct(v), "of sales without VAT");
          set(2, s.staff / s.sales, (v) => pct(v), `${eur(s.staff)} of wages and payroll`);
          set(3, s.running / s.sales, (v) => pct(v), `${eur(s.running)} without VAT`);
          q("pf-hero").className = `card span-7 profit-hero ${s.profit < 0 ? "tint-coral" : "tint-mint"}`;
          q("pf-note").textContent = i === null ? `${D.losses.length} months below zero` : s.profit < 0 ? "a loss month" : s === D.best ? "best month!" : "";
          const c = cents(s);
          coins.update(PARTS.map(([label, colour], k) => ({ label, colour, count: c[k] })));
          q("pf-coins-title").textContent = i === null ? "Where each euro of sales goes" : `Where each euro went, ${SHORT[i]}`;
          q("pf-coins-legend").innerHTML = PARTS.map(([label, colour, get]) => { const v = get(s); return `<li><i style="background:${colour}"></i><span>${v < 0 ? "Loss" : label}</span><b>${v < 0 ? "−" : ""}${int(Math.abs(v) / s.sales * 100)}c</b></li>`; }).join("");
          q("pf-coins-note").textContent = s.profit >= 0 ? "Each coin is one cent of sales without VAT, rounded to whole cents."
            : `Costs were ${pct(s.running / s.sales, 0)} of sales: the coins show the costs, and none is left as profit.`;
        },
      };
    },
  });
})();
