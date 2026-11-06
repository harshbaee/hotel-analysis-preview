// Money in and out: what was invoiced, how it was paid, and where the money went (the previous owner's loan apart).
(function () {
  const D = window.Dash;
  const { H, T, M, SHORT, LONG, pct, int, eur, sum } = D;
  const tally = (rows, key, value, i) => {
    const out = {};
    rows.forEach((r) => { if (i === null || D.monthIndex(r["Month start"]) === i) out[r[key]] = (out[r[key]] || 0) + (r[value] || 0); });
    return out;
  };
  const PAY = [["Company or agency account, paid later", ["Sent to a company account"], "#E58C7A"], ["Bank card", ["Bank card"], "#4F8FC9"],
    ["Bank transfer", ["Bank transfer"], "#E3A93C"], ["Deposit paid in advance", ["Deposit paid in advance"], "#9C8ADB"],
    ["Cheque, cash and vouchers", ["Cheque", "Cash", "Vouchers and gift boxes"], "#9FB3C2"]];
  const VAT_NOTE = { "10 % VAT": "rooms, breakfast, food, soft drinks, packages", "20 % VAT": "alcohol, room hire, shop, spa", "5.5 % VAT": "takeaway", "No VAT": "tourist tax and items paid for the guest" };
  const cats = [...H.cost_categories].sort((a, b) => b.running_net - a.running_net);
  const catColour = (c) => (D.staffCats.includes(c) ? "#E58C7A" : c === "Food purchases" ? "#E3A93C" : "#9FB3C2");
  const treat = (name) => byMonthOf(H.treatment_month, (r) => r["Cost treatment"] === name, "gross");
  function byMonthOf(rows, keep, value) { return D.byMonth(rows, value, keep); }
  const running = treat("Running cost"), notCost = treat("Not a cost"), confirm = treat("To confirm"), loan = treat("Previous owner's loan");
  console.assert(Math.abs(sum(running) + sum(notCost) + sum(confirm) - T.money_out) < 0.05, "money: treatments add up to money out");
  console.assert(Math.abs(sum(loan) - T.loan) < 0.05, "money: loan adds up");
  const invoicedYear = sum(Object.values(tally(H.payment_month, "Payment group", "paid", null)));

  D.register("money", {
    title: "Money in and out",
    finding(i) {
      const pay = tally(H.payment_month, "Payment group", "paid", i), total = sum(Object.values(pay));
      const later = (pay["Sent to a company account"] || 0) / total;
      if (i === null) return `<strong>${eur(total)}</strong> was invoiced, and <strong>${pct(later, 0)}</strong> of it was paid later through company or agency accounts. Staff and food take half of the ${eur(T.running_net)} of running costs.`;
      return `${LONG[i]}: <strong>${eur(total)}</strong> invoiced (${pct(later, 0)} paid later by companies) against <strong>${eur(M[i].money_out)}</strong> of hotel money out.`;
    },
    html: `<section class="grid" aria-label="Money in and out">
      <article class="card kpis"><dl class="kpi-row" id="mn-kpis"></dl></article>
      <article class="card span-6">
        <div class="card-head"><h2>How the invoiced money was paid</h2></div>
        <div class="ring-wrap"><div id="mn-ring"></div><ul class="ring-legend" id="mn-ring-legend"></ul></div>
      </article>
      <article class="card span-6 tint-lavender">
        <div class="card-head"><h2>What the invoices hold</h2><p class="muted">Amounts with VAT, by VAT group</p></div>
        <div id="mn-vat"></div>
        <div class="equation" aria-label="How the invoiced total breaks down, whole year">
          <span><b id="mn-eq-sales"></b>sales without VAT</span><i>+</i><span><b id="mn-eq-vat"></b>VAT</span><i>+</i><span><b id="mn-eq-tax"></b>tourist tax</span><i>=</i><span><b id="mn-eq-total"></b>invoiced, whole year</span>
        </div>
      </article>
      <article class="card span-8">
        <div class="card-head"><h2>Hotel money out by month</h2><p class="legend"><span><i style="background:#9FB3C2"></i>Running costs</span><span><i style="background:#5DB08F"></i>Not a cost</span><span><i style="background:#E58C7A"></i>To confirm</span></p></div>
        <div class="chart" id="mn-out"></div>
      </article>
      <article class="card span-4 tint-coral">
        <div class="card-head"><h2>Previous owner's loan</h2><p class="muted">Paid in the year, kept out of the hotel's money out</p></div>
        <div class="chart" id="mn-loan"></div>
        <p class="scrawl-inline">not this hotel's cost</p>
      </article>
      <article class="card span-12">
        <div class="card-head"><h2 id="mn-cats-title">Running costs by category</h2><p class="muted">Without VAT · staff in coral, food in honey</p></div>
        <div id="mn-cats" class="barlist-wide"></div>
      </article>
    </section>`,
    mount(host) {
      const q = (id) => host.querySelector(`#${id}`);
      const pickM = (m) => D.pick(D.state.month === m ? null : m);
      const set = D.kpiStrip(q("mn-kpis"), ["Sales without VAT", "Money received", "Hotel money out", "Previous owner's loan"]);
      const ring = Charts.ring(q("mn-ring"), { size: 210, stroke: 22 });
      const vatGroups = H.vat_groups.map((r) => r["VAT group"]);
      const vatList = Charts.barList(q("mn-vat"), vatGroups.map((g, k) => ({ key: g, label: g, colour: ["#4F8FC9", "#E3A93C", "#5DB08F", "#9C8ADB"][k] })), { format: eur, note: (k) => VAT_NOTE[k] || "" });
      const out = Charts.stacked(q("mn-out"), {
        labels: SHORT, series: [{ name: "Running costs", colour: "#9FB3C2", values: running }, { name: "Not a cost", colour: "#5DB08F", values: notCost }, { name: "To confirm", colour: "#E58C7A", values: confirm }],
        aria: "Hotel money out by month", onPick: pickM, tip: D.tip, height: 250, width: 620,
        describe: (i, rich) => (rich ? `<b>${LONG[i]}</b><br>Running ${eur(running[i])} · not a cost ${eur(notCost[i])} · to confirm ${eur(confirm[i])}` : `${LONG[i]}: hotel money out ${eur(M[i].money_out)}`),
      });
      const loanCols = Charts.columns(q("mn-loan"), {
        labels: SHORT.map((t) => t[0]), values: loan, colour: () => "#9C8ADB", height: 200, width: 360, aria: "Previous owner's loan by month", onPick: pickM, tip: D.tip,
        describe: (i, rich) => (rich ? `<b>${LONG[i]}</b><br>Loan payments ${eur(loan[i])}` : `${LONG[i]}: loan payments ${eur(loan[i])}`),
      });
      const tax = H.vat_groups.find((r) => r["VAT group"] === "No VAT").amount;
      console.assert(Math.abs(T.sales_ex_vat + T.vat + tax - invoicedYear) < 0.05, "money: sales, VAT and tourist tax add up to the invoices");
      [["mn-eq-sales", T.sales_ex_vat], ["mn-eq-vat", T.vat], ["mn-eq-tax", tax], ["mn-eq-total", invoicedYear]].forEach(([id, v]) => { q(id).textContent = eur(v); });
      const catList = Charts.barList(q("mn-cats"), cats.map((r) => ({ key: r.Category, label: r.Category, colour: catColour(r.Category) })), { format: eur, note: () => "" });
      return {
        update(i) {
          out.select(i); loanCols.select(i);
          const pay = tally(H.payment_month, "Payment group", "paid", i), total = sum(Object.values(pay));
          const parts = PAY.map(([label, keys, colour]) => ({ label, colour, value: sum(keys.map((k) => pay[k] || 0)) }));
          ring.update(parts, eur(total), "invoiced", `How the invoiced money was paid: ${parts.map((p) => `${p.label} ${pct(p.value / total)}`).join(", ")}`);
          q("mn-ring-legend").innerHTML = parts.map((p) => `<li><i style="background:${p.colour}"></i><span>${p.label}</span><b>${pct(p.value / total)}</b><small>${eur(p.value)}</small></li>`).join("");
          const s = i === null ? { sales: T.sales_ex_vat, received: T.money_received, out: T.money_out, loan: T.loan } : { sales: M[i].sales, received: M[i].money_received, out: M[i].money_out, loan: loan[i] };
          set(0, s.sales, eur, i === null ? `${int(T.invoices)} invoices, ${eur(invoicedYear)} with VAT` : `${pct(s.sales / T.sales_ex_vat)} of the year`);
          set(1, s.received, eur, "all departments, by payment day");
          set(2, s.out, eur, i === null ? `with VAT; ${eur(T.to_confirm)} still to confirm` : `with VAT; ${eur(confirm[i])} to confirm`);
          set(3, s.loan, eur, "shown apart");
          vatList.update(tally(H.vat_month, "VAT group", "amount", i));
          const c = tally(H.cost_month, "Category", "net", i), totalCost = sum(Object.values(c));
          catList.update(c);
          host.querySelectorAll("#mn-cats li").forEach((li) => { const v = c[li.dataset.key] || 0; li.querySelector(".bl-note").textContent = totalCost ? `${pct(v / totalCost, 0)} of running costs` : ""; });
          q("mn-cats-title").textContent = i === null ? "Running costs by category" : `Running costs by category, ${SHORT[i]}`;
        },
      };
    },
  });
})();
