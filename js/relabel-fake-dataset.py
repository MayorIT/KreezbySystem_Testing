"""Relabel a fake dataset so category and item are Kreezby products.

python js/relabel-fake-dataset.py <csv> [output.csv]
"""

from __future__ import annotations

import csv
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kreezby_catalog import match_payment, match_product

CATEGORY_FIELDS = ("Item_Category", "Category", "category", "Product_Category")
ITEM_FIELDS = ("Item_Name", "Items", "Item", "Product", "Product_Name", "product")
PRICE_FIELDS = ("Price_Per_Item", "Price", "Unit_Price")
QTY_FIELDS = ("Quantity", "Qty")
TOTAL_FIELDS = ("Total_Price", "Total", "Total_Bill")
PAYMENT_FIELDS = ("Payment_Method", "Payment", "payment_method", "Mode_of_Payment")


def pick(row, names):
    for name in names:
        if name in row and str(row[name]).strip():
            return name
    return ""


def relabel(src: Path, dest: Path):
    with src.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        fieldnames = list(reader.fieldnames or [])
        rows = list(reader)
    if not rows:
        raise SystemExit(f"No rows in {src}")

    category_field = pick(rows[0], CATEGORY_FIELDS)
    item_field = pick(rows[0], ITEM_FIELDS)
    price_field = pick(rows[0], PRICE_FIELDS)
    qty_field = pick(rows[0], QTY_FIELDS)
    total_field = pick(rows[0], TOTAL_FIELDS)
    payment_field = pick(rows[0], PAYMENT_FIELDS)
    if not item_field and not category_field:
        raise SystemExit("No category or item column found.")

    from kreezby_catalog import PRODUCTS

    def source_key(source_category, source_item):
        return source_category.strip() or source_item.strip() or "(blank)"

    def keyword_hit(source_category, source_item):
        text = f"{source_category} {source_item}".lower()
        return any(key in text for product in PRODUCTS for key in product["keys"])

    if not category_field:
        category_field = "Category"
        if item_field in fieldnames:
            fieldnames.insert(fieldnames.index(item_field), category_field)
        else:
            fieldnames.append(category_field)

    assigned = {}
    unmatched = []
    for row in rows:
        source_category = row.get(category_field, "") if category_field in row else ""
        source_item = row.get(item_field, "") if item_field else ""
        key = source_key(source_category, source_item)
        if keyword_hit(source_category, source_item):
            assigned[key] = match_product(source_category, source_item)
        elif key not in unmatched:
            unmatched.append(key)

    unmatched.sort()
    for index, key in enumerate(unmatched):
        if key not in assigned:
            assigned[key] = PRODUCTS[index % len(PRODUCTS)]

    mapping = Counter()
    for row in rows:
        source_category = row.get(category_field, "") if category_field in row else ""
        source_item = row.get(item_field, "") if item_field else ""
        key = source_key(source_category, source_item)
        product = assigned.get(key) or match_product(source_category, source_item)
        mapping[(key, product["category"], product["item"])] += 1
        row[category_field] = product["category"]
        if item_field:
            row[item_field] = product["item"]
        if price_field:
            row[price_field] = f"{product['price']:.2f}"
        else:
            row["Unit_Price"] = f"{product['price']:.2f}"
        if qty_field:
            try:
                qty = float(row.get(qty_field) or 0)
            except ValueError:
                qty = 0
        else:
            qty = 1
            row["Quantity"] = "1"
        if total_field:
            row[total_field] = f"{qty * product['price']:.2f}"
        else:
            row["Total_Price"] = f"{qty * product['price']:.2f}"
        if payment_field:
            row[payment_field] = match_payment(row.get(payment_field, ""))

    for extra in ("Quantity", "Unit_Price", "Total_Price"):
        if extra not in fieldnames and any(extra in row for row in rows[:1]):
            fieldnames.append(extra)

    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print("rows", len(rows))
    print("wrote", dest)
    print("mapping")
    for (source, category, item), count in sorted(mapping.items(), key=lambda pair: (-pair[1], pair[0][0])):
        print(f"  {count:4} {source or '(blank)'} -> {category} / {item}")
    print("first")
    for row in rows[:5]:
        category = row.get(category_field, "") if category_field else ""
        item = row.get(item_field, "") if item_field else ""
        price = row.get(price_field, "") if price_field else ""
        total = row.get(total_field, "") if total_field else ""
        print(f"  {category} | {item} | {price} | {total}")


def main():
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python js/relabel-fake-dataset.py <csv> [output.csv]")
    src = Path(sys.argv[1])
    dest = Path(sys.argv[2]) if len(sys.argv) > 2 else src.with_name(src.stem + "-kreezby.csv")
    relabel(src, dest)


if __name__ == "__main__":
    main()
