"""Kreezby product catalog used to relabel fake datasets.

Any incoming category and item name is matched to a product the bakeshop
actually sells. Keyword hits win (mango, ube, almond). Otherwise the source
category is assigned to one catalog product and stays there.
"""

from __future__ import annotations

import zlib

PRODUCTS = [
    {"category": "Pouch", "item": "Chocolate Crinkles", "price": 165, "keys": ("chocolate", "choco")},
    {"category": "Pouch", "item": "Choco-Almond Crinkles", "price": 165, "keys": ("almond",)},
    {"category": "Pouch", "item": "Choco-Cashew Crinkles", "price": 165, "keys": ("cashew",)},
    {"category": "Pouch", "item": "Strawberry Crinkles", "price": 165, "keys": ("strawberry", "straw")},
    {"category": "Pouch", "item": "Red Velvet Crinkles", "price": 165, "keys": ("red velvet", "velvet")},
    {"category": "Pouch", "item": "Lemon Crinkles", "price": 165, "keys": ("lemon",)},
    {"category": "Pouch", "item": "Melon Crinkles", "price": 165, "keys": ("melon",)},
    {"category": "Pouch", "item": "Pandan Crinkles", "price": 165, "keys": ("pandan",)},
    {"category": "Pouch", "item": "Ube Crinkles", "price": 165, "keys": ("ube", "purple yam")},
    {"category": "Jar", "item": "Mango Crinkles", "price": 165, "keys": ("mango",)},
    {"category": "Jar", "item": "Choco Butternut Crinkles", "price": 200, "keys": ("butternut",)},
]

# Longer keys first so "choco almond" is not swallowed by "choco".
_KEY_ORDER = sorted(
    ((key, product) for product in PRODUCTS for key in product["keys"]),
    key=lambda pair: len(pair[0]),
    reverse=True,
)


def match_product(category: str = "", item: str = "") -> dict:
    text = f"{category} {item}".lower()
    for key, product in _KEY_ORDER:
        if key in text:
            return product
    seed = (category or item or "item").strip().lower()
    return PRODUCTS[zlib.crc32(seed.encode("utf-8")) % len(PRODUCTS)]


def match_payment(value: str = "") -> str:
    """Shop payments are GCash, cash, or check. Cards are not accepted."""
    text = str(value or "").strip().lower().replace("_", " ").replace("-", " ")
    if "gcash" in text:
        return "GCash"
    if "check" in text or "cheque" in text:
        return "Check"
    if "debit" in text:
        return "Cash"
    if "credit" in text or "visa" in text or "mastercard" in text or text == "card":
        return "GCash"
    if "cash" in text or "cod" in text:
        return "Cash"
    if not text:
        return "Cash"
    return "Cash"
