# Admin sales test data from the public Kaggle bakery dataset.
# https://www.kaggle.com/datasets/shreyashdodekar/synthetic-bakery-sales-dataset
#
# python js/generate-fake-admin-sales.py

from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_JSON = ROOT / "data" / "kreezby-sales-fake-admin.json"
OUT_JS = ROOT / "js" / "kreezby-sales-fake-admin.js"
DATASET = "shreyashdodekar/synthetic-bakery-sales-dataset"

# Three dataset stores, shown on the first three area filters.
STORE_SOURCE = {
    "ST01": "batangas",
    "ST02": "bauan",
    "ST03": "citimart",
}
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
AREA_ORDER = list(AREA_LABELS)
DIRECTORY = ROOT / "retailer" / "retailer-directory.html"


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", str(name).lower()).strip("-")
    return "kaggle-" + (slug or "item")


def money(value) -> float:
    return round(float(value or 0), 2)


def load_retailers():
    html = DIRECTORY.read_text(encoding="utf-8")
    grouped = defaultdict(list)
    for href, name in re.findall(r'href="([^"]+_dashboard\.html)">([^<]+)</a>', html):
        area, slug, _file = href.split("/")
        grouped[area].append({"slug": slug, "name": name.strip()})
    return grouped


def label_with_retailers(source, lines, retailers):
    """Turn product rows into one row per real retailer in that area."""
    stores = retailers.get(source) or []
    if not stores:
        return lines
    merged = {}
    order = []
    for index, (product, entry, waste) in enumerate(sorted(lines, key=lambda item: item[0])):
        store = stores[index % len(stores)]
        slug = store["slug"]
        if slug not in merged:
            order.append(slug)
            merged[slug] = {
                "entry": {
                    "retailerArea": source,
                    "retailerSlug": slug,
                    "retailerName": store["name"],
                    "cons": 0,
                    "collected": 0.0,
                    "notes": [],
                },
                "waste": 0.0,
            }
        bucket = merged[slug]
        bucket["entry"]["cons"] += int(entry.get("cons") or 0)
        bucket["entry"]["collected"] += float(entry.get("collected") or 0)
        bucket["entry"]["notes"].append(product)
        bucket["waste"] += float(waste or 0)
    labeled = []
    for slug in order:
        bucket = merged[slug]
        entry = bucket["entry"]
        entry["collected"] = money(entry["collected"])
        entry["notes"] = ", ".join(entry["notes"])
        labeled.append((entry["retailerName"], entry, bucket["waste"]))
    return labeled


def relabel_payload(payload, retailers):
    for report in payload.get("dailyReports") or []:
        source = report.get("source") or ""
        lines = [
            (entry.get("retailerName") or "Item", entry, 0)
            for entry in report.get("entries") or []
        ]
        labeled = label_with_retailers(source, lines, retailers)
        report["entries"] = [item[1] for item in labeled]
        report["areaLabel"] = AREA_LABELS.get(source, report.get("areaLabel") or source)
        report["cashCollected"] = money(sum(entry["collected"] for entry in report["entries"]))
        report["netSales"] = money(report["cashCollected"] - float(report.get("totalExpense") or 0))
    payload["note"] = (
        "Test amounts from Kaggle dataset shreyashdodekar/synthetic-bakery-sales-dataset (CC0). "
        "ST01, ST02, and ST03 stay on Batangas, Bauan, and Citimart. "
        "Each location row uses a real retailer name from that area."
    )
    return payload


def load_rows():
    import kagglehub
    from openpyxl import load_workbook

    folder = Path(kagglehub.dataset_download(DATASET))
    files = list(folder.glob("*.xlsx")) + list(folder.glob("*.csv"))
    if not files:
        raise SystemExit(f"No data file in {folder}")
    path = files[0]
    if path.suffix.lower() == ".csv":
        raise SystemExit("CSV adapter is not used; this release is an Excel workbook.")
    wb = load_workbook(path, read_only=True, data_only=True)
    ws = wb[wb.sheetnames[0]]
    rows = ws.iter_rows(values_only=True)
    header = [str(h) for h in next(rows)]
    idx = {name: i for i, name in enumerate(header)}
    for row in rows:
        if not row or row[idx["Transaction_ID"]] is None:
            continue
        yield row, idx
    wb.close()


def build():
    # (date, product) across every dataset store, then shared across every retailer area.
    grouped = {}
    for row, idx in load_rows():
        raw_date = row[idx["Date"]]
        report_date = raw_date.strftime("%Y-%m-%d") if hasattr(raw_date, "strftime") else str(raw_date)[:10]
        product = str(row[idx["Product"]] or "Item")
        key = (report_date, product)
        bucket = grouped.get(key)
        if bucket is None:
            bucket = {"qty": 0, "bill": 0.0, "waste": 0.0}
            grouped[key] = bucket
        bucket["qty"] += int(row[idx["Quantity"]] or 0)
        bucket["bill"] += float(row[idx["Total_Bill"]] or 0)
        bucket["waste"] += float(row[idx["Waste_Cost"]] or 0)

    retailers = load_retailers()
    areas = [area for area in AREA_ORDER if retailers.get(area)]
    by_date = defaultdict(list)
    for (report_date, product), bucket in grouped.items():
        entry = {
            "retailerArea": "",
            "retailerSlug": slugify(product),
            "retailerName": product,
            "cons": bucket["qty"],
            "collected": money(bucket["bill"]),
        }
        by_date[report_date].append((product, entry, bucket["waste"]))

    by_sheet = defaultdict(list)
    for day_index, report_date in enumerate(sorted(by_date)):
        lines = by_date[report_date]
        lines.sort(key=lambda item: item[0])
        offset = day_index % len(areas)
        for index, line in enumerate(lines):
            area = areas[(index + offset) % len(areas)]
            by_sheet[(area, report_date)].append(line)
    for key, lines in list(by_sheet.items()):
        by_sheet[key] = label_with_retailers(key[0], lines, retailers)

    daily_reports = []
    source_dates = defaultdict(list)
    for (source, report_date), lines in by_sheet.items():
        lines.sort(key=lambda item: item[0])
        entries = [item[1] for item in lines]
        waste = money(sum(item[2] for item in lines))
        collected = money(sum(item[1]["collected"] for item in lines))
        daily_reports.append(
            {
                "id": f"kaggle-{source}-{report_date.replace('-', '')}",
                "reportDate": report_date,
                "source": source,
                "areaLabel": AREA_LABELS[source],
                "sourceImage": "",
                "entries": entries,
                "totalExpense": waste,
                "cashCollected": collected,
                "netSales": money(collected - waste),
                "isCustom": False,
                "isTestData": True,
            }
        )
        source_dates[source].append(report_date)

    daily_reports.sort(key=lambda r: (r["reportDate"], AREA_ORDER.index(r["source"])))
    sources = {}
    for source in AREA_ORDER:
        dates = sorted(source_dates.get(source) or [])
        if not dates:
            continue
        sources[source] = {
            "from": dates[0],
            "to": dates[-1],
            "sheets": len(dates),
            "testData": True,
        }

    date_from = daily_reports[0]["reportDate"] if daily_reports else None
    date_to = daily_reports[-1]["reportDate"] if daily_reports else None
    return {
        "importedAt": "2026-09-29T00:00:00.000Z",
        "dateRange": {"from": date_from, "to": date_to},
        "sources": sources,
        "note": (
            "Test data from Kaggle dataset shreyashdodekar/synthetic-bakery-sales-dataset (CC0). "
            "Each day's sales are shared across every retailer area. "
            "Location rows use the real retailer names in that area. Cons is units and Collected is the bill."
        ),
        "isTestData": True,
        "adminOnly": True,
        "dataset": DATASET,
        "dailyReports": daily_reports,
        "sales": [],
    }


def write_outputs(payload):
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    header = (
        "/**\n"
        " * Admin test sales from Kaggle dataset shreyashdodekar/synthetic-bakery-sales-dataset.\n"
        " * Location names are the real retailers in each area.\n"
        " * Generated by js/generate-fake-admin-sales.py — not client Excel imports.\n"
        " * Include this script only on admin sales pages.\n"
        " */\n"
    )
    OUT_JS.write_text(
        header
        + "window.KREEZBY_ADMIN_TEST_SALES = "
        + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )
    entries = sum(len(r["entries"]) for r in payload["dailyReports"])
    print("sheets", len(payload["dailyReports"]), "entries", entries)
    print("range", payload["dateRange"])
    print("json_kb", round(OUT_JSON.stat().st_size / 1024, 1), "js_kb", round(OUT_JS.stat().st_size / 1024, 1))


def main():
    if "--relabel" in sys.argv:
        payload = json.loads(OUT_JSON.read_text(encoding="utf-8"))
        write_outputs(relabel_payload(payload, load_retailers()))
        return
    write_outputs(build())


if __name__ == "__main__":
    main()
