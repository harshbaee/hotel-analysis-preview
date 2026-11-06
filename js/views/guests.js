// Guests and bookings: who books, through which channel, and how far ahead? Counted by arrival month.
(function () {
  const D = window.Dash;
  const { H, T, SHORT, LONG, pct, int, sum } = D;
  // Totals per key for the chosen month, or the whole year.
  const tally = (rows, key, value, i) => {
    const out = {};
    rows.forEach((r) => { if (i === null || D.monthIndex(r["Month start"]) === i) out[r[key]] = (out[r[key]] || 0) + (r[value] || 0); });
    return out;
  };
  const CHANNELS = [["Direct (phone, email, desk)", "Direct", "#4F8FC9"], ["Booking websites", "Booking websites", "#E3A93C"], ["Not recorded", "Not recorded", "#9FB3C2"]];
  const LEAD = ["Same day", "1–7 days", "8–30 days", "1–3 months", "3–6 months", "Over 6 months"];
  const stays = H.stay_types.filter((r) => r["Stay group order"] && r.reservations).sort((a, b) => b.reservations - a.reservations);
  const STAY_NOTE = { "Soirée étape": "dinner, room and breakfast for business travellers" };
  const segs = H.segments.filter((r) => r.Segment && r.reservations);
  const SEG_COLOUR = { "Individual business": "#4F8FC9", "Individual leisure": "#E3A93C", "Group leisure": "#E58C7A", "Group business": "#9C8ADB", "Not recorded": "#9FB3C2" };
  const yearReservations = sum(Object.values(tally(H.channel_month, "Booking channel", "n", null)));
  console.assert(yearReservations === T.reservations, "guests: channels add up to the reservations");

  D.register("guests", {
    title: "Guests and bookings",
    finding(i) {
      const ch = tally(H.channel_month, "Booking channel", "n", i), n = sum(Object.values(ch));
      const lead = tally(H.lead_month, "Lead time order", "n", i), soon = (lead[1] || 0) + (lead[2] || 0);
      if (i === null) return `<strong>${pct((ch["Direct (phone, email, desk)"] || 0) / n)}</strong> of the ${int(n)} reservations came direct, and <strong>${pct(soon / n, 0)}</strong> were made a week or less before arrival; business travellers make up ${pct(segs.find((s) => s.Segment === "Individual business").reservations / n)}.`;
      return `${LONG[i]}: <strong>${int(n)}</strong> reservations by arrival date, ${pct((ch["Direct (phone, email, desk)"] || 0) / n, 0)} direct and <strong>${pct(soon / n, 0)}</strong> booked a week or less ahead.`;
    },
    html: `<section class="grid" aria-label="Guests and bookings">
      <article class="card kpis"><dl class="kpi-row" id="gs-kpis"></dl></article>
      <article class="card span-5 tint-sky">
        <div class="card-head"><h2>How guests booked</h2></div>
        <div class="ring-wrap"><div id="gs-ring"></div><ul class="ring-legend" id="gs-ring-legend"></ul></div>
      </article>
      <article class="card span-7">
        <div class="card-head"><h2>How far ahead guests book</h2><p class="muted">Days between the booking and the arrival</p></div>
        <div class="chart" id="gs-lead"></div>
        <p class="scrawl-inline" id="gs-lead-note"></p>
      </article>
      <article class="card span-6">
        <div class="card-head"><h2>What guests book</h2><p class="muted">Reservations by stay type</p></div>
        <div id="gs-stays"></div>
      </article>
      <article class="card span-6 tint-mint">
        <div class="card-head"><h2>Who the guests are</h2><p class="muted">Reservations by segment</p></div>
        <div id="gs-segs"></div>
      </article>
      <article class="card span-12">
        <div class="card-head"><h2>Where guests come from</h2><p class="muted">Whole year: the country is kept once per reservation</p></div>
        <div id="gs-countries" class="barlist-wide"></div>
      </article>
    </section>`,
    mount(host) {
      const q = (id) => host.querySelector(`#${id}`);
      const set = D.kpiStrip(q("gs-kpis"), ["Reservations", "Booked direct", "Through booking websites", "Booked a week or less ahead"]);
      const ring = Charts.ring(q("gs-ring"), { size: 210, stroke: 22 });
      const stayList = Charts.barList(q("gs-stays"), stays.map((r) => ({ key: r["Stay type group"], label: r["Stay type group"], colour: r["Stay type group"] === "Soirée étape" ? "#E58C7A" : "#4F8FC9" })),
        { format: int, note: (k) => STAY_NOTE[k] || "" });
      const segList = Charts.barList(q("gs-segs"), segs.map((r) => ({ key: r.Segment, label: r.Segment, colour: SEG_COLOUR[r.Segment] || "#9FB3C2" })), { format: int });
      const countries = H.countries.slice(0, 8);
      Charts.barList(q("gs-countries"), countries.map((r) => ({ key: r["Recorded country"], label: r["Recorded country"], colour: r["Recorded country"] === "France" ? "#4F8FC9" : "#9C8ADB" })),
        { format: (v) => `${int(v)} · ${pct(v / T.reservations)}` }).update(Object.fromEntries(countries.map((r) => [r["Recorded country"], r.reservations])));
      return {
        update(i) {
          const ch = tally(H.channel_month, "Booking channel", "n", i), n = sum(Object.values(ch));
          const lead = tally(H.lead_month, "Lead time order", "n", i);
          const parts = CHANNELS.map(([key, label, colour]) => ({ label, colour, value: ch[key] || 0 }));
          parts.push({ label: "Other channels", colour: "#9C8ADB", value: n - sum(parts.map((p) => p.value)) });
          ring.update(parts, int(n), "reservations", `Booking channels: ${parts.map((p) => `${p.label} ${pct(p.value / n)}`).join(", ")}`);
          q("gs-ring-legend").innerHTML = parts.map((p) => `<li><i style="background:${p.colour}"></i><span>${p.label}</span><b>${pct(p.value / n)}</b><small>${int(p.value)}</small></li>`).join("");
          const soon = (lead[1] || 0) + (lead[2] || 0);
          set(0, n, int, i === null ? "by arrival date" : `${pct(n / T.reservations)} of the year`);
          set(1, (ch["Direct (phone, email, desk)"] || 0) / n, (v) => pct(v), "phone, email or desk");
          set(2, (ch["Booking websites"] || 0) / n, (v) => pct(v), "they charge a commission");
          set(3, soon / n, (v) => pct(v), `${int(lead[1] || 0)} on the day itself`);
          const leadValues = LEAD.map((_, k) => lead[k + 1] || 0);
          Charts.columns(q("gs-lead"), {
            labels: LEAD, values: leadValues, colour: (v, k) => (k < 2 ? "#E58C7A" : "#9FB3C2"), height: 240, width: 640, valueFormat: int,
            aria: "Reservations by how far ahead they were made", tip: D.tip,
            describe: (k, rich) => (rich ? `<b>${LEAD[k]}</b><br>${int(leadValues[k])} reservations · ${pct(leadValues[k] / n)}` : `${LEAD[k]}: ${int(leadValues[k])}`),
          });
          q("gs-lead-note").textContent = `${pct(soon / n, 0)} book within a week`;
          stayList.update(tally(H.stay_month, "Stay type group", "n", i));
          segList.update(tally(H.segment_month, "Segment", "n", i));
        },
      };
    },
  });
})();
