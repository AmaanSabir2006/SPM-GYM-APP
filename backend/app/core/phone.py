"""
Phone number normalization and variant lookup helpers.
Ensures phone uniqueness checks handle differences in international prefixes (+92, 92),
local leading zeros (0300...), dashes, spaces, and formatting.
"""
from typing import List, Set


def normalize_phone_number(raw_phone: str) -> str:
    """
    Normalizes a phone number to standard local Pakistani 11-digit format (e.g. 03001234567)
    or clean digits for general numbers.
    """
    if not raw_phone:
        return ""

    digits = "".join(filter(str.isdigit, raw_phone))

    # Pakistani numbers
    if digits.startswith("92") and len(digits) == 12:
        return "0" + digits[2:]
    if digits.startswith("0092") and len(digits) == 14:
        return "0" + digits[4:]
    if digits.startswith("3") and len(digits) == 10:
        return "0" + digits
    if digits.startswith("0") and len(digits) == 11:
        return digits

    return digits if digits else raw_phone.strip()


def get_phone_lookup_variants(raw_phone: str) -> List[str]:
    """
    Returns a list of common string representations for a phone number
    to perform robust database matching across different historical stored formats:
    - Local: 03001234567
    - International digits: 923001234567
    - International plus: +923001234567
    - 10 digits without leading zero: 3001234567
    - Hyphenated: 0300-1234567
    - Original raw input stripped
    """
    if not raw_phone:
        return []

    variants: Set[str] = set()
    raw_clean = raw_phone.strip()
    if raw_clean:
        variants.add(raw_clean)

    digits = "".join(filter(str.isdigit, raw_clean))
    if not digits:
        return list(variants)

    variants.add(digits)

    # Extract 10-digit mobile subscriber number for Pakistani numbers
    sub_10 = None
    if digits.startswith("92") and len(digits) >= 12:
        sub_10 = digits[2:12]
    elif digits.startswith("0092") and len(digits) >= 14:
        sub_10 = digits[4:14]
    elif digits.startswith("0") and len(digits) == 11:
        sub_10 = digits[1:]
    elif digits.startswith("3") and len(digits) == 10:
        sub_10 = digits

    if sub_10 and len(sub_10) == 10:
        local_03 = f"0{sub_10}"
        int_92 = f"92{sub_10}"
        plus_92 = f"+92{sub_10}"
        hyphen_03 = f"{local_03[:4]}-{local_03[4:]}"
        hyphen_plus = f"{plus_92[:3]}-{sub_10[:3]}-{sub_10[3:]}"

        variants.add(local_03)
        variants.add(int_92)
        variants.add(plus_92)
        variants.add(sub_10)
        variants.add(hyphen_03)
        variants.add(hyphen_plus)

    return list(variants)


def format_whatsapp_phone(raw_phone: str) -> str:
    """
    Standardizes phone numbers for WhatsApp wa.me links (e.g. 923001234567).
    """
    digits = "".join(filter(str.isdigit, raw_phone))
    if digits.startswith("0") and len(digits) == 11:
        digits = "92" + digits[1:]
    elif digits.startswith("92"):
        pass
    elif len(digits) == 10 and digits.startswith("3"):
        digits = "92" + digits
    return digits
