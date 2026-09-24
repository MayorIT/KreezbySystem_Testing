# Synthetic admin-only daily route sheets for QA.
# Catalog names only — never reads client Excel files.
# python js/generate-fake-admin-sales.py

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data" / "retailers" / "_manifest.json"
OUT_JSON = ROOT / "data" / "kreezby-sales-fake-admin.json"
OUT_JS = ROOT / "js" / "kreezby-sales-fake-admin.js"

AREA_LABELS = {
    "batangas": "Batangas",
    "bauan": "Bauan",
    "citimart": "Citimart",
    "lipa": "Lipa",
    "lucena": "Lucena",
    "manila": "Manila",
    "rosario": "Rosario",
    "stotomas": "Sto. Tomas",
    "tagaytay": "Tagaytay",
}
AREA_ORDER = list(AREA_LABELS.keys())
PACK_PRICE = 100


def visit_dates():
    dates = []
    year, month = 2025, 1
    while (year, month) <= (2026, 9):
        dates.append(f"{year:04d}-{month:02d}-01")
        dates.append(f"{year:04d}-{month:02d}-15")
        month += 1
        if month > 12:
            month = 1
            year += 1
    if "2026-09-20" not in dates:
        dates.append("2026-09-20")
    return dates


class LCG:
    def __init__(self, seed: int) -> None:
        self.s = seed & 0xFFFFFFFF

    def __call__(self) -> float:
        self.s = (1664525 * self.s + 1013904223) & 0xFFFFFFFF
        return self.s / 4294967296


def pick(rng, items):
    return items[int(rng() * len(items)) % len(items)]


def retailers_for(manifest, source):
    rows = list(manifest.values())
    if source == "citimart":
        out = [r for r in rows if str(r.get("slug", "")).startswith("citimart")]
    else:
        out = [r for r in rows if r.get("area") == source]
    out.sort(key=lambda r: r["storeName"])
    return out


def fake_entry(rng, loc):
    mode = int(rng() * 5)
    packs = pick(rng, [5, 8, 10, 12, 15, 20])
    collected = packs * PACK_PRICE
    entry = {
        "retailerArea": loc["area"],
        "retailerSlug": loc["slug"],
        "retailerName": loc["storeName"],
        "portalPage": f"retailer-{loc['area']}_{loc['slug']}.html",
    }
    if mode == 0:
        entry["cons"] = packs
        entry["accountReceivable"] = collected
        entry["collected"] = collected
    elif mode == 1:
        entry["cod"] = packs
        entry["collected"] = collected
    elif mode == 2:
        entry["staff"] = packs
        entry["check"] = pick(rng, [1, 2, 3])
        if rng() > 0.4:
            entry["collected"] = collected
    elif mode == 3:
        entry["check"] = pick(rng, [1, 2, 4, 6])
        if rng() > 0.5:
            entry["f"] = pick(rng, [1, 2])
        if rng() > 0.6:
            entry["po"] = pick(rng, [1, 2, 3])
    else:
        entry["replaced"] = pick(rng, [1, 2, 3, 5])
        if rng() > 0.5:
            entry["cons"] = packs
            entry["collected"] = collected
    if rng() > 0.85:
        entry["po"] = pick(rng, [1, 2])
    if rng() > 0.9:
        entry["f"] = 1
    return entry


def build(manifest):
    dates = visit_dates()
    daily_reports = []
    sources = {}
    for source_idx, source in enumerate(AREA_ORDER):
        locs = retailers_for(manifest, source)
        if not locs:
            continue
        for visit_idx, report_date in enumerate(dates):
            rng = LCG(20260920 + source_idx * 97 + visit_idx * 13)
            entries = [fake_entry(rng, loc) for loc in locs]
            total_expense = pick(rng, [850, 1100, 1450, 1725, 1980, 2200])
            sum_collected = sum(e.get("collected") or 0 for e in entries)
            daily_reports.append(
                {
                    "id": f"fake-{source}-{report_date.replace('-', '')}",
                    "reportDate": report_date,
                    "source": source,
                    "areaLabel": AREA_LABELS[source],
                    "sourceImage": "",
                    "entries": entries,
                    "totalExpense": total_expense,
                    "cashCollected": sum_collected,
                    "netSales": sum_collected - total_expense,
                    "isCustom": False,
                    "isTestData": True,
                }
            )
        sources[source] = {
            "from": dates[0],
            "to": dates[-1],
            "sheets": len(dates),
            "testData": True,
        }

    daily_reports.sort(key=lambda r: (r["reportDate"], AREA_ORDER.index(r["source"])))
    return {
        "importedAt": "2026-09-20T00:00:00.000Z",
        "dateRange": {"from": dates[0], "to": dates[-1]},
        "sources": sources,
        "note": "Synthetic admin-only QA data. Not live client daily records.",
        "isTestData": True,
        "adminOnly": True,
        "dailyReports": daily_reports,
        "sales": [],
    }


def main():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    payload = build(manifest)
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    header = (
        "/**\n"
        " * Synthetic admin-only QA sales payload.\n"
        " * Jan 2025 through Sep 2026. Not client Excel imports.\n"
        " * Include this script only on admin sales pages.\n"
        " */\n"
    )
    OUT_JS.write_text(
        header + "window.KREEZBY_ADMIN_TEST_SALES = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    entries = sum(len(r["entries"]) for r in payload["dailyReports"])
    print("sheets", len(payload["dailyReports"]), "entries", entries)
    print("range", payload["dateRange"])
    print("json_kb", round(OUT_JSON.stat().st_size / 1024, 1), "js_kb", round(OUT_JS.stat().st_size / 1024, 1))


if __name__ == "__main__":
    main()
