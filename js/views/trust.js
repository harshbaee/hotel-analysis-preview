// Data and method: where the figures come from, how they were checked, and what is still open.
(function () {
  const D = window.Dash;
  const { H, int } = D;
  const V = H.validation[0], A = H.audit[0];
  // Check counts and source sizes as verified on 25 October 2026 (powerbi/HotelProject_Final/OPEN_ME.md).
  const CHECKS = { static: 1474, live: 248 };
  const SHORT_LABEL = { "VAT not confirmed": "Spending rows: VAT not confirmed", "Supplier invoice copy missing": "Supplier invoices: copy missing",
    "Invoice detail lines are missing": "Invoices with no lines (€0)", "Payment status needs checking": "Payment status to check",
    "Stay length is zero or negative": "Stays of zero nights or less", "People count is zero or negative": "Bookings with no people",
    "Accounting treatment to confirm": "Accounting treatment to confirm", "Invoice total differs from adjusted items": "Invoice totals that differ from items",
    "Possible repeated charges": "Possible repeated charges", "Booking date could not be read": "Restaurant booking date unreadable" };
  const review = [...H.quality].sort((a, b) => b.rows - a.rows);
  const steps = [
    ["Extract", int(A.raw_tables), "tables", "Vega's database files exported to CSV, read-only", "t-sky"],
    ["Clean", "4", "notebooks", "Explore, clean, validate, then cost the menu", "t-mint"],
    ["Model", "126", "measures", "35 tables and 29 relationships in Power BI", "t-honey"],
    ["Report", "10", "pages", "181 visuals, one question per page", "t-coral"],
    ["Verify", int(CHECKS.static + CHECKS.live), "checks", `${int(CHECKS.static)} file checks and ${int(CHECKS.live)} live checks, all passing`, "t-lavender"],
  ];

  D.register("trust", {
    title: "Data and method",
    noMonths: true,
    finding: () => `<strong>${int(CHECKS.static + CHECKS.live)} checks</strong> compare every figure with the raw data, and all pass. ${review.length} kinds of records still need the hotel's word, led by the VAT on <strong>${int(review[0].rows)}</strong> spending rows.`,
    html: `<section class="grid" aria-label="Data and method">
      <article class="card span-12 steps-card">
        <div class="card-head"><h2>From a copied database to a checked report</h2><p class="muted">Every step runs on this computer</p></div>
        <ol class="steps">${steps.map(([h, n, u, t, c], k) => `<li class="${c}"><h3>${h}</h3><p class="step-n">${n}<span>${u}</span></p><p>${t}</p>${k < 4 ? '<svg class="step-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ""}</li>`).join("")}</ol>
      </article>
      <article class="card span-4 tint-mint">
        <div class="card-head"><h2>Fixed in the data</h2></div>
        <ul class="ticks">
          <li>A damaged till record, repeated 174 times, is left out of the analysis file</li>
          <li>About 151,000 text cells lost their stray spaces; the original text is kept</li>
          <li>32 empty, voided invoices are no longer counted: ${int(D.T.invoices)} invoices remain</li>
          <li>Loan payments are shown apart, as the previous owner's loan</li>
        </ul>
      </article>
      <article class="card span-4 tint-honey">
        <div class="card-head"><h2>Still to confirm</h2><p class="muted">Rows that need the hotel's word</p></div>
        <table class="data compact"><tbody>${review.map((r) => `<tr><th scope="row" class="left">${SHORT_LABEL[r["Review item"]] || r["Review item"]}</th><td>${int(r.rows)}</td></tr>`).join("")}</tbody></table>
      </article>
      <article class="card span-4">
        <div class="card-head"><h2>What the figures cannot say</h2></div>
        <ul class="plain">
          <li>Profit is an estimate: no depreciation, income tax or previous owner's loan</li>
          <li>Dish costs are estimates until the chef gives real ones</li>
          <li>Sales without VAT await the accountant's confirmation</li>
          <li>No reliable previous year, so no year-on-year comparison</li>
        </ul>
      </article>
      <article class="card span-12">
        <div class="card-head"><h2>Where the data comes from</h2></div>
        <dl class="sources">
          <div><dt>Vega hotel database</dt><dd><b>${int(A.raw_rows)}</b> rows in ${int(A.raw_tables)} tables and ${int(V.files)} files: rooms, bookings, invoices, the till and daily reports. Guest, staff and bank tables are only counted, never shown.</dd></div>
          <div><dt>Supervisor's spending file</dt><dd><b>2,114</b> rows of supplier invoices, wages, bank fees and loan payments, October 2025 to October 2026.</dd></div>
          <div><dt>Till price photos</dt><dd><b>9</b> photos; 18 sampled prices match the till's own price list.</dd></div>
          <div><dt>Supplier prices</dt><dd><b>185</b> menu items costed from basic recipes at the cheapest Transgourmet or Hyper U prices, checked 24 October 2026.</dd></div>
        </dl>
      </article>
    </section>`,
    mount() { return {}; },
  });
})();
