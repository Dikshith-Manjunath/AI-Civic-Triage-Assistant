"""PII Detection and Encryption for citizen complaint data.

This module provides:
- PII detection (phone numbers, Aadhaar, addresses, etc.)
- AES-256-GCM encryption for sensitive fields
- Key management integration with secret manager
- Redaction utilities for logs and notifications
"""

from __future__ import annotations

import base64
import hashlib
import logging
import re
from typing import Any

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from api.config import settings

logger = logging.getLogger("civicflow.pii")

# ── PII Patterns for India ──

PII_PATTERNS = {
    # Aadhaar Number: 12 digits (can have spaces/dashes)
    "aadhaar": re.compile(
        r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b"
    ),
    # PAN Card: 10 alphanumeric (5 letters, 4 digits, 1 letter)
    "pan": re.compile(
        r"\b[A-Z]{5}\d{4}[A-Z]\b"
    ),
    # Indian Phone Numbers: +91 or 0 followed by 10 digits, with optional spacing
    "phone": re.compile(
        r"(?:\+91[-\s]?|0)?[6-9]\d{4}[\s-]?\d{5}\b"
    ),
    # Email addresses
    "email": re.compile(
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
    ),
    # Indian PIN Codes: 6 digits
    "pincode": re.compile(
        r"\b[1-9]\d{5}\b"
    ),
    # Credit/Debit Card: 13-19 digits
    "card": re.compile(
        r"\b(?:\d[ -]*?){13,19}\b"
    ),
    # Vehicle Registration: KA-01-AB-1234 format (Karnataka)
    "vehicle": re.compile(
        r"\b[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,2}[-\s]?\d{1,4}\b",
        re.IGNORECASE,
    ),
}

# Patterns that might indicate an address
ADDRESS_INDICATORS = [
    r"\d+\s+[\w\s]+(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr|cross|main|block|sector)",
    r"(?:plot|house|flat|apartment|door)\s*(?:no\.?|number)?\s*[:#]?\s*\d+",
    r"(?:near|opposite|behind)\s+[\w\s]+(?:temple|school|hospital|park|metro|station)",
]


class PIIDetector:
    """Detect and classify PII in text data."""

    def __init__(self, patterns: dict[str, re.Pattern] | None = None):
        """Initialize PII detector.

        Args:
            patterns: Custom patterns dict (uses defaults if None).
        """
        self.patterns = patterns or PII_PATTERNS

    def detect(self, text: str) -> dict[str, list[str]]:
        """Detect all PII types in text.

        Args:
            text: Input text to scan.

        Returns:
            Dict mapping PII type to list of matches found.
        """
        findings: dict[str, list[str]] = {}

        for pii_type, pattern in self.patterns.items():
            matches = pattern.findall(text)
            if matches:
                findings[pii_type] = matches

        return findings

    def has_pii(self, text: str) -> bool:
        """Check if text contains any PII.

        Args:
            text: Input text to check.

        Returns:
            True if PII detected, False otherwise.
        """
        return bool(self.detect(text))

    def get_pii_types(self, text: str) -> list[str]:
        """Get list of PII types found in text.

        Args:
            text: Input text to scan.

        Returns:
            List of PII type keys found.
        """
        return list(self.detect(text).keys())

    def redact(self, text: str, replacement: str = "[REDACTED]") -> str:
        """Redact all PII from text.

        Args:
            text: Input text to redact.
            replacement: String to replace PII with.

        Returns:
            Text with PII replaced.
        """
        result = text

        for pii_type, pattern in self.patterns.items():
            result = pattern.sub(replacement, result)

        return result

    def mask_phone(self, text: str) -> str:
        """Mask phone numbers keeping last 4 digits visible.

        Example: 9876543210 -> *** ***3210
        """
        pattern = self.patterns["phone"]

        def mask_match(match: re.Match) -> str:
            phone = match.group(0)
            digits = "".join(c for c in phone if c.isdigit())
            if len(digits) >= 10:
                return f"*** ***{digits[-4:]}"
            return phone

        return pattern.sub(mask_match, text)

    def mask_aadhaar(self, text: str) -> str:
        """Mask Aadhaar number keeping last 4 digits visible.

        Example: 1234 5678 9012 -> XXXX XXXX 9012
        """
        pattern = self.patterns["aadhaar"]

        def mask_match(match: re.Match) -> str:
            aadhaar = match.group(0)
            last_four = aadhaar[-4:]
            return f"XXXX XXXX {last_four}"

        return pattern.sub(mask_match, text)


class PIIEncryptor:
    """Encrypt PII fields using AES-256-GCM.

    Uses the secret_key from settings for encryption.
    In production, this should integrate with a proper key management service.
    """

    def __init__(self, secret_key: str | None = None):
        """Initialize encryptor with encryption key.

        Args:
            secret_key: Encryption key (uses settings.secret_key if None).
        """
        self.secret_key = secret_key or settings.secret_key
        self._encryption_key: bytes | None = None

    def _derive_key(self, salt: bytes = b"civicflow_pii_v1") -> bytes:
        """Derive encryption key from secret using PBKDF2.

        Args:
            salt: Salt for key derivation.

        Returns:
            32-byte encryption key.
        """
        if self._encryption_key is None:
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
                backend=default_backend(),
            )
            self._encryption_key = kdf.derive(self.secret_key.encode())

        return self._encryption_key

    def encrypt(self, plaintext: str) -> str:
        """Encrypt plaintext string.

        Args:
            plaintext: Text to encrypt.

        Returns:
            Base64-encoded ciphertext with IV prepended.
        """
        import os

        key = self._derive_key()
        iv = os.urandom(12)  # 96-bit IV for GCM

        cipher = Cipher(
            algorithms.AES(key),
            modes.GCM(iv),
            backend=default_backend(),
        )
        encryptor = cipher.encryptor()

        ciphertext = encryptor.update(plaintext.encode()) + encryptor.finalize()

        # Combine IV + tag + ciphertext and encode as base64
        combined = iv + encryptor.tag + ciphertext
        return base64.b64encode(combined).decode("utf-8")

    def decrypt(self, ciphertext_b64: str) -> str:
        """Decrypt base64-encoded ciphertext.

        Args:
            ciphertext_b64: Base64-encoded ciphertext with IV prepended.

        Returns:
            Decrypted plaintext.

        Raises:
            ValueError: If decryption fails (wrong key or corrupted data).
        """
        try:
            key = self._derive_key()
            combined = base64.b64decode(ciphertext_b64.encode("utf-8"))

            # Extract IV (12 bytes), tag (16 bytes), and ciphertext
            iv = combined[:12]
            tag = combined[12:28]
            ciphertext = combined[28:]

            cipher = Cipher(
                algorithms.AES(key),
                modes.GCM(iv, tag),
                backend=default_backend(),
            )
            decryptor = cipher.decryptor()

            plaintext = decryptor.update(ciphertext) + decryptor.finalize()
            return plaintext.decode("utf-8")

        except Exception as exc:
            logger.error("Decryption failed: %s", exc)
            raise ValueError("Failed to decrypt data - invalid key or corrupted data") from exc

    def hash_for_indexing(self, plaintext: str) -> str:
        """Create one-way hash for indexing/lookup without storing plaintext.

        Args:
            plaintext: Text to hash.

        Returns:
            SHA-256 hash of the plaintext.
        """
        return hashlib.sha256(plaintext.encode() + self.secret_key.encode()).hexdigest()


# ── Convenience functions ──
_detector: PIIDetector | None = None
_encryptor: PIIEncryptor | None = None


def get_detector() -> PIIDetector:
    """Get or create PII detector instance."""
    global _detector
    if _detector is None:
        _detector = PIIDetector()
    return _detector


def get_encryptor() -> PIIEncryptor:
    """Get or create PII encryptor instance."""
    global _encryptor
    if _encryptor is None:
        _encryptor = PIIEncryptor()
    return _encryptor


def detect_pii(text: str) -> dict[str, list[str]]:
    """Detect PII in text (convenience function)."""
    return get_detector().detect(text)


def redact_pii(text: str) -> str:
    """Redact PII from text (convenience function)."""
    return get_detector().redact(text)


def encrypt_pii(plaintext: str) -> str:
    """Encrypt PII field (convenience function)."""
    return get_encryptor().encrypt(plaintext)


def decrypt_pii(ciphertext: str) -> str:
    """Decrypt PII field (convenience function)."""
    return get_encryptor().decrypt(ciphertext)


def process_complaint_for_storage(text: str) -> dict[str, Any]:
    """Process complaint text for secure storage.

    1. Detect PII
    2. Encrypt if PII found
    3. Return processed data with PII flags

    Args:
        text: Raw complaint text.

    Returns:
        Dict with:
            - has_pii: bool
            - pii_types: list
            - encrypted_text: str (if has_pii)
            - redacted_text: str (for logs)
    """
    detector = get_detector()
    encryptor = get_encryptor()

    findings = detector.detect(text)
    has_pii = bool(findings)

    result: dict[str, Any] = {
        "has_pii": has_pii,
        "pii_types": list(findings.keys()),
        "redacted_text": detector.redact(text),
    }

    if has_pii:
        result["encrypted_text"] = encryptor.encrypt(text)
        result["pii_count"] = sum(len(v) for v in findings.values())
        logger.info(
            "Complaint contains PII: types=%s, count=%d",
            result["pii_types"],
            result["pii_count"],
        )
    else:
        result["encrypted_text"] = ""

    return result
