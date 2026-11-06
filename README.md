<p align="center">
  <a href="https://harshbaee.github.io/hotel-analysis-preview/"><img src="assets/banner.svg" alt="Hotel analysis: one year of a 57-room hotel in the Vendée" width="100%"></a>
</p>

<p align="center">
  <a href="https://harshbaee.github.io/hotel-analysis-preview/"><img alt="Open the live dashboard" src="https://img.shields.io/badge/Live_preview-Open_the_dashboard-4F8FC9?style=for-the-badge"></a>
  <a href="https://harshbaee.github.io/hotel-analysis-preview/showcase/"><img alt="Open the showcase page" src="https://img.shields.io/badge/Showcase-3D_page-E58C7A?style=for-the-badge"></a>
  <a href="https://harshbaee.github.io/hotel-analysis-preview/powerbi.html"><img alt="See the Power BI report" src="https://img.shields.io/badge/Power_BI-10--page_report-E3A93C?style=for-the-badge"></a>
</p>

<p align="center">
  <img alt="Python, pandas and Jupyter" src="https://img.shields.io/badge/Python-pandas_%C2%B7_Jupyter-26323B?style=flat-square&logo=python&logoColor=white">
  <img alt="Power BI and DAX" src="https://img.shields.io/badge/Power_BI-DAX-26323B?style=flat-square&logo=powerbi&logoColor=F2C811">
  <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-HTML_%C2%B7_CSS-26323B?style=flat-square&logo=javascript&logoColor=F7DF1E">
  <img alt="React Three Fiber" src="https://img.shields.io/badge/React_Three_Fiber-three.js-26323B?style=flat-square&logo=threedotjs&logoColor=white">
  <img alt="All rights reserved" src="https://img.shields.io/badge/License-All_rights_reserved-9C8ADB?style=flat-square">
</p>

<p align="center"><b>An internship project by Harsh Prajapati and Charmi Shah</b><br>
<sub>Master 2 Recherche, CY Tech · 2025/2026 · one full year, 1 October 2025 to 30 September 2026</sub></p>

> [!NOTE]
> **Preview only.** This repository shows the project; it does not share it. The hotel's name is withheld, its raw data
> and the project's code are not published, and nothing here may be reused (see [Rights](#rights)).

## The year at a glance

<p align="center"><img src="assets/stats.svg" alt="The year in five figures" width="100%"></p>

A 57-room hotel with a restaurant, read from a copy of its own management software. Over the year it brought in
**€1.13M** of sales without VAT and an estimated operating profit of **€369K** (32.6% of sales). Summer carries
everything: June to September earned **95%** of the profit, while four winter months ran at a loss.

## 1 · The dashboard, the main preview

<p align="center">
  <a href="https://harshbaee.github.io/hotel-analysis-preview/"><img src="assets/dashboard_demo.webp" alt="The dashboard: choosing months on the mill wheel and moving between views" width="100%"></a>
</p>

A seven-view dashboard that runs in the browser, with no server and no tracking. **[Open it →](https://harshbaee.github.io/hotel-analysis-preview/)**

- **One month, every view.** Pick a month on the 3D mill wheel (twelve paddles, each as long as that month was full) or on the
  month bar, and the overview, rooms, guests, restaurant, money, profit and method views all follow.
- **Every night of the year.** A calendar of 365 nights with a liquid-glass lens to drag across it.
- **Built to be read.** Each view starts with its finding in one sentence, then the figures, then the charts; light and dark mode.

<table>
  <tr>
    <td width="33%"><img src="assets/dash_rooms.png" alt="Rooms view: every night of the year"></td>
    <td width="33%"><img src="assets/dash_restaurant.png" alt="Restaurant and menu view"></td>
    <td width="33%"><img src="assets/dash_profit.png" alt="Profit view"></td>
  </tr>
  <tr>
    <td align="center"><sub>Rooms: 365 nights under glass</sub></td>
    <td align="center"><sub>Restaurant and menu</sub></td>
    <td align="center"><sub>Profit, month by month</sub></td>
  </tr>
</table>

## 2 · The showcase page

<p align="center">
  <a href="https://harshbaee.github.io/hotel-analysis-preview/showcase/"><img src="assets/showcase_demo.webp" alt="The showcase page: the 3D mill wheel, the liquid logo and the chapters" width="100%"></a>
</p>

A one-page tour of the project. **[Open it →](https://harshbaee.github.io/hotel-analysis-preview/showcase/)**

- A fixed stage with a moving shader gradient and the 3D mill wheel (React Three Fiber); hover or click a paddle to read a month.
- The name in liquid metal, the nights under a liquid-glass lens, and the project's outputs laid out as real pages.
- Five chapters (rooms, tables, money, profit, checks) whose titles tear apart at the seam as you scroll.

## 3 · The Power BI report

<table>
  <tr>
    <td width="50%"><a href="https://harshbaee.github.io/hotel-analysis-preview/powerbi.html"><img src="assets/pbi_overview.png" alt="Power BI report, Overview page"></a></td>
    <td width="50%"><a href="https://harshbaee.github.io/hotel-analysis-preview/powerbi.html"><img src="assets/pbi_menu.png" alt="Power BI report, Menu page"></a></td>
  </tr>
  <tr>
    <td width="50%"><a href="https://harshbaee.github.io/hotel-analysis-preview/powerbi.html"><img src="assets/pbi_profit.png" alt="Power BI report, Profit page"></a></td>
    <td width="50%"><a href="https://harshbaee.github.io/hotel-analysis-preview/powerbi.html"><img src="assets/pbi_bookings.png" alt="Power BI report, Bookings page"></a></td>
  </tr>
</table>

The tool the hotel keeps: ten pages in Power BI Desktop, one question per page, with the dates kept in step across pages.
**[See eight of its pages →](https://harshbaee.github.io/hotel-analysis-preview/powerbi.html)**

## How it was built

<p align="center"><img src="assets/pipeline.svg" alt="Extract, clean, model, report, verify" width="100%"></p>

<details>
<summary><b>The data</b>: a copied hotel database, decoded table by table</summary>
<br>

The hotel runs on Vega, a hotel management system. A copy of its database (83 tables, 1,276,245 rows, no documentation) was
exported read-only and decoded table by table: the daily activity report, the four VAT groups on each invoice, five payment
slots per invoice, booking channels and segments, and the restaurant till. Spending came from the supervisor's file, and nine
photos of the till checked the price list.
</details>

<details>
<summary><b>Cleaning and checks</b>: written rules, nothing deleted quietly</summary>
<br>

Four Python notebooks explore, clean and validate the data, then cost the menu. Missing, blank and zero stay apart, credits are
kept, and no record is dropped without a written rule. 1,722 automatic checks compare every figure in the report with the raw
data: 1,474 on the files and 248 live on the open report.
</details>

<details>
<summary><b>The model</b>: 35 tables, 29 relationships, 126 DAX measures</summary>
<br>

Each subject (bookings, invoices, payments, spending, menu sales, the daily report) keeps its own grain and date meaning and
meets the others only through a shared calendar, so unrelated figures never look comparable. Dish costs are estimated from basic
recipes priced at the cheapest supplier products, and every estimate is labelled as one.
</details>

<details>
<summary><b>Privacy</b>: the hotel's data stayed on its own computer</summary>
<br>

All processing ran locally. Guest, staff and bank records were only counted, never shown. This preview holds summary figures
only, with the hotel's name withheld.
</details>

## What the year showed

1. **Summer carries the year.** June was 78% full; from November to April the hotel never reached a quarter full.
2. **Business guests fill the week.** Tuesday to Thursday are the busiest nights, and most reservations are individual business trips.
3. **Guests book direct, and late.** 58% of reservations come direct, and three in four are made a week or less ahead.
4. **The restaurant feeds the hotel.** 56% of its 7,068 covers are dinners, mostly for hotel guests.
5. **About a third of each euro is left.** The estimated operating profit is 32.6% of sales, before depreciation and tax.

## Team

<table>
  <tr>
    <td width="50%" valign="top">
      <b>Harsh Prajapati</b><br>
      <sub>Data and back end</sub><br><br>
      Extraction and decoding of the database, the cleaning and validation notebooks, the Power BI model and its DAX measures,
      the dish cost estimates and the automatic checks.
    </td>
    <td width="50%" valign="top">
      <b>Charmi Shah</b><br>
      <sub>Front end and design</sub><br><br>
      The Power BI report's design, the logo and visual identity, the presentation, the dashboard website and the showcase page.
    </td>
  </tr>
</table>

## Rights

© 2026 Harsh Prajapati and Charmi Shah. **All rights reserved.** This repository is shared for viewing only: no part of it
may be copied, modified, reused or distributed without the authors' written permission. See [LICENSE](LICENSE).
