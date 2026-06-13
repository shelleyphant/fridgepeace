from __future__ import annotations

import re
from datetime import date

MONTHS = {
    "jan": 1,
    "january": 1,
    "feb": 2,
    "february": 2,
    "mar": 3,
    "march": 3,
    "apr": 4,
    "april": 4,
    "may": 5,
    "jun": 6,
    "june": 6,
    "jul": 7,
    "july": 7,
    "aug": 8,
    "august": 8,
    "sep": 9,
    "sept": 9,
    "september": 9,
    "oct": 10,
    "october": 10,
    "nov": 11,
    "november": 11,
    "dec": 12,
    "december": 12,
}

LABEL_PATTERNS = [
    ("use-by", r"\buse\s*by\b|\buse\s*before\b"),
    ("best-before", r"\bbest\s*before\b|\bbest\s*bef\b|\bbb\b"),
    ("baked-on", r"\bbaked\s*on\b|\bbkd\s*on\b|\bbaked\s*for\b|\bbkd\s*for\b"),
    ("packed-on", r"\bpacked\s*on\b|\bpacked\b|\bpkd\b"),
]


def detect_label_type(text: str) -> str | None:
    lowered = text.lower()
    for label_type, pattern in LABEL_PATTERNS:
        if re.search(pattern, lowered):
            return label_type
    return None


def _normalise_year(value: str | int | None, today: date | None = None) -> int | None:
    if value is None:
        return None
    year = int(value)
    if year < 100:
        return 2000 + year
    return year


def _safe_date(year: int, month: int, day: int) -> date | None:
    try:
        return date(year, month, day)
    except ValueError:
        return None


def parse_australian_date(text: str, today: date | None = None) -> date | None:
    """Parse common Australian package dates using day-first rules.

    Ambiguous numeric dates such as 08/06/2026 are interpreted as
    8 June 2026, not 6 August 2026.
    """
    if today is None:
        today = date.today()
    cleaned = re.sub(r"[,]", " ", text.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"(?<=\d)\.(?=\s*[A-Za-z])", " ", cleaned)
    cleaned = re.sub(r"(?<=[A-Za-z])\.(?=\s*\d)", " ", cleaned)
    cleaned = re.sub(r"(?<=[A-Za-z])\.", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned)

    # DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD MM YYYY
    match = re.search(r"\b(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{2,4})\b", cleaned)
    if match:
        day, month, year = int(match.group(1)), int(match.group(2)), _normalise_year(match.group(3), today)
        if year:
            return _safe_date(year, month, day)

    # DD MON YYYY or DD MON YY
    match = re.search(r"\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2,4})\b", cleaned)
    if match:
        day = int(match.group(1))
        month = MONTHS.get(match.group(2).lower())
        year = _normalise_year(match.group(3), today)
        if month and year:
            return _safe_date(year, month, day)

    # MON DD YYYY or MON DD YY
    match = re.search(r"\b([A-Za-z]{3,9})\s+(\d{1,2})\s+(\d{2,4})\b", cleaned)
    if match:
        month = MONTHS.get(match.group(1).lower())
        day = int(match.group(2))
        year = _normalise_year(match.group(3), today)
        if month and year:
            return _safe_date(year, month, day)

    # DD MON, year omitted.
    match = re.search(r"\b(\d{1,2})\s+([A-Za-z]{3,9})\b", cleaned)
    if match:
        day = int(match.group(1))
        month = MONTHS.get(match.group(2).lower())
        if month:
            candidate = _safe_date(today.year, month, day)
            if candidate and candidate < today:
                candidate = _safe_date(today.year + 1, month, day)
            return candidate

    # MON DD, year omitted.
    match = re.search(r"\b([A-Za-z]{3,9})\s+(\d{1,2})\b", cleaned)
    if match:
        month = MONTHS.get(match.group(1).lower())
        day = int(match.group(2))
        if month:
            candidate = _safe_date(today.year, month, day)
            if candidate and candidate < today:
                candidate = _safe_date(today.year + 1, month, day)
            return candidate

    # DD MM, year omitted. Day-first Australian interpretation.
    match = re.search(r"\b(\d{1,2})\s+(\d{1,2})\b", cleaned)
    if match:
        day, month = int(match.group(1)), int(match.group(2))
        candidate = _safe_date(today.year, month, day)
        if candidate and candidate < today:
            candidate = _safe_date(today.year + 1, month, day)
        return candidate

    # MM YYYY, only useful as a best-before month. Use first day of month.
    match = re.search(r"\b(\d{1,2})[\/\-\.\s](\d{4})\b", cleaned)
    if match:
        month, year = int(match.group(1)), int(match.group(2))
        return _safe_date(year, month, 1)

    # MON YYYY, only useful as a best-before month. Use first day of month.
    match = re.search(r"\b([A-Za-z]{3,9})\s+(\d{4})\b", cleaned)
    if match:
        month = MONTHS.get(match.group(1).lower())
        year = int(match.group(2))
        if month:
            return _safe_date(year, month, 1)

    return None


def parse_labelled_expiry(raw_text: str, today: date | None = None) -> tuple[str | None, date | None]:
    label_type = detect_label_type(raw_text)
    parsed = parse_australian_date(raw_text, today=today)
    if label_type in {"baked-on", "packed-on"}:
        return label_type, None
    return label_type, parsed
