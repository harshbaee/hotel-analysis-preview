// Restaurant and menu: who eats, when, and what each dish leaves after ingredients (estimated costs).
(function () {
  const D = window.Dash;
  const { H, T, M, SHORT, LONG, pct, int, eur, sum } = D;
  const GROUP_COLOUR = { "A la carte": "#4F8FC9", "Set menus": "#E58C7A", "Beer and spirits": "#E3A93C", Grill: "#9C8ADB",
    "Soft and hot drinks": "#5DB08F", Wine: "#C9707F", Pizza: "#9FB3C2", Takeaway: "#26323B" };
  const groups = [...new Set(H.menu_items.map((r) => r["Menu group"]))].sort((a, b) =>
    sum(H.menu_items.filter((r) => r["Menu group"] === b).map((r) => r.sales)) - sum(H.menu_items.filter((r) => r["Menu group"] === a).map((r) => r.sales)));
  const items = H.menu_items.map((r, n) => {
    const [name, code] = r.Item.split(/\s+·\s+/);
    return { n, name, code: code || "", group: r["Menu group"], source: r["Cost source"] || "Cost needed", sales: r.sales, portions: r.portions,
      price: r.price, cost: r.margin === null ? null : r.cost, marginPct: r.margin === null ? null : r.margin_pct, perPortion: r.margin === null || !r.portions ? null : r.margin / r.portions };
  });
  console.assert(Math.abs(sum(items.map((r) => r.sales)) - T.menu_sales_ex_vat) < 1, "restaurant: items add up to menu sales");
  const groupMonth = (key, i) => { const out = {}; H.menu_month.forEach((r) => { if (i === null || D.monthIndex(r["Month start"]) === i) out[r["Menu group"]] = (out[r["Menu group"]] || 0) + (r[key] || 0); }); return out; };
  const costed = items.filter((r) => r.perPortion !== null && r.portions > 0);
  const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const eur2 = (v) => (v === null ? "—" : `€${D.nf(2).format(v)}`);

  D.register("restaurant", {
    title: "Restaurant and menu",
    finding(i) {
      const lead = items[0];
      if (i === null) return `Evenings bring <strong>${pct(T.evening_share, 0)}</strong> of the ${int(T.covers_day + T.covers_eve)} covers. The best seller is the three-course menu (${lead.name}) at <strong>${eur(lead.sales)}</strong>, and ingredients leave an estimated <strong>${pct(T.gross_margin_pct)}</strong> margin.`;
      const m = M[i], sales = sum(Object.values(groupMonth("sales", i)));
      return `${LONG[i]}: <strong>${int(m.covers)}</strong> covers, ${pct(m.covers_eve / m.covers, 0)} in the evening, and <strong>${eur(sales)}</strong> of menu sales without VAT.`;
    },
    html: `<section class="grid" aria-label="Restaurant and menu">
      <article class="card kpis"><dl class="kpi-row" id="rs-kpis"></dl></article>
      <article class="card span-8">
        <div class="card-head"><h2>Covers by month</h2><p class="legend"><span><i style="background:#4F8FC9"></i>Daytime (breakfast, lunch)</span><span><i style="background:#E3A93C"></i>Evening</span></p></div>
        <div class="chart" id="rs-covers"></div>
      </article>
      <article class="card span-4 tint-honey">
        <div class="card-head"><h2 id="rs-groups-title">Menu sales by group</h2></div>
        <div id="rs-groups"></div>
        <p class="muted small-note">Without VAT; the note is the estimated ingredient margin.</p>
      </article>
      <article class="card span-12">
        <div class="card-head"><h2>Popularity against margin</h2><p class="muted">Whole year · one dot per dish or drink with a cost · dot size is its sales</p></div>
        <div class="filters" role="group" aria-label="Menu group" id="rs-filters"></div>
        <div class="chart" id="rs-scatter"></div>
        <p class="muted small-note">Costs are estimates from basic recipes priced at Transgourmet or Hyper U, so margins run high until the chef's real costs replace them.</p>
      </article>
      <article class="card span-12">
        <div class="card-head"><h2>Every dish and drink</h2><label class="search"><span class="sr-only">Find a dish or drink</span><input type="search" id="rs-search" placeholder="Find a dish or drink" autocomplete="off"></label></div>
        <div class="table-wrap"><table class="data" id="rs-table"><thead><tr>
          <th scope="col" data-k="name" class="left">Dish or drink</th><th scope="col" data-k="group" class="left">Group</th>
          <th scope="col" data-k="portions">Portions</th><th scope="col" data-k="sales" aria-sort="descending">Sales without VAT</th>
          <th scope="col" data-k="price">Price without VAT</th><th scope="col" data-k="cost">Cost per portion</th>
          <th scope="col" data-k="marginPct">Margin</th><th scope="col" data-k="source" class="left">Cost from</th></tr></thead><tbody></tbody></table></div>
        <p class="table-foot"><span id="rs-count"></span><button type="button" class="ghost" id="rs-more">Show all</button></p>
      </article>
    </section>`,
    mount(host) {
      const q = (id) => host.querySelector(`#${id}`);
      const pickM = (m) => D.pick(D.state.month === m ? null : m);
      const set = D.kpiStrip(q("rs-kpis"), ["Restaurant covers", "Evening share", "Menu sales without VAT", "Ingredient margin"]);
      const covers = Charts.stacked(q("rs-covers"), {
        labels: SHORT, series: [{ name: "Daytime", colour: "#4F8FC9", values: M.map((m) => m.covers_day) }, { name: "Evening", colour: "#E3A93C", values: M.map((m) => m.covers_eve) }],
        aria: "Restaurant covers by month, daytime and evening", valueFormat: int, onPick: pickM, tip: D.tip, height: 340,
        describe: (i, rich) => (rich ? `<b>${LONG[i]}</b><br>${int(M[i].covers_day)} daytime · ${int(M[i].covers_eve)} evening` : `${LONG[i]}: ${int(M[i].covers_day)} daytime, ${int(M[i].covers_eve)} evening covers`),
      });
      const groupList = Charts.barList(q("rs-groups"), groups.map((g) => ({ key: g, label: g, colour: GROUP_COLOUR[g] || "#9FB3C2" })), { format: (v) => eur(v), note: () => "" });
      // Group chips filter both the scatter and the table.
      let group = null, query = "", sortKey = "sales", sortDir = -1, showAll = false;
      q("rs-filters").innerHTML = [`<button type="button" aria-pressed="true" data-g="">All</button>`, ...groups.map((g) => `<button type="button" aria-pressed="false" data-g="${g}"><i style="background:${GROUP_COLOUR[g]}"></i>${g}</button>`)].join("");
      const scatter = Charts.scatter(q("rs-scatter"), {
        points: costed.map((r) => ({ ...r, x: r.portions, y: r.perPortion, r: 3 + Math.sqrt(Math.max(r.sales, 0)) / 12, colour: GROUP_COLOUR[r.group] || "#9FB3C2" })),
        quadrants: { x: median(costed.map((r) => r.portions)), y: median(costed.map((r) => r.perPortion)) }, tip: D.tip,
        describe: (p) => `<b>${p.name}</b> · ${p.group}<br>${int(p.portions)} portions · ${eur(p.sales)} sales<br>Price ${eur2(p.price)} · cost ${eur2(p.cost)} · margin ${eur2(p.perPortion)} (${pct(p.marginPct)})`,
      });
      const tbody = q("rs-table").querySelector("tbody");
      function table() {
        const rows = items.filter((r) => (!group || r.group === group) && (!query || r.name.toLowerCase().includes(query)))
          .sort((a, b) => { const x = a[sortKey], y = b[sortKey]; if (x === null) return 1; if (y === null) return -1; return (typeof x === "string" ? x.localeCompare(y) : x - y) * sortDir; });
        const shown = showAll ? rows : rows.slice(0, 15);
        tbody.innerHTML = shown.map((r) => `<tr><th scope="row" class="left">${r.name}<small>${r.code}</small></th><td class="left"><i class="dot" style="background:${GROUP_COLOUR[r.group]}"></i>${r.group}</td>
          <td>${int(r.portions)}</td><td>${eur2(r.sales)}</td><td>${eur2(r.price)}</td><td>${eur2(r.cost)}</td>
          <td>${r.marginPct === null ? '<span class="muted">—</span>' : pct(r.marginPct)}</td><td class="left ${r.source === "Cost needed" ? "warn" : ""}">${r.source}</td></tr>`).join("") ||
          `<tr><td colspan="8" class="left muted">No dish or drink matches "${query}".</td></tr>`;
        q("rs-count").textContent = `${shown.length} of ${rows.length} items${group ? ` in ${group}` : ""}`;
        q("rs-more").hidden = rows.length <= 15;
        q("rs-more").textContent = showAll ? "Show the first 15" : `Show all ${rows.length}`;
        scatter.filter((p) => (!group || p.group === group) && (!query || p.name.toLowerCase().includes(query)));
      }
      q("rs-filters").addEventListener("click", (e) => {
        const b = e.target.closest("button"); if (!b) return;
        group = b.dataset.g || null;
        q("rs-filters").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        table();
      });
      q("rs-search").addEventListener("input", (e) => { query = e.target.value.trim().toLowerCase(); table(); });
      q("rs-more").addEventListener("click", () => { showAll = !showAll; table(); });
      q("rs-table").querySelectorAll("th[data-k]").forEach((th) => {
        th.tabIndex = 0;
        const sortBy = () => {
          sortDir = sortKey === th.dataset.k ? -sortDir : th.classList.contains("left") ? 1 : -1;
          sortKey = th.dataset.k;
          q("rs-table").querySelectorAll("th[data-k]").forEach((x) => x.removeAttribute("aria-sort"));
          th.setAttribute("aria-sort", sortDir > 0 ? "ascending" : "descending");
          table();
        };
        th.addEventListener("click", sortBy);
        th.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sortBy(); } });
      });
      table();
      return {
        update(i) {
          covers.select(i);
          const m = i === null ? null : M[i];
          const covs = i === null ? T.covers_day + T.covers_eve : m.covers, eve = i === null ? T.covers_eve : m.covers_eve;
          const gs = groupMonth("sales", i), gm = groupMonth("margin", i), gc = groupMonth("costed", i);
          const sales = sum(Object.values(gs));
          set(0, covs, int, i === null ? `${int(T.covers_day)} daytime · ${int(T.covers_eve)} evening` : `${pct(covs / (T.covers_day + T.covers_eve))} of the year`);
          set(1, eve / covs, (v) => pct(v), "of covers are dinners");
          set(2, sales, eur, i === null ? `${int(T.portions)} portions billed` : `${pct(sales / T.menu_sales_ex_vat)} of the year`);
          set(3, sum(Object.values(gm)) / sum(Object.values(gc)), (v) => pct(v), "on items with an estimated cost");
          q("rs-groups-title").textContent = i === null ? "Menu sales by group" : `Menu sales by group, ${SHORT[i]}`;
          groupList.update(gs);
          host.querySelectorAll("#rs-groups li").forEach((li) => { const k = li.dataset.key; li.querySelector(".bl-note").textContent = gc[k] ? `${pct(gm[k] / gc[k], 0)} margin` : "no cost yet"; });
        },
      };
    },
  });
})();
