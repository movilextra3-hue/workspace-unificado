#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Análisis de archivo binario / hex dump.
Usa: python analyze_binary.py "E:\\Binary Viewer\\decmap.txt"
     python analyze_binary.py "ruta\\archivo.bin"
     python analyze_binary.py "decmap.txt" --limit 100000  (solo primeros 100KB para prueba rápida)
"""

import base64
import hashlib
import hmac
import io
import os
import shutil
import subprocess
import sys
import tempfile
import zlib
from collections import Counter
from pathlib import Path
from typing import Any

# Algoritmos CRC16: (nombre, poly, init, xor_out, ref_in, ref_out)
# Fuente: Catalogue of parametrised CRC algorithms
CRC16_ALGORITHMS = [
    ("CRC-16/ARC (IBM)", 0x8005, 0x0000, 0x0000, True, True),
    ("CRC-16/AUG-CCITT", 0x1021, 0x1D0F, 0x0000, False, False),
    ("CRC-16/BUYPASS", 0x8005, 0x0000, 0x0000, False, False),
    ("CRC-16/CCITT-FALSE (XMODEM)", 0x1021, 0xFFFF, 0x0000, False, False),
    ("CRC-16/CDMA2000", 0xC867, 0xFFFF, 0x0000, False, False),
    ("CRC-16/CMS", 0x8005, 0xFFFF, 0x0000, False, False),
    ("CRC-16/DDS-110", 0x8005, 0x800D, 0x0000, False, False),
    ("CRC-16/DECT-R", 0x0589, 0x0000, 0x0001, False, False),
    ("CRC-16/DECT-X", 0x0589, 0x0000, 0x0000, False, False),
    ("CRC-16/DNP", 0x3D65, 0x0000, 0xFFFF, True, True),
    ("CRC-16/EN-13757", 0x3D65, 0x0000, 0xFFFF, False, False),
    ("CRC-16/GENIBUS", 0x1021, 0xFFFF, 0xFFFF, False, False),
    ("CRC-16/GSM", 0x1021, 0x0000, 0xFFFF, False, False),
    ("CRC-16/IBM-3740", 0x1021, 0xFFFF, 0x0000, False, False),
    ("CRC-16/IBM-SDLC", 0x1021, 0xFFFF, 0xFFFF, True, True),
    ("CRC-16/ISO-IEC-14443-3-A", 0x1021, 0xC6C6, 0x0000, True, True),
    ("CRC-16/KERMIT", 0x1021, 0x0000, 0x0000, True, True),
    ("CRC-16/LJ1200", 0x6F63, 0x0000, 0x0000, False, False),
    ("CRC-16/M17", 0x5935, 0xFFFF, 0x0000, False, False),
    ("CRC-16/MAXIM-DOW", 0x8005, 0x0000, 0xFFFF, True, True),
    ("CRC-16/MCRF4XX", 0x1021, 0xFFFF, 0x0000, True, True),
    ("CRC-16/MODBUS", 0x8005, 0xFFFF, 0x0000, True, True),
    ("CRC-16/NRSC-5", 0x080B, 0xFFFF, 0x0000, True, True),
    ("CRC-16/OPENSAFETY-A", 0x5935, 0x0000, 0x0000, False, False),
    ("CRC-16/OPENSAFETY-B", 0x755B, 0x0000, 0x0000, False, False),
    ("CRC-16/PROFIBUS", 0x1DCF, 0xFFFF, 0xFFFF, False, False),
    ("CRC-16/RIELLO", 0x1021, 0xB2AA, 0x0000, True, True),
    ("CRC-16/SPI-FUJITSU", 0x1021, 0x1D0F, 0x0000, False, False),
    ("CRC-16/T10-DIF", 0x8BB7, 0x0000, 0x0000, False, False),
    ("CRC-16/TELEDISK", 0xA097, 0x0000, 0x0000, False, False),
    ("CRC-16/TMS37157", 0x1021, 0x89EC, 0x0000, True, True),
    ("CRC-16/UMTS", 0x8005, 0x0000, 0x0000, False, False),
    ("CRC-16/USB", 0x8005, 0xFFFF, 0xFFFF, True, True),
    ("CRC-16/X-25", 0x1021, 0xFFFF, 0xFFFF, True, True),
    ("CRC-16/XMODEM", 0x1021, 0x0000, 0x0000, False, False),
]

# Patrones a buscar (del PNG/instructivo)
# Variantes DTC: Document Transfer Credit, dtc500m (€500M), TUBDDEDD502, DAES/DTC, DTC8 (contexto offset 9.2M)
PATTERNS = [
    b"TUBDDEDD",
    b"794521741",
    b"MT103",
    b"MT103STP",
    b"DAES",
    b"DTC",
    b"dtc",
    b"DTC500",
    b"DTC500M",
    b"DTC502",
    b"DTC8",
    b"DAESDTC",
    b"DTC/DAES",
    b"DAES/DTC",
    b"DTC-",
    b"DTC_",
    b"HSBC",
    b"SWIFT",
    b"ISO20022",
]

# Claves del PNG (campos visibles en la imagen HSBC)
# Variantes DTC para XOR/crypto: Document Transfer Credit, dtc500m, TUBDDEDD502, DAES/DTC
PNG_KEYS = [
    "UYDEDKJFH-345FKVG-3EDF",   # $CRED$ CODE (credencial principal)
    "UYDEDKJFH345FKVG3EDF",     # $CRED$ sin guiones
    "TUBDDEDD502",              # SWIFT BIC
    "TUBDDEDD",
    "794521741",                # ACCOUNT NUMBER
    "500000000",                # AMOUNT €500M
    "500.000.000",
    "DAES",
    "DTC",
    "dtc",
    "DTC500",
    "DTC500M",
    "DTC502",
    "DAESDTC",
    "DAES/DTC",
    "DTC/DAES",
    "HSBC",
    "AUTHORIZATION TO VERIFY",
]


# --- S-record (S19/S28/S37) ---
# Motorola S-record: S0 header, S1/S2/S3 data (16/24/32-bit addr), S5/S6 count, S7/S8/S9 termination
SRECORD_ADDR_BYTES = {"0": 2, "1": 2, "2": 3, "3": 4, "5": 2, "6": 3, "7": 4, "8": 3, "9": 2}


def srecord_parse(data: str | bytes) -> tuple[bytes, dict]:
    """
    Parsea formato Motorola S-record (S19/S28/S37).
    Retorna (datos binarios concatenados por dirección, info).
    """
    if isinstance(data, bytes):
        text = data.decode("utf-8", errors="replace")
    else:
        text = data
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    memory: dict[int, bytes] = {}
    info: dict[str, Any] = {
        "s0": [], "s1": 0, "s2": 0, "s3": 0,
        "s5": [], "s6": [], "s7": [], "s8": [], "s9": [], "errors": [],
    }

    for lineno, line in enumerate(lines, 1):
        if not line.startswith("S") or len(line) < 4:
            continue
        rtype = line[1]
        if rtype not in SRECORD_ADDR_BYTES:
            continue
        try:
            bytecount = int(line[2:4], 16)
            addr_len = SRECORD_ADDR_BYTES[rtype] * 2  # hex chars
            if len(line) < 4 + addr_len + 2:  # type+count+addr+checksum
                info["errors"].append(f"L{lineno}: línea corta")
                continue
            addr = int(line[4:4 + addr_len], 16)
            data_hex_len = (bytecount - SRECORD_ADDR_BYTES[rtype] - 1) * 2
            data_end = 4 + addr_len + data_hex_len
            checksum_end = data_end + 2
            if len(line) < checksum_end:
                info["errors"].append(f"L{lineno}: longitud incorrecta")
                continue
            payload = bytes.fromhex(line[4:data_end])
            _ = int(line[data_end:checksum_end], 16)  # checksum (validación opcional)
            if rtype == "0":
                start = SRECORD_ADDR_BYTES[rtype]
                info["s0"].append(payload[start:].decode("ascii", errors="replace"))
            elif rtype == "1":
                info["s1"] += 1
                memory[addr] = payload[2:]  # quitar addr del payload
            elif rtype == "2":
                info["s2"] += 1
                memory[addr] = payload[3:]
            elif rtype == "3":
                info["s3"] += 1
                memory[addr] = payload[4:]
            elif rtype in "789":
                info[f"s{rtype}"].append(addr)  # dirección de inicio
            elif rtype in "56":
                info[f"s{rtype}"].append(addr)  # S5/S6: contador de registros
        except (ValueError, IndexError) as e:
            info["errors"].append(f"L{lineno}: {e}")

    if not memory:
        return b"", info
    # Reconstruir binario por orden de dirección, rellenando huecos con 0xFF
    sorted_addrs = sorted(memory.keys())
    result = bytearray()
    prev_end = 0
    for addr in sorted_addrs:
        data = memory[addr]
        if addr > prev_end:
            result.extend(b"\xFF" * (addr - prev_end))
        result.extend(data)
        prev_end = addr + len(data)
    return bytes(result), info


def srecord_detect(data: bytes | str) -> bool:
    """Detecta si los datos parecen S-record (líneas S0-S9)."""
    if isinstance(data, bytes):
        text = data.decode("utf-8", errors="replace")
    else:
        text = data
    for line in text.splitlines()[:20]:
        line = line.strip()
        if line and line[0] == "S" and len(line) > 2 and line[1] in "012356789":
            return True
    return False


def load_from_srecord(path: str, limit: int | None = None) -> tuple[bytes, dict]:
    """Carga y decodifica archivo S-record."""
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        text = f.read()
    if limit and len(text) > limit * 2:  # aprox líneas
        text = "\n".join(text.splitlines()[:5000])
    return srecord_parse(text)


def load_from_hexdump(path: str, limit: int | None = None) -> bytes:
    """Parsea decmap.txt (formato hex dump) y devuelve bytes raw."""
    data = bytearray()
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            if limit and len(data) >= limit:
                break
            line = line.strip()
            if not line:
                continue
            # Formato: "0000000000 8BDF3BAF 28C5B5C4 ..."
            parts = line.split()
            if len(parts) < 2:
                continue
            for word in parts[1:]:  # Saltar offset
                word = "".join(c for c in word.strip() if c in "0123456789ABCDEFabcdef")
                if not word:
                    continue
                if len(word) % 2:
                    word = "0" + word
                try:
                    data.extend(bytes.fromhex(word))
                except ValueError:
                    pass
    return bytes(data)


def load_binary(path: str) -> bytes:
    """Carga archivo binario directo."""
    with open(path, "rb") as f:
        return f.read()


def get_data(
    path: str, limit: int | None = None
) -> tuple[bytes, dict | None]:
    """
    Carga datos: binario directo, hex dump, o S-record (S19/S28/S37).
    Retorna (datos_binarios, srecord_info o None).
    """
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"No existe: {path}")
    srec_exts = (".s19", ".s28", ".s37", ".srec", ".s1", ".s2", ".s3")
    if p.suffix.lower() in (".txt",) + srec_exts:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            peek = f.read(8192)
        if p.suffix.lower() in srec_exts or srecord_detect(peek):
            data, srec_info = load_from_srecord(path, limit)
            return data, {"srecord": srec_info}
        if p.suffix.lower() == ".txt":
            data = load_from_hexdump(path, limit)
            return data, None
    data = load_binary(path)
    if limit:
        data = data[:limit]
    return data, None


def entropy(data: bytes) -> float:
    """Entropía de Shannon (bits por byte). Máx 8 = aleatorio/cifrado."""
    import math
    if not data:
        return 0.0
    freq = Counter(data)
    n = len(data)
    ent = 0.0
    for c in freq:
        p = freq[c] / n
        if p > 0:
            ent -= p * math.log2(p)
    return ent


def extract_strings(data: bytes, min_len: int = 6) -> list[str]:
    """Extrae cadenas ASCII imprimibles."""
    strings = []
    current = bytearray()
    for b in data:
        if 32 <= b <= 126 or b in (9, 10, 13):
            current.append(b)
        else:
            if len(current) >= min_len:
                try:
                    strings.append(current.decode("ascii"))
                except Exception:
                    pass
            current.clear()
    if len(current) >= min_len:
        try:
            strings.append(current.decode("ascii"))
        except Exception:
            pass
    return strings


def _reverse_bits16(x: int) -> int:
    """Invierte el orden de los 16 bits."""
    r = 0
    for _ in range(16):
        r = (r << 1) | (x & 1)
        x >>= 1
    return r


def _reflect_poly16(poly: int) -> int:
    """Refleja el polinomio de 16 bits (para ref_in)."""
    r = 0
    p = poly & 0xFFFF
    for _ in range(16):
        r = (r << 1) | (p & 1)
        p >>= 1
    return r


def _build_crc16_table(poly: int, ref_in: bool) -> list[int]:
    """Genera tabla de lookup para CRC16."""
    poly_eff = _reflect_poly16(poly) if ref_in else (poly & 0xFFFF)
    table = []
    for i in range(256):
        crc = i << 8 if ref_in else i
        for _ in range(8):
            if ref_in:
                crc = (crc >> 1) ^ poly_eff if (crc & 1) else crc >> 1
            else:
                crc = (crc << 1) ^ poly_eff if (crc & 0x8000) else crc << 1
            crc &= 0xFFFF
        table.append(crc)
    return table


def crc16_compute(
    data: bytes,
    poly: int,
    init: int = 0xFFFF,
    xor_out: int = 0,
    ref_in: bool = False,
    ref_out: bool = False,
) -> int:
    """Calcula CRC16 con los parámetros dados."""
    table = _build_crc16_table(poly, ref_in)
    crc = init & 0xFFFF
    for b in data:
        if ref_in:
            crc = ((crc >> 8) ^ table[(crc ^ b) & 0xFF]) & 0xFFFF
        else:
            crc = ((crc << 8) ^ table[((crc >> 8) ^ b) & 0xFF]) & 0xFFFF
    if ref_out:
        crc = _reverse_bits16(crc)
    return (crc ^ xor_out) & 0xFFFF


def xor_single_byte(data: bytes, key: int) -> bytes:
    return bytes(b ^ key for b in data)


def xor_repeating_key(data: bytes, key: bytes) -> bytes:
    """XOR con clave repetida (cada byte con key[i % len(key)])."""
    key = key or b"\x00"
    return bytes(data[i] ^ key[i % len(key)] for i in range(len(data)))


def _is_likely_plaintext(data: bytes, min_ratio: float = 0.60, sample_len: int = 512) -> bool:
    """Devuelve True si los datos parecen texto legible (evita falsos positivos de descifrado)."""
    if not data:
        return False
    chunk = data[:min(sample_len, len(data))]
    printable = sum(1 for b in chunk if 32 <= b <= 126 or b in (9, 10, 13))
    return printable / len(chunk) >= min_ratio


def _verify_integrity() -> list[str]:
    """
    Ejecuta tests de verificación al inicio. Retorna lista de fallos (vacía = todo OK).
    Garantiza que hash, búsqueda de patrones, XOR y entropía son correctos.
    """
    errors = []
    # Hash: SHA-256("abc") = NIST FIPS 180-2
    try:
        h = hashlib.sha256(b"abc").hexdigest()
        if h != "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad":
            errors.append("SHA-256: hash de test incorrecto")
    except Exception as e:
        errors.append(f"SHA-256: {e}")

    # Búsqueda de patrones: coincidencia exacta de bytes
    try:
        data = b"xxxMT103yyy"
        r = search_patterns(data)
        if "MT103" not in r or r["MT103"] != [3]:
            errors.append(f"search_patterns: MT103 esperado offset 3, got {r}")
    except Exception as e:
        errors.append(f"search_patterns: {e}")

    # XOR: idempotente (a ^ k ^ k = a)
    try:
        orig = bytes(range(256))
        key = 0xA5
        if xor_single_byte(xor_single_byte(orig, key), key) != orig:
            errors.append("xor_single_byte: no reversible")
    except Exception as e:
        errors.append(f"xor_single_byte: {e}")

    # Entropía: datos aleatorios ~8, constante ~0
    try:
        ent_rand = entropy(bytes(range(256)) * 4)
        ent_const = entropy(b"\x00" * 256)
        if not (7.5 < ent_rand < 8.5) or ent_const != 0.0:
            errors.append(f"entropy: rand={ent_rand}, const={ent_const}")
    except Exception as e:
        errors.append(f"entropy: {e}")

    return errors


# Base64 y variantes para descifrado
def try_base_decodes(data: bytes, sample_len: int = 8192) -> list[tuple[str, bytes | None, str]]:
    """Intenta decodificar con Base64, Base32, Base16, Base85 y variantes."""
    sample = data[:sample_len]
    results = []

    def _try(name: str, func, *args, check_plaintext: bool = False, **kwargs) -> None:
        try:
            out = func(*args, **kwargs)
            if check_plaintext and not _is_likely_plaintext(out, 0.60, 256):
                # Evita F.P.: decode ok pero salida es basura (ej. Base64 relaxed en binario)
                pct = 100 * sum(1 for b in out[:256] if 32 <= b <= 126 or b in (9, 10, 13)) / min(256, len(out)) if out else 0
                results.append((name, None, f"decode OK pero salida no legible ({pct:.0f}% printable)"))
            else:
                results.append((name, out, f"OK ({len(out)} bytes)"))
        except Exception as e:
            results.append((name, None, str(e)[:50]))

    # Base64 estándar
    _try("Base64 std", base64.b64decode, sample, validate=True)
    _try("Base64 std (relaxed)", base64.b64decode, sample, validate=False, check_plaintext=True)

    # Base64 URL-safe (+/ → -_)
    _try("Base64 URL-safe", base64.urlsafe_b64decode, sample, check_plaintext=True)

    # Base64 con padding corregido
    try:
        s = sample.decode("ascii", errors="ignore")
        s_clean = "".join(c for c in s if c in "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=")
        if len(s_clean) >= 4:
            _try("Base64 (solo chars válidos)", base64.b64decode, s_clean.encode(), validate=False, check_plaintext=True)
    except Exception:
        pass

    # Base32 estándar
    _try("Base32 std", base64.b32decode, sample)
    _try("Base32 hex", base64.b32hexdecode, sample)

    # Base16 (hex) - solo si los bytes parecen hex (0-9,A-F,a-f, espacios)
    hex_chars = set(b"0123456789ABCDEFabcdef \n\t")
    if len(sample) >= 2 and all(b in hex_chars for b in sample[:64]):
        _try("Base16 (hex)", base64.b16decode, sample.replace(b" ", b"").replace(b"\n", b""), casefold=True)

    # Base85 (Ascii85)
    _try("Base85 (Ascii85)", base64.a85decode, sample)
    _try("Base85 (folded)", base64.a85decode, sample, foldspaces=True)

    # Base85 (RFC 1924)
    _try("Base85 (b85decode)", base64.b85decode, sample)

    # Base32 con pad alternativo
    try:
        s = sample.decode("ascii", errors="ignore")
        s_clean = "".join(c for c in s if c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567=")
        if len(s_clean) >= 8:
            _try("Base32 (solo chars válidos)", base64.b32decode, s_clean.encode(), check_plaintext=True)
    except Exception:
        pass

    # Base58 (si está instalado) - solo si bytes parecen Base58 (0-9, A-Z sin O,I, a-z sin l)
    base58_alphabet = set(b"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz")
    if all(b in base58_alphabet for b in sample[:64]):
        try:
            import base58  # type: ignore[import-not-found]
            _try("Base58 (BTC)", base58.b58decode, sample.decode("ascii"))
        except ImportError:
            results.append(("Base58 (BTC)", None, "pip install base58"))
        except Exception as e:
            results.append(("Base58 (BTC)", None, str(e)[:40]))
    else:
        results.append(("Base58 (BTC)", None, "datos no parecen Base58"))

    return results


def try_xor_keys(data: bytes, sample_size: int = 10000) -> list[tuple[int, int]]:
    """Prueba XOR con claves 0x00-0xFF. Devuelve (key, count_ascii) ordenado por count."""
    sample = data[:sample_size] if len(data) > sample_size else data
    results = []
    for key in range(256):
        dec = xor_single_byte(sample, key)
        ascii_count = sum(1 for b in dec if 32 <= b <= 126 or b in (9, 10, 13))
        results.append((key, ascii_count))
    return sorted(results, key=lambda x: -x[1])


def search_patterns(data: bytes) -> dict[str, list[int]]:
    """Busca patrones conocidos. Devuelve {patrón: [offsets]}."""
    found = {}
    for pat in PATTERNS:
        offsets = []
        start = 0
        while True:
            pos = data.find(pat, start)
            if pos < 0:
                break
            offsets.append(pos)
            start = pos + 1
        if offsets:
            found[pat.decode("ascii", errors="replace")] = offsets[:10]  # primeros 10
    return found


def try_banking_methods(data: bytes, sample_len: int = 65536) -> list[tuple[str, str, bytes | None]]:
    """
    Métodos típicos de servidor bancario (Temenos, TCS BaNCS, SWIFT, ISO 20022):
    - Hashes SHA-256/384/512 (integridad, FIPS)
    - HMAC (autenticación)
    - AES, Rijndael, 3DES, DES, RC2 (cifrado)
    - GZIP/DEFLATE (compresión FileAct)
    """
    sample = data[:sample_len]
    results: list[tuple[str, str, bytes | None]] = []

    # 1. Hashes (integridad - estándar banca)
    for name, func in [
        ("SHA-256", hashlib.sha256),
        ("SHA-384", hashlib.sha384),
        ("SHA-512", hashlib.sha512),
        ("SHA-224", hashlib.sha224),
        ("MD5 (legacy)", hashlib.md5),
    ]:
        h = func(sample).hexdigest()
        results.append((name, h, None))

    # 2. HMAC-SHA256 con claves del PNG (autenticación de mensaje)
    for key_name in ["UYDEDKJFH-345FKVG-3EDF", "TUBDDEDD502", "794521741", "DTC500M", "DAES/DTC"]:
        try:
            mac = hmac.new(key_name.encode(), sample, hashlib.sha256).hexdigest()
            results.append((f"HMAC-SHA256 ({key_name[:20]}...)", mac, None))
        except Exception:
            pass

    # 3. Descompresión GZIP/DEFLATE/bzip2/lz4/lzma (FileAct usa compresión)
    for name, decompress in [
        ("zlib DEFLATE (raw)", lambda d: zlib.decompress(d, -zlib.MAX_WBITS)),
        ("zlib DEFLATE", zlib.decompress),
        ("gzip", lambda d: __import__("gzip").decompress(d)),
        ("bzip2", lambda d: __import__("bz2").decompress(d)),
        ("lzma", lambda d: __import__("lzma").decompress(d)),
    ]:
        try:
            dec = decompress(sample)
            # Clarificar: salida legible (texto) vs binaria (evita malentendidos)
            legible = _is_likely_plaintext(dec, 0.60, 512)
            pct = 100 * sum(1 for b in dec[:256] if 32 <= b <= 126 or b in (9, 10, 13)) / min(256, len(dec)) if dec else 0
            lbl = "texto" if legible else f"binario ({pct:.0f}% printable)"
            results.append((name, f"OK ({len(dec)} B, {lbl})", dec[:200]))
        except Exception as e:
            results.append((name, str(e)[:45], None))

    # 4. AES / Rijndael / 3DES / DES / RC2 (requiere pycryptodome)
    try:
        from Crypto.Cipher import AES, ARC2, DES, DES3  # type: ignore[import-not-found]  # noqa: I001
        from Crypto.Protocol.KDF import PBKDF2  # type: ignore[import-not-found]
        from Crypto.Util.Padding import unpad  # type: ignore[import-not-found]

        # Umbral: solo reportar descifrado si >60% ASCII (evita falsos positivos)
        ascii_min_ratio = 0.60

        # AES, Rijndael (AES = Rijndael 128-bit block; probamos también key 192-bit)
        for key_str in ["UYDEDKJFH-345FKVG-3EDF", "794521741", "TUBDDEDD502", "DTC500M", "DAES/DTC"]:
            for key_len, mode_name in [(16, "AES-128"), (24, "Rijndael-192"), (32, "AES-256")]:
                for use_iv_prefix, iv_label in [(True, "IV=primeros16B"), (False, "IV=ceros")]:
                    try:
                        key = PBKDF2(key_str.encode(), b"swift", dkLen=key_len, count=1000)
                        if use_iv_prefix and len(sample) >= 32:
                            iv, ct = sample[:16], sample[16:16 + (len(sample) - 16) // 16 * 16]
                        else:
                            iv, ct = b"\x00" * 16, sample[:len(sample) // 16 * 16]
                        if len(ct) < 16:
                            continue
                        cipher = AES.new(key, AES.MODE_CBC, iv)
                        dec = cipher.decrypt(ct)
                        dec = unpad(dec, 16)
                        if _is_likely_plaintext(dec, ascii_min_ratio):
                            ascii_c = sum(1 for b in dec[:1000] if 32 <= b <= 126)
                            results.append((
                                f"{mode_name}-CBC ({iv_label}) {key_str[:10]}...",
                                f"OK ({len(dec)} B, {ascii_c} ASCII)", dec[:100]))
                    except Exception:
                        pass
        # 3DES (Triple DES) - legacy bancario
        try:
            key3 = PBKDF2("UYDEDKJFH-345FKVG-3EDF".encode(), b"swift", dkLen=24, count=1000)
            iv = sample[:8]
            cipher = DES3.new(key3, DES3.MODE_CBC, iv)
            dec = cipher.decrypt(sample[8:8 + (len(sample) - 8) // 8 * 8])
            dec = unpad(dec, 8)
            if _is_likely_plaintext(dec, ascii_min_ratio):
                results.append(("3DES-CBC PBKDF2", f"OK ({len(dec)} B)", dec[:80]))
        except Exception:
            pass
        # DES (Single DES) - 8-byte key, 8-byte block
        for key_str in ["UYDEDKJFH-345FKVG-3EDF", "794521741", "TUBDDEDD502"]:
            for use_iv_prefix, iv_label in [(True, "IV=primeros8B"), (False, "IV=ceros")]:
                try:
                    key = PBKDF2(key_str.encode(), b"swift", dkLen=8, count=1000)
                    if use_iv_prefix and len(sample) >= 16:
                        iv, ct = sample[:8], sample[8:8 + (len(sample) - 8) // 8 * 8]
                    else:
                        iv, ct = b"\x00" * 8, sample[:len(sample) // 8 * 8]
                    if len(ct) < 8:
                        continue
                    cipher = DES.new(key, DES.MODE_CBC, iv)
                    dec = cipher.decrypt(ct)
                    dec = unpad(dec, 8)
                    if _is_likely_plaintext(dec, ascii_min_ratio):
                        ascii_c = sum(1 for b in dec[:1000] if 32 <= b <= 126)
                        results.append((
                            f"DES-CBC ({iv_label}) {key_str[:10]}...",
                            f"OK ({len(dec)} B, {ascii_c} ASCII)", dec[:100]))
                except Exception:
                    pass
        # RC2 - 8-byte block, variable key (legacy)
        for key_str in ["UYDEDKJFH-345FKVG-3EDF", "794521741", "TUBDDEDD502"]:
            for use_iv_prefix, iv_label in [(True, "IV=primeros8B"), (False, "IV=ceros")]:
                try:
                    key = PBKDF2(key_str.encode(), b"swift", dkLen=16, count=1000)
                    if use_iv_prefix and len(sample) >= 16:
                        iv, ct = sample[:8], sample[8:8 + (len(sample) - 8) // 8 * 8]
                    else:
                        iv, ct = b"\x00" * 8, sample[:len(sample) // 8 * 8]
                    if len(ct) < 8:
                        continue
                    cipher = ARC2.new(key, ARC2.MODE_CBC, iv=iv)
                    dec = cipher.decrypt(ct)
                    dec = unpad(dec, 8)
                    if _is_likely_plaintext(dec, ascii_min_ratio):
                        ascii_c = sum(1 for b in dec[:1000] if 32 <= b <= 126)
                        results.append((
                            f"RC2-CBC ({iv_label}) {key_str[:10]}...",
                            f"OK ({len(dec)} B, {ascii_c} ASCII)", dec[:100]))
                except Exception:
                    pass
    except ImportError:
        results.append(("AES/DES/RC2/Rijndael", "pip install pycryptodome", None))

    return results


# Salts y variaciones para derivación de clave (SWIFT, banca, genéricos)
KEY_SALTS = [
    b"swift", b"SWIFT", b"hsbc", b"HSBC", b"DTC", b"dtc", b"DAES",
    b"salt", b"Salted__", b"", b"TUBDDEDD502", b"794521741",
]
# Concatenaciones de claves (passphrase + campo)
KEY_CONCATS = [
    "UYDEDKJFH-345FKVG-3EDF",
    "UYDEDKJFH-345FKVG-3EDF794521741",
    "UYDEDKJFH-345FKVG-3EDFTUBDDEDD502",
    "TUBDDEDD502794521741",
    "DTC500M794521741",
    "794521741",
    "TUBDDEDD502",
    "DAES/DTC",
]


def try_extended_ciphers(data: bytes, sample_len: int = 65536) -> list[tuple[str, str, bytes | None, bool]]:
    """
    Prueba TODOS los cifrados posibles: ChaCha20, Blowfish, RC4, Serpent, Twofish,
    AES (GCM, CTR, ECB, OFB, CFB), más salts, scrypt, concatenaciones.
    Retorna [(nombre, mensaje, preview_bytes, exito_plaintext)].
    """
    sample = data[:sample_len]
    ascii_min = 0.60
    results: list[tuple[str, str, bytes | None, bool]] = []

    try:
        from Crypto.Cipher import AES, ARC2, ChaCha20, DES, DES3  # type: ignore[import-not-found]
        from Crypto.Protocol.KDF import PBKDF2, scrypt  # type: ignore[import-not-found]
        from Crypto.Util.Padding import unpad  # type: ignore[import-not-found]
    except ImportError:
        results.append(("Cifrados extendidos", "pip install pycryptodome", None, False))
        return results

    def _try_aes_mode(cipher_cls, mode_obj, name: str, ct: bytes, key: bytes, iv: bytes | None) -> bytes | None:
        try:
            if iv is not None:
                ciph = cipher_cls.new(key, mode_obj, iv=iv)
            else:
                ciph = cipher_cls.new(key, mode_obj)
            return ciph.decrypt(ct)
        except Exception:
            return None

    # --- AES: ECB, CTR, GCM ---
    for key_str in KEY_CONCATS[:5]:
        for salt in [b"swift", b"", b"DTC"]:
            for klen in [16, 24, 32]:
                if klen == 24:
                    continue  # Rijndael-192 menos común
                try:
                    key = PBKDF2(key_str.encode(), salt, dkLen=klen, count=1000)
                except Exception:
                    continue
                # ECB (sin IV)
                ct = sample[: (len(sample) // 16) * 16]
                if len(ct) >= 16:
                    dec = _try_aes_mode(AES, AES.MODE_ECB, f"AES-{klen*8}-ECB", ct, key, None)
                    if dec and _is_likely_plaintext(dec, ascii_min):
                        results.append((f"AES-{klen*8}-ECB PBKDF2({key_str[:12]}..,salt={salt!r})",
                                        f"OK {len(dec)} B", dec[:80], True))
                # CBC (IV prefijo)
                if len(sample) >= 32:
                    iv, ct = sample[:16], sample[16 : 16 + (len(sample) - 16) // 16 * 16]
                    try:
                        from Crypto.Cipher import AES
                        ciph = AES.new(key, AES.MODE_CBC, iv)
                        dec = unpad(ciph.decrypt(ct), 16)
                        if _is_likely_plaintext(dec, ascii_min):
                            results.append((f"AES-CBC IV=prefijo salt={salt!r}", f"OK {len(dec)} B", dec[:80], True))
                    except Exception:
                        pass
                # CTR (no padding)
                if len(sample) >= 32:
                    nonce = sample[:8]
                    ct = sample[8: min(8 + 4096, len(sample))]
                    try:
                        ciph = AES.new(key, AES.MODE_CTR, nonce=nonce)
                        dec = ciph.decrypt(ct)
                        if _is_likely_plaintext(dec, ascii_min):
                            results.append((f"AES-CTR nonce=prefijo salt={salt!r}", f"OK", dec[:80], True))
                    except Exception:
                        pass
                # OFB, CFB (stream-like, no padding)
                for mode, mode_name in [(AES.MODE_OFB, "OFB"), (AES.MODE_CFB, "CFB")]:
                    if len(sample) >= 32:
                        iv = sample[:16]
                        ct = sample[16: min(16 + 4096, len(sample))]
                        try:
                            ciph = AES.new(key, mode, iv=iv)
                            dec = ciph.decrypt(ct)
                            if _is_likely_plaintext(dec, ascii_min):
                                results.append((f"AES-{mode_name} IV=prefijo", f"OK", dec[:80], True))
                        except Exception:
                            pass
    # GCM (tag al final típicamente)
    for key_str in ["UYDEDKJFH-345FKVG-3EDF", "794521741"]:
        key = PBKDF2(key_str.encode(), b"swift", dkLen=16, count=1000)
        for iv_len in [12, 16]:
            if len(sample) < iv_len + 16 + 16:
                continue
            iv = sample[:iv_len]
            ct = sample[iv_len:-16]
            tag = sample[-16:]
            try:
                ciph = AES.new(key, AES.MODE_GCM, nonce=iv)
                dec = ciph.decrypt_and_verify(ct, tag)
                if _is_likely_plaintext(dec, ascii_min):
                    results.append((f"AES-GCM nonce={iv_len}B tag=final", f"OK {len(dec)} B", dec[:80], True))
            except Exception:
                pass

    # --- ChaCha20 ---
    for key_str in KEY_CONCATS[:4]:
        try:
            key = PBKDF2(key_str.encode(), b"swift", dkLen=32, count=1000)
            nonce = sample[:12]
            ct = sample[12: min(12 + 4096, len(sample))]
            ciph = ChaCha20.new(key=key, nonce=nonce)
            dec = ciph.decrypt(ct)
            if _is_likely_plaintext(dec, ascii_min):
                results.append((f"ChaCha20 nonce=12B {key_str[:12]}..", "OK", dec[:80], True))
        except Exception:
            pass

    # --- Blowfish ---
    for key_str in KEY_CONCATS[:4]:
        try:
            from Crypto.Cipher import Blowfish
            key = PBKDF2(key_str.encode(), b"swift", dkLen=16, count=1000)
            if len(sample) >= 24:
                iv = sample[:8]
                ct = sample[8 : 8 + (len(sample) - 8) // 8 * 8]
                ciph = Blowfish.new(key, Blowfish.MODE_CBC, iv)
                dec = unpad(ciph.decrypt(ct), 8)
                if _is_likely_plaintext(dec, ascii_min):
                    results.append((f"Blowfish-CBC {key_str[:12]}..", f"OK {len(dec)} B", dec[:80], True))
        except ImportError:
            break
        except Exception:
            pass

    # --- RC4 ---
    try:
        from Crypto.Cipher import ARC4  # type: ignore[import-not-found]
        for key_str in KEY_CONCATS[:4]:
            try:
                key = PBKDF2(key_str.encode(), b"swift", dkLen=16, count=1000)
                ct = sample[:4096]
                ciph = ARC4.new(key)
                dec = ciph.decrypt(ct)
                if _is_likely_plaintext(dec, ascii_min):
                    results.append((f"RC4 {key_str[:12]}..", "OK", dec[:80], True))
            except Exception:
                pass
    except ImportError:
        pass

    # --- scrypt (key derivation alternativo) ---
    for key_str in ["UYDEDKJFH-345FKVG-3EDF", "794521741", "TUBDDEDD502"]:
        try:
            key = scrypt(key_str.encode(), b"swift", key_len=32, N=2**14, r=8, p=1)
            iv = sample[:16]
            ct = sample[16 : 16 + (len(sample) - 16) // 16 * 16]
            ciph = AES.new(key[:32], AES.MODE_CBC, iv)
            dec = unpad(ciph.decrypt(ct), 16)
            if _is_likely_plaintext(dec, ascii_min):
                results.append((f"AES-CBC scrypt {key_str[:12]}..", f"OK {len(dec)} B", dec[:80], True))
        except Exception:
            pass

    return results


def try_known_plaintext_xor(data: bytes, known: list[tuple[bytes, int]]) -> list[tuple[str, bytes | None]]:
    """
    Ataque XOR con texto conocido. known = [(plaintext_bytes, offset), ...]
    Si es XOR con clave repetida, podemos derivar key_stream[i] = ct[i] ^ pt[i].
    Retorna posibles claves o fragmentos.
    """
    results: list[tuple[str, bytes | None]] = []
    for pt, offset in known:
        if offset + len(pt) > len(data):
            continue
        ct = data[offset : offset + len(pt)]
        key_fragment = bytes(ct[i] ^ pt[i] for i in range(len(pt)))
        pct_print = 100 * sum(1 for b in key_fragment if 32 <= b <= 126 or b in (9, 10, 13)) / len(key_fragment)
        results.append((f"XOR stream @{offset} (plain={pt!r}) → key_frag {key_fragment!r} ({pct_print:.0f}% printable)",
                       key_fragment))
        # Si el fragmento parece texto, podría ser clave repetida
        if pct_print > 70:
            # Probar como clave repetida en todo el archivo
            dec = xor_repeating_key(data[:20000], key_fragment)
            if _is_likely_plaintext(dec, 0.55):
                results.append((f"XOR repeating key {key_fragment!r} → POSIBLE ÉXITO", dec[:100]))
    return results


def analyze_structure(data: bytes, chunk_size: int = 65536) -> dict[str, Any]:
    """Análisis de estructura: magic bytes, entropía por bloques, formatos conocidos."""
    out: dict[str, Any] = {"magic": [], "block_entropy": [], "formats": []}

    # Magic bytes conocidos
    MAGICS = [
        (b"\x1f\x8b", "gzip"),
        (b"\x78\x9c", "zlib"),
        (b"\x78\xda", "zlib"),
        (b"PK\x03\x04", "ZIP"),
        (b"Rar!\x1a\x07", "RAR"),
        (b"7z\xbc\xaf\x27\x1c", "7-Zip"),
        (b"Salted__", "OpenSSL enc"),
        (b"\x89PNG", "PNG"),
        (b"MT103", "MT103"),
        (b"ISO20022", "ISO20022"),
        (b"BZ", "bzip2"),
        (b"\xfd7zXZ\x00", "xz/lzma"),
    ]
    for magic, name in MAGICS:
        if data[: len(magic)] == magic:
            out["magic"].append((name, 0))
        pos = data.find(magic)
        if pos > 0:
            out["magic"].append((name, pos))

    # Entropía por bloques (primeros 10 bloques)
    for i in range(min(10, len(data) // chunk_size)):
        start = i * chunk_size
        end = min(start + chunk_size, len(data))
        blk = data[start:end]
        if blk:
            out["block_entropy"].append((i, entropy(blk)))
    return out


def try_openssl_7z(data: bytes, sample_len: int = 8192) -> list[tuple[str, str]]:
    """Formato OpenSSL enc (Salted__) y 7z."""
    sample = data[:sample_len]
    results: list[tuple[str, str]] = []

    if len(sample) >= 16 and sample[:8] == b"Salted__":
        salt = sample[8:16]
        results.append(("OpenSSL enc", "Cabecera Salted__ detectada - probar: openssl enc -d -aes-256-cbc -in archivo -out salida"))
        for key_str in KEY_CONCATS[:3]:
            try:
                from Crypto.Protocol.KDF import PBKDF2
                from Crypto.Cipher import AES
                from Crypto.Util.Padding import unpad
                key_iv = PBKDF2(key_str.encode(), salt, dkLen=48, count=10000)
                key, iv = key_iv[:32], key_iv[32:48]
                ct = sample[16:]
                ct = ct[: (len(ct) // 16) * 16]
                if len(ct) >= 16:
                    ciph = AES.new(key, AES.MODE_CBC, iv)
                    dec = unpad(ciph.decrypt(ct), 16)
                    if _is_likely_plaintext(dec, 0.60):
                        results.append((f"OpenSSL AES-256-CBC PBKDF2({key_str[:15]}..)", f"OK {len(dec)} B"))
            except Exception:
                pass
    else:
        results.append(("OpenSSL enc", "No cabecera Salted__ - formato raw o distinto"))

    # 7z (necesita más datos que sample para abrir archivo completo)
    if len(data) >= 6 and data[:6] == b"7z\xbc\xaf\x27\x1c":
        results.append(("7-Zip", "Cabecera 7z detectada - probar: 7z x archivo o py7zr"))
        try:
            import py7zr  # type: ignore[import-not-found]
            with py7zr.SevenZipFile(io.BytesIO(data), "r") as z:
                names = z.getnames()
                results.append(("7-Zip py7zr", f"Contenido: {names[:5]}" if names else "vacío"))
        except ImportError:
            results.append(("7-Zip py7zr", "pip install py7zr"))
        except Exception as e:
            results.append(("7-Zip py7zr", str(e)[:50]))

    return results


def run_binwalk(filepath: str, extract: bool = False) -> tuple[bool, str]:
    """Ejecuta binwalk sobre el archivo. Retorna (éxito, salida)."""
    exe = shutil.which("binwalk")
    if exe:
        cmd_base = [exe]
    else:
        scripts = Path(sys.executable).parent / "Scripts" / "binwalk.exe"
        if scripts.exists():
            cmd_base = [str(scripts)]
        else:
            try:
                import binwalk  # type: ignore[import-not-found]
                cmd_base = [sys.executable, "-m", "binwalk"]
            except (ImportError, Exception):
                return False, "binwalk no en PATH (WSL/apt install binwalk o winget)"
    try:
        cmd = cmd_base + (["-e"] if extract else []) + [filepath]
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60,
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
        )
        out = (result.stdout or "") + (result.stderr or "")
        return result.returncode == 0, out.strip() or f"Exit {result.returncode}"
    except subprocess.TimeoutExpired:
        return False, "Timeout 60s"
    except Exception as e:
        return False, str(e)[:80]


def run_openssl_decrypt(filepath: str, passphrase: str, outpath: str, algo: str = "aes-256-cbc") -> tuple[bool, str]:
    """Intenta openssl enc -d. Retorna (éxito, mensaje)."""
    exe = shutil.which("openssl")
    if not exe:
        return False, "openssl no en PATH (Git incluye openssl; o instalar Win32OpenSSL)"
    try:
        result = subprocess.run(
            [exe, "enc", "-d", f"-{algo}", "-in", filepath, "-out", outpath, "-k", passphrase],
            capture_output=True,
            text=True,
            timeout=30,
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
        )
        if result.returncode == 0:
            return True, f"OK descifrado en {outpath}"
        err = (result.stderr or "").strip()
        return False, err[:100] if err else f"Exit {result.returncode}"
    except Exception as e:
        return False, str(e)[:80]


def _ensure_tools_path() -> None:
    """Añade al PATH (Windows) rutas de Git/OpenSSL, 7-Zip y tools/binary para encontrar herramientas."""
    if sys.platform != "win32":
        return
    script_dir = Path(__file__).resolve().parent
    extra: list[str] = []
    for p in [
        Path(r"C:\Program Files\Git\usr\bin"),
        Path(r"C:\Program Files\7-Zip"),
        Path(r"C:\Program Files (x86)\7-Zip"),
        script_dir / "tools" / "binary" / "hashcat",
        script_dir / "tools" / "binary" / "john-1.9.0-jumbo-1-win64" / "run",
    ]:
        if p.exists():
            extra.append(str(p))
    py_scripts = Path(sys.executable).parent / "Scripts"
    if py_scripts.exists():
        extra.append(str(py_scripts))
    if extra:
        os.environ["PATH"] = os.pathsep.join(extra) + os.pathsep + os.environ.get("PATH", "")


def check_external_tools() -> dict[str, tuple[bool, str]]:
    """Verifica herramientas externas. Retorna {nombre: (instalado, ruta_o_mensaje)}."""
    _ensure_tools_path()
    tools: dict[str, tuple[bool, str]] = {}
    for name, cmd in [
        ("binwalk", "binwalk"),
        ("openssl", "openssl"),
        ("7z", "7z"),
    ]:
        exe = shutil.which(cmd)
        if exe:
            tools[name] = (True, exe)
        else:
            tools[name] = (False, "No en PATH")
    script_dir = Path(__file__).resolve().parent
    for name, exe_path in [
        ("hashcat", script_dir / "tools" / "binary" / "hashcat" / "hashcat.exe"),
        ("john", script_dir / "tools" / "binary" / "john-1.9.0-jumbo-1-win64" / "run" / "john.exe"),
    ]:
        if exe_path.exists():
            tools[name] = (True, str(exe_path))
        else:
            tools[name] = (False, f"No en {exe_path.parent}")
    return tools


def search_patterns_xor(data: bytes, max_keys: int = 20) -> None:
    """Para las claves XOR que más ASCII producen, busca patrones en el descifrado."""
    results = try_xor_keys(data)
    print("\n--- Patrones tras XOR con claves candidatas ---")
    for key, _ in results[:max_keys]:
        sample = data[:min(50000, len(data))]
        dec = xor_single_byte(sample, key)
        found = search_patterns(dec)
        if found:
            print(f"  Key 0x{key:02X} ({key}): {found}")


def main():
    limit = None
    path = None
    do_tools_check = False
    do_binwalk = True
    do_openssl_try = False
    i = 1
    while i < len(sys.argv):
        a = sys.argv[i]
        if a == "--limit" and i + 1 < len(sys.argv):
            limit = int(sys.argv[i + 1])
            i += 2
        elif a.startswith("--limit="):
            limit = int(a.split("=")[1])
            i += 1
        elif a == "--tools-check":
            do_tools_check = True
            i += 1
        elif a == "--no-binwalk":
            do_binwalk = False
            i += 1
        elif a == "--openssl-try":
            do_openssl_try = True
            i += 1
        else:
            path = a
            i += 1

    _ensure_tools_path()

    if do_tools_check:
        tools = check_external_tools()
        print("--- Herramientas externas ---")
        for name, (ok, msg) in tools.items():
            print(f"  {name}: {'OK ' + msg if ok else 'NO - ' + msg}")
        print("\nPip: pycryptodome, binwalk, py7zr, crccheck")
        print("Instalar todo: python scripts/install_binary_tools.py")
        tb = Path(__file__).resolve().parent / "tools" / "binary"
        if tb.exists():
            print(f"Herramientas en: {tb}")
        sys.exit(0)

    if not path:
        print("Uso: python analyze_binary.py <ruta> [--limit N] [--tools-check] [--no-binwalk] [--openssl-try]")
        sys.exit(1)

    # Verificación de integridad (hash, patrones, XOR, entropía)
    verify_errors = _verify_integrity()
    if verify_errors:
        print("ERROR: Verificación interna fallida:")
        for e in verify_errors:
            print(f"  - {e}")
        sys.exit(3)

    print(f"Cargando: {path}" + (f" (primeros {limit} bytes)" if limit else ""))
    print()

    try:
        data, extra_info = get_data(path, limit)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(2)

    print(f"Tamaño: {len(data):,} bytes ({len(data)/1024/1024:.2f} MB)")
    if not data:
        print("  Archivo vacío o sin datos decodificables. Fin.")
        return
    if extra_info and "srecord" in extra_info:
        srec = extra_info["srecord"]
        print("\n--- S-record (S19/S28/S37) detectado y decodificado ---")
        print(f"  Registros S1 (16-bit): {srec.get('s1', 0)} | S2 (24-bit): {srec.get('s2', 0)} | S3 (32-bit): {srec.get('s3', 0)}")
        if srec.get("s0"):
            print(f"  S0 Header: {srec['s0'][0][:60]!r}...")
        for k in ["s7", "s8", "s9"]:
            if srec.get(k):
                print(f"  {k.upper()}: {srec[k]}")
        if srec.get("errors"):
            print(f"  Errores: {srec['errors'][:5]}")
    print()

    # 1. Entropía
    ent = entropy(data)
    print("--- Entropía ---")
    print(f"  {ent:.2f} bits/byte")
    if ent > 7.9:
        print("  → Muy alta: probable cifrado o compresión fuerte")
    elif ent > 7.0:
        print("  → Alta: posible cifrado o compresión")
    elif ent > 5.0:
        print("  → Media: mezcla de datos")
    else:
        print("  → Baja: texto o datos estructurados")
    print()

    # 2. Primeros 64 bytes (hex)
    print("--- Primeros 64 bytes (hex) ---")
    h = data[:64].hex()
    for j in range(0, len(h), 32):
        print(f"  {h[j:j+32]}")
    print()

    # 3. Frecuencia de bytes (top 5)
    freq = Counter(data)
    print("--- Bytes más frecuentes ---")
    for byte_val, cnt in freq.most_common(5):
        pct = 100 * cnt / len(data)
        print(f"  0x{byte_val:02X} ({cnt:,} veces, {pct:.2f}%)")
    print()

    # 4. Tamaño y bloques
    print("--- Estructura ---")
    print(f"  Divisible por 16 (AES): {len(data) % 16 == 0}")
    print(f"  Divisible por 8: {len(data) % 8 == 0}")
    print()

    # 4b. CRC16 - todos los algoritmos
    print("--- CRC16 (todos los algoritmos) ---")
    chunks = [
        ("Completo", data),
        ("Primeros 64 B", data[:64]),
        ("Primeros 256 B", data[:256]),
        ("Primeros 1 KB", data[:1024]),
        ("Primeros 16 B", data[:16]),
    ]
    for chunk_name, chunk in chunks:
        if not chunk:
            continue
        print(f"\n  [{chunk_name}] ({len(chunk)} bytes):")
        for name, poly, init, xor_out, ref_in, ref_out in CRC16_ALGORITHMS:
            crc = crc16_compute(chunk, poly, init, xor_out, ref_in, ref_out)
            short_name = name.split("(")[0].strip().replace("CRC-16/", "")
            print(f"    {short_name:25} = 0x{crc:04X} ({crc})")
    # crccheck adicional si está instalado
    try:
        import crccheck  # type: ignore[import-not-found]
        crc_classes = [
            (n, getattr(crccheck.crc, n))
            for n in dir(crccheck.crc)
            if n.startswith("Crc16") and "Base" not in n
        ]
        if crc_classes:
            print("\n  [crccheck - algoritmos adicionales] (primeros 1 KB):")
            chunk = data[:1024]
            for name, cls in crc_classes[:15]:  # primeros 15
                try:
                    calc = cls()
                    calc.process(chunk)
                    print(f"    {name:30} = 0x{calc.final():04X}")
                except Exception:
                    pass
    except ImportError:
        print("\n  (pip install crccheck para más algoritmos)")
    print()

    # 4c. Métodos típicos servidor bancario (Temenos, SWIFT, ISO 20022)
    print("--- Métodos típicos servidor bancario ---")
    banking_results = try_banking_methods(data)
    for name, msg, out in banking_results:
        if out is not None and len(out) < 500:
            preview = "".join(chr(b) if 32 <= b <= 126 else "." for b in out[:60])
            print(f"  {name:35} → {msg}")
            if preview.strip("."):
                print(f"    Preview: {preview!r}")
        else:
            print(f"  {name:35} → {msg}")
    print()

    # 4d. Base64 y variantes (descifrado)
    print("--- Base64 / Base32 / Base16 / Base85 (variantes) ---")
    for name, out, msg in try_base_decodes(data):
        if out is not None:
            preview = out[:80]
            printable = "".join(chr(b) if 32 <= b <= 126 else "." for b in preview)
            found = search_patterns(out[:50000])
            pat_str = f" | Patrones: {found}" if found else ""
            print(f"  {name:30} → {msg}{pat_str}")
            print(f"    Preview: {printable[:60]!r}")
        else:
            print(f"  {name:30} → {msg}")
    print()

    # 5. Búsqueda de patrones en datos raw (coincidencia exacta de bytes, 100% verificable)
    print("--- Patrones en datos raw ---")
    found_raw = search_patterns(data)
    if found_raw:
        for pat, offs in found_raw.items():
            pat_b = pat.encode("ascii")
            # Verificación: data[offset:offset+len(pat)] == pat
            verified = all(
                data[pos:pos + len(pat_b)] == pat_b
                for pos in offs[:5]
                if pos + len(pat_b) <= len(data)
            )
            check = " ✓" if verified else ""
            print(f"  '{pat}' en offsets: {offs[:5]}...{check}")
        # Contexto alrededor de cada aparición (primeras 3)
        for pat, offs in found_raw.items():
            pat_b = pat.encode("ascii")
            for _, pos in enumerate(offs[:3]):
                ctx_start = max(0, pos - 24)
                ctx_end = min(len(data), pos + len(pat_b) + 24)
                ctx = data[ctx_start:ctx_end]
                printable = "".join(chr(b) if 32 <= b <= 126 else f"\\x{b:02x}" for b in ctx)
                print(f"    [{pat}] offset {pos}: ...{printable}...")
    else:
        print("  No se encontraron patrones conocidos (esperado si está cifrado)")
    print()

    # 6. Strings en raw (secuencias de bytes imprimibles; en datos aleatorios pueden ser casualidad)
    strings_raw = extract_strings(data, 8)
    if strings_raw:
        print("--- Cadenas ASCII en raw (≥8 chars) ---")
        if ent > 7.5:
            print("  (En datos de alta entropía, secuencias pueden ser coincidencia)")
        for s in strings_raw[:15]:
            safe = s.replace("\n", "\\n")[:60]
            print(f"  {safe!r}")
    else:
        print("--- Cadenas ASCII en raw: ninguna ≥8 chars ---")
    print()

    # 7. XOR con clave de 1 byte - candidatos
    print("--- XOR con clave de 1 byte (top 5 por cantidad de ASCII) ---")
    xor_results = try_xor_keys(data)
    for key, count in xor_results[:5]:
        pct = 100 * count / min(10000, len(data))
        print(f"  Key 0x{key:02X} ({key:3d}): {count} bytes ASCII (~{pct:.1f}%)")
        # Mostrar inicio descifrado
        dec = xor_single_byte(data[:80], key)
        try:
            preview = dec.decode("ascii", errors="replace").replace("\n", "\\n")
            printable = "".join(c if 32 <= ord(c) <= 126 else "." for c in preview)
            print(f"    Preview: {printable[:60]!r}")
        except Exception:
            pass
    print()

    # 8. Si alguna clave XOR produce mucho ASCII, buscar patrones
    best_key = xor_results[0][0]
    best_count = xor_results[0][1]
    sample_len = min(10000, len(data))
    threshold = 0.5 * sample_len  # >50% ASCII es sospechoso
    if best_count > threshold:
        print("--- Búsqueda de patrones tras XOR (clave más prometedora) ---")
        dec_full = xor_single_byte(data[:100000], best_key)
        found_xor = search_patterns(dec_full)
        if found_xor:
            print(f"  Key 0x{best_key:02X}: {found_xor}")
        else:
            strings_xor = extract_strings(dec_full, 6)
            if strings_xor:
                print(f"  Key 0x{best_key:02X} - Ejemplos: {strings_xor[:5]}")
    print()

    # 9. XOR con claves del PNG (BIC, cuenta, $CRED$, etc.)
    print("--- XOR con claves del PNG (BIC, cuenta, $CRED$, etc.) ---")
    sample_png = data[:50000]
    results_png = []
    for key_str in PNG_KEYS:
        key_b = key_str.encode("utf-8")
        dec = xor_repeating_key(sample_png, key_b)
        ascii_count = sum(1 for b in dec if 32 <= b <= 126 or b in (9, 10, 13))
        pct = 100 * ascii_count / len(sample_png)
        results_png.append((key_str, ascii_count, pct, dec))
    results_png.sort(key=lambda x: -x[1])
    for key_str, ac, pct, dec in results_png:
        preview = "".join(chr(b) if 32 <= b <= 126 else "." for b in dec[:60])
        mark = " <-- $CRED$" if key_str.startswith("UYDEDKJFH") else ""
        print(f"  {key_str[:40]!r}: {ac} ASCII ({pct:.1f}%){mark}")
        print(f"    Preview: {preview!r}")
    best_key = results_png[0][0]
    print(f"\n  Mejor clave: {best_key!r}")
    dec_full = xor_repeating_key(data[:200000], best_key.encode("utf-8"))
    found_png = search_patterns(dec_full)
    if found_png:
        print(f"  Patrones tras descifrar: {found_png}")
    strings_png = extract_strings(dec_full, 10)
    if strings_png:
        print(f"  Cadenas ≥10 chars: {strings_png[:8]}")
    print()

    # 10. Cifrados extendidos (ChaCha20, Blowfish, RC4, AES-GCM/CTR/ECB, scrypt)
    print("--- Cifrados extendidos (ChaCha20, Blowfish, RC4, AES-GCM/CTR/ECB, scrypt) ---")
    ext_results = try_extended_ciphers(data)
    exito_ext = [r for r in ext_results if r[3]]
    if exito_ext:
        for name, msg, prev, _ in exito_ext[:10]:
            print(f"  ✓ {name}: {msg}")
            if prev:
                p = "".join(chr(b) if 32 <= b <= 126 else "." for b in prev[:50])
                print(f"    Preview: {p!r}")
    else:
        print("  Ningún cifrado extendido descifró correctamente (>60% ASCII)")
        if ext_results and "pip install" in str(ext_results[0]):
            print(f"  {ext_results[0][1]}")
    print()

    # 11. Ataque XOR texto conocido (DTC8, dtc en offsets conocidos)
    print("--- Ataque XOR con texto conocido (DTC8, dtc) ---")
    known_plaintexts: list[tuple[bytes, int]] = []
    for pat, offs in (found_raw or {}).items():
        pat_b = pat.encode("ascii")
        if offs and offs[0] + len(pat_b) <= len(data):
            known_plaintexts.append((pat_b, offs[0]))
    if not known_plaintexts:
        known_plaintexts = [(b"DTC", 0), (b"DTC500", 0)]
    kp_results = try_known_plaintext_xor(data, known_plaintexts)
    for name, frag in kp_results:
        print(f"  {name}")
        if frag:
            p = "".join(chr(b) if 32 <= b <= 126 else f"\\x{b:02x}" for b in frag[:40])
            print(f"    → {p!r}")
    if not kp_results:
        print("  No se pudo aplicar (offsets fuera de rango)")
    print()

    # 12. Análisis de estructura (magic bytes, formatos)
    print("--- Estructura y formatos ---")
    struct_info = analyze_structure(data)
    if struct_info.get("magic"):
        for name, pos in struct_info["magic"]:
            print(f"  Magic: {name} en offset {pos}")
        # Si hay gzip/zlib embebido, intentar extraer
        for name, pos in struct_info["magic"]:
            if name in ("gzip", "zlib") and pos > 0 and pos < len(data) - 32:
                region = data[pos : pos + min(65536, len(data) - pos)]
                for decomp_name, decompress in [
                    ("gzip", lambda d: __import__("gzip").decompress(d)),
                    ("zlib raw", lambda d: zlib.decompress(d, -zlib.MAX_WBITS)),
                    ("zlib", zlib.decompress),
                ]:
                    try:
                        dec = decompress(region)
                        if _is_likely_plaintext(dec, 0.55):
                            print(f"  → Descompresión {decomp_name} @{pos}: OK {len(dec)} B legible")
                            break
                    except Exception:
                        pass
    else:
        print("  No se detectaron magic bytes conocidos")
    if struct_info.get("block_entropy"):
        print("  Entropía por bloques (64KB):")
        for i, ent in struct_info["block_entropy"][:5]:
            print(f"    Bloque {i}: {ent:.2f} bits/byte")
    print()

    # 12b. Binwalk (integrado) o fallback con magic bytes
    if do_binwalk and len(data) >= 64:
        print("--- Binwalk (análisis de firmas) ---")
        p_binary = Path(path)
        is_hexdump = p_binary.suffix.lower() == ".txt"
        need_temp = is_hexdump or (limit and limit < len(data))
        tmp_path: str | None = None
        if need_temp:
            fd, tmp_path = tempfile.mkstemp(suffix=".bin")
            try:
                os.write(fd, data)
            finally:
                os.close(fd)
            use_path = tmp_path
        else:
            use_path = path
        ok, out = False, ""
        try:
            ok, out = run_binwalk(use_path, extract=False)
            if ok and out:
                for line in out.splitlines()[:15]:
                    print(f"  {line}")
                if len(out.splitlines()) > 15:
                    print("  ...")
            else:
                print(f"  {out}")
                if "no en PATH" in out or "no disponible" in out:
                    mag = analyze_structure(data)
                    if mag.get("magic"):
                        print("  (Fallback magic bytes):")
                        for name, pos in mag["magic"][:10]:
                            print(f"    {name} en offset {pos}")
        finally:
            if tmp_path:
                try:
                    Path(tmp_path).unlink(missing_ok=True)
                except Exception:
                    pass
        print()

    # 13. OpenSSL enc / 7z
    print("--- OpenSSL enc / 7-Zip ---")
    for name, msg in try_openssl_7z(data):
        print(f"  {name}: {msg}")
    if do_openssl_try and len(data) >= 48:
        exe_ssl = shutil.which("openssl")
        if exe_ssl:
            fd2, tmp2 = tempfile.mkstemp(suffix=".enc")
            try:
                os.write(fd2, data)
                os.close(fd2)
                out2 = tmp2 + ".dec"
                for pp in KEY_CONCATS[:5]:
                    ok, msg = run_openssl_decrypt(tmp2, pp, out2)
                    if ok:
                        print(f"  → openssl OK con passphrase {pp[:15]}...")
                        try:
                            Path(out2).unlink(missing_ok=True)
                        except Exception:
                            pass
                        break
                    if "bad decrypt" not in msg.lower() and "wrong" not in msg.lower():
                        print(f"  openssl {pp[:12]}..: {msg[:50]}")
            finally:
                try:
                    Path(tmp2).unlink(missing_ok=True)
                except Exception:
                    pass
        else:
            print("  openssl no en PATH para --openssl-try")
    print()

    # 14. Resumen: criterios de legitimidad
    print("--- Criterios de legitimidad ---")
    print("  • Patrones: coincidencia exacta bytes (data.find), verificada con bytes en offset.")
    print("  • Hashes/HMAC: stdlib hashlib/hmac (NIST).")
    print("  • Cifrados OK: solo si unpad exitoso Y >60% printable.")
    print("  • Base64 OK: solo si decode válido Y >60% printable.")
    print("  • zlib/gzip OK: decompress verificado (checksum interno).")
    print("  • Entropía/CRC: fórmulas estándar.")
    print()

    # 15. RECOMENDACIONES: qué hacer según resultados
    print("=" * 70)
    print("--- RECOMENDACIONES: QUÉ HACER PARA CONTINUAR ---")
    print("=" * 70)
    exito_cipher = any(r[3] for r in ext_results) or any(
        out is not None
        and len(out) > 0
        and _is_likely_plaintext(out, 0.55)
        for _, _, out in banking_results
    )
    exito_decompress = any(
        "OK" in msg and "texto" in msg for _, msg, _ in banking_results
    )
    exito_base = any(o is not None and _is_likely_plaintext(o, 0.60) for _, o, _ in try_base_decodes(data[:4096]))
    best_xor_pct = 100 * xor_results[0][1] / min(10000, len(data)) if xor_results else 0
    best_png_pct = results_png[0][2] if results_png else 0

    if exito_cipher or exito_decompress or exito_base:
        print("  1. ALGO DESCIFRÓ CORRECTAMENTE:")
        if exito_cipher:
            print("     → Usar el algoritmo/clave indicado arriba para descifrar el archivo completo.")
            print("     → Script sugerido: decrypt_con_clave.py usando pycryptodome.")
        if exito_decompress:
            print("     → La descompresión (zlib/gzip) funcionó. Guardar salida y analizar contenido.")
        if exito_base:
            print("     → Base64/32 funcionó. Decodificar y guardar el resultado.")
    else:
        print("  2. NINGÚN CIFRADO ESTÁNDAR FUNCIONÓ:")
        print("     • Probar herramientas externas:")
        print("       - John the Ripper: john --format=raw-sha256 archivo (si sospechas hash)")
        print("       - hashcat: hashcat -m 0 hashes.txt wordlist.txt (si tienes hash)")
        print("       - openssl enc -d -aes-256-cbc -in archivo -out salida -k PASSPHRASE")
        print("       - foremost/binwalk: binwalk -e archivo (extraer formatos embebidos)")
        print("     • Si hay patrones en claro (dtc, DTC8): el archivo puede ser parcialmente")
        print("       cifrado o usar un esquema custom. Analizar contexto alrededor de los offsets.")
        print("     • Considerar: cifrado con clave no derivada (raw), cifrado propietario,")
        print("       o compresión con formato custom.")
    print()
    print("  3. HERRAMIENTAS (ejecutar con --tools-check para ver estado):")
    tools_status = check_external_tools()
    hc = tools_status.get("hashcat", (False, ""))
    jn = tools_status.get("john", (False, ""))
    if hc[0]:
        print(f"     • hashcat: {hc[1]}")
    if jn[0]:
        print(f"     • john: {jn[1]}")
    print("     • CyberChef: tools/binary/CyberChef o https://gchq.github.io/CyberChef/")
    print()
    print("  4. SI EL ARCHIVO VIENE DE HSBC/SWIFT:")
    print("     • Verificar documentación del instructivo TUBDDEDD502 / DAES/DTC")
    print("     • Los sistemas bancarios suelen usar AES-256-CBC o 3DES con PBKDF2.")
    print("     • La clave puede estar en el PNG/PDF asociado o en otro canal.")
    if struct_info.get("magic"):
        print("  4b. MAGIC BYTES DETECTADOS:")
        print("     • Si gzip/zlib/bzip2 en offset>0: binwalk -e archivo para extraer embebidos")
        print("     • dd if=archivo bs=1 skip=OFFSET count=N of=region.bin para extraer manual")
    print()
    if best_xor_pct > 45 or best_png_pct > 45:
        print(f"  5. XOR produjo ~{best_xor_pct:.0f}% / PNG keys ~{best_png_pct:.0f}% ASCII:")
        print("     → Posible cifrado XOR con clave larga. Probar variaciones de la clave")
        print("       (rotaciones, concatenaciones) o ataques de texto conocido si tienes un fragmento.")
    print("=" * 70)
    print()

    print("--- Fin del análisis ---")


if __name__ == "__main__":
    main()
