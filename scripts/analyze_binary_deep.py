#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Análisis PROFUNDO del binario decmap/dtc500m.
Ejecuta TODAS las variaciones posibles basadas en investigación web:
- TUBDDEDD502 = HSBC Trinkaus Frankfurt
- DAES/DTC = Documentary Trade Credit, SWIFT MT700
- Cifrado SWIFT: AES-256, PBKDF2
- Extracción en offsets de magic bytes (8602, 29971, 23992, 45277)
- PBKDF2 con 1000, 10000, 50000 iteraciones
- Todos los salts (KEY_SALTS)
- Clave = primeros bytes del archivo
- Descifrado desde offset 1341098 (donde aparece "dtc" en claro)
"""

import gzip
import os
import sys
import zlib
from pathlib import Path

# Añadir raíz al path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from analyze_binary import (
    KEY_CONCATS,
    KEY_SALTS,
    PNG_KEYS,
    get_data,
    xor_repeating_key,
    xor_single_byte,
    _is_likely_plaintext,
)
from analyze_binary import entropy


def extract_and_decompress(data: bytes, offsets: list[tuple[int, str]]) -> list[tuple[str, int, str]]:
    """Extrae regiones en offsets y prueba descompresión."""
    results = []
    out_dir = ROOT / "tools" / "binary" / "extracted"
    out_dir.mkdir(parents=True, exist_ok=True)
    for offset, fmt in offsets:
        if offset + 32 > len(data):
            results.append((fmt, offset, "offset fuera de rango"))
            continue
        region = data[offset : offset + min(262144, len(data) - offset)]
        ok = False
        for name, decompress in [
            ("gzip", lambda d: gzip.decompress(d)),
            ("zlib raw", lambda d: zlib.decompress(d, -zlib.MAX_WBITS)),
            ("zlib", zlib.decompress),
            ("bzip2", lambda d: __import__("bz2").decompress(d)),
        ]:
            try:
                dec = decompress(region)
                legible = sum(1 for b in dec[:500] if 32 <= b <= 126) / min(500, len(dec)) > 0.6
                results.append((name, offset, f"OK {len(dec)} B legible={legible}"))
                if legible:
                    out_file = out_dir / f"offset_{offset}_{name}.bin"
                    with open(out_file, "wb") as f:
                        f.write(dec)
                    results.append((name, offset, f"Guardado en {out_file.name}"))
                ok = True
                break
            except Exception:
                pass
        if not ok:
            results.append((fmt, offset, "no se pudo descomprimir"))
    return results


def try_all_pbkdf_iterations(data: bytes, sample_len: int = 32768) -> list[tuple[str, bool]]:
    """Prueba PBKDF2 con 1000, 10000, 50000, 100000 iteraciones y todos los salts."""
    results = []
    try:
        from Crypto.Cipher import AES
        from Crypto.Protocol.KDF import PBKDF2
        from Crypto.Util.Padding import unpad
    except ImportError:
        return [("pycryptodome no instalado", False)]

    sample = data[:sample_len]
    for key_str in KEY_CONCATS[:6]:
        for salt in KEY_SALTS[:8]:
            for count in [1000, 10000, 50000, 100000]:
                try:
                    key = PBKDF2(key_str.encode(), salt, dkLen=32, count=count)
                    if len(sample) >= 48:
                        iv, ct = sample[:16], sample[16 : 16 + (len(sample) - 16) // 16 * 16]
                        ciph = AES.new(key, AES.MODE_CBC, iv)
                        dec = unpad(ciph.decrypt(ct), 16)
                        if _is_likely_plaintext(dec, 0.55):
                            results.append((f"AES-CBC PBKDF2 iter={count} salt={salt!r} key={key_str[:15]}", True))
                except Exception:
                    pass
    return results


def try_raw_key_from_file(data: bytes, sample_len: int = 8192) -> list[tuple[str, bool]]:
    """Prueba clave = primeros 16/24/32 bytes del archivo (sin PBKDF2)."""
    results = []
    try:
        from Crypto.Cipher import AES
        from Crypto.Util.Padding import unpad
    except ImportError:
        return []

    for klen in [16, 24, 32]:
        if len(data) < klen + 32:
            continue
        key = data[:klen]
        iv = data[klen : klen + 16]
        ct = data[klen + 16 : klen + 16 + (min(sample_len, len(data) - klen - 16) // 16) * 16]
        if len(ct) < 16:
            continue
        try:
            ciph = AES.new(key, AES.MODE_CBC, iv)
            dec = unpad(ciph.decrypt(ct), 16)
            if _is_likely_plaintext(dec, 0.55):
                results.append((f"AES-CBC key=primeros{klen}B iv=bytes{klen}-{klen+16}", True))
        except Exception:
            pass
    return results


def try_decrypt_from_offset(data: bytes, offset: int = 1341098, chunk: int = 4096) -> list[tuple[str, bool]]:
    """Prueba descifrado empezando desde offset (donde está 'dtc' en claro)."""
    results = []
    if offset + chunk > len(data):
        return results
    try:
        from Crypto.Cipher import AES
        from Crypto.Protocol.KDF import PBKDF2
        from Crypto.Util.Padding import unpad
    except ImportError:
        return []

    region = data[offset : offset + chunk]
    # Quizás el header está antes; probar IV = 16 bytes antes de dtc
    for iv_start in [0, -16, -32]:
        iv_offset = max(0, offset + iv_start)
        if iv_offset + 32 > len(data):
            continue
        iv = data[iv_offset : iv_offset + 16]
        ct = region[: (len(region) // 16) * 16]
        if len(ct) < 16:
            continue
        for key_str in KEY_CONCATS[:5]:
            for salt in [b"swift", b"dtc", b"DTC"]:
                try:
                    key = PBKDF2(key_str.encode(), salt, dkLen=32, count=10000)
                    ciph = AES.new(key, AES.MODE_CBC, iv)
                    dec = unpad(ciph.decrypt(ct), 16)
                    if _is_likely_plaintext(dec, 0.55):
                        results.append((f"Desde offset {offset} IV@ {iv_start}", True))
                except Exception:
                    pass
    return results


def try_xor_variations(data: bytes, sample_len: int = 50000) -> list[tuple[str, float]]:
    """XOR con más variaciones: clave desde fragmentos, longitud variable."""
    results = []
    sample = data[:sample_len]
    keys_to_try = list(PNG_KEYS) + list(KEY_CONCATS)
    # Añadir variaciones
    for k in list(keys_to_try):
        keys_to_try.extend([k.upper(), k.lower(), k.replace("-", ""), k.replace("/", "")])
    seen = set()
    for key_str in keys_to_try:
        if key_str in seen:
            continue
        seen.add(key_str)
        dec = xor_repeating_key(sample, key_str.encode("utf-8"))
        pct = 100 * sum(1 for b in dec if 32 <= b <= 126 or b in (9, 10, 13)) / len(sample)
        results.append((key_str[:40], pct))
    return sorted(results, key=lambda x: -x[1])[:15]


def try_sha256_key(data: bytes, sample_len: int = 8192) -> list[tuple[str, bool]]:
    """Algunos sistemas usan key = SHA256(passphrase)."""
    results = []
    try:
        import hashlib
        from Crypto.Cipher import AES
        from Crypto.Util.Padding import unpad
    except ImportError:
        return []

    sample = data[:sample_len]
    for key_str in KEY_CONCATS[:6]:
        key = hashlib.sha256(key_str.encode()).digest()
        if len(sample) >= 48:
            iv, ct = sample[:16], sample[16 : 16 + (len(sample) - 16) // 16 * 16]
            try:
                ciph = AES.new(key, AES.MODE_CBC, iv)
                dec = unpad(ciph.decrypt(ct), 16)
                if _is_likely_plaintext(dec, 0.55):
                    results.append((f"AES-CBC key=SHA256({key_str[:15]}..)", True))
            except Exception:
                pass
    return results


def write_hashes_for_cracking(data: bytes, out_dir: Path) -> None:
    """Escribe hashes para VirusTotal y verificación."""
    import hashlib
    out_dir.mkdir(parents=True, exist_ok=True)
    sha = hashlib.sha256(data).hexdigest()
    md5 = hashlib.md5(data).hexdigest()
    with open(out_dir / "hashes.txt", "w") as f:
        f.write(f"SHA-256: {sha}\n")
        f.write(f"MD5:     {md5}\n")
    with open(out_dir / "info.txt", "w") as f:
        f.write("Hashes del archivo (primeros 2MB). Usar para:\n")
        f.write("- VirusTotal: buscar SHA-256 para ver si el archivo está en su base de datos\n")
        f.write("- Verificación de integridad\n")


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else r"E:\Binary Viewer\decmap.txt"
    limit = 2_000_000  # 2 MB para capturar offset 1341098

    print("=== ANÁLISIS PROFUNDO ===\n")
    print(f"Archivo: {path}")
    print(f"Límite: {limit:,} bytes\n")

    data, _ = get_data(path, limit)
    if not data:
        print("Sin datos")
        return

    print(f"Tamaño cargado: {len(data):,} bytes")
    print(f"Entropía: {entropy(data):.2f}\n")

    # 1. Extracción en offsets mágicos
    print("--- 1. Extracción en offsets mágicos ---")
    magic_offsets = [(8602, "gzip"), (29971, "zlib"), (23992, "bzip2"), (45277, "zlib")]
    for name, off, status in extract_and_decompress(data, magic_offsets):
        print(f"  {name} @{off}: {status}")

    # 2. PBKDF2 todas iteraciones y salts
    print("\n--- 2. PBKDF2 (1000, 10k, 50k, 100k it) + todos los salts ---")
    pbkdf = try_all_pbkdf_iterations(data)
    ok = [r for r in pbkdf if r[1]]
    if ok:
        for name, _ in ok[:5]:
            print(f"  ✓ {name}")
    else:
        print("  Ningún acierto")

    # 3. Clave = primeros bytes
    print("\n--- 3. Clave = primeros 16/24/32 bytes (raw) ---")
    raw = try_raw_key_from_file(data)
    if raw:
        for name, _ in raw:
            print(f"  ✓ {name}")
    else:
        print("  Ningún acierto")

    # 4. Descifrado desde offset 1341098
    print("\n--- 4. Descifrado desde offset 1341098 (dtc) ---")
    off_dec = try_decrypt_from_offset(data)
    if off_dec:
        for name, _ in off_dec:
            print(f"  ✓ {name}")
    else:
        print("  Ningún acierto")

    # 5. XOR variaciones (top 15)
    print("\n--- 5. XOR variaciones (top 15 por % ASCII) ---")
    xor_res = try_xor_variations(data)
    for key, pct in xor_res:
        print(f"  {key!r}: {pct:.1f}%")

    # 6. Key = SHA256(passphrase)
    print("\n--- 6. Key = SHA256(passphrase) ---")
    sha_keys = try_sha256_key(data)
    if sha_keys:
        for name, _ in sha_keys:
            print(f"  ✓ {name}")
    else:
        print("  Ningún acierto")

    # 7. Guardar hashes para hashcat/john
    out_dir = ROOT / "tools" / "binary" / "extracted"
    write_hashes_for_cracking(data, out_dir)
    print(f"\n--- 7. Hashes guardados en {out_dir} ---")
    print("  hashes.txt, info.txt (para VirusTotal)")

    print("\n=== Fin análisis profundo ===")


if __name__ == "__main__":
    main()
