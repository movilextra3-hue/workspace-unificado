#!/usr/bin/env python3
"""
Descompila bytecode con Panoramix usando la API de Python.
Evita límites de línea de comandos en Windows.
"""
import sys
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(script_dir)
out_dir = os.path.join(root, 'verification', 'TXaXTSUK-verification')
bytecode_path = os.path.join(out_dir, 'bytecode.hex')
output_path = os.path.join(out_dir, 'TRC20TokenUpgradeable-decompiled.pyr')

def main():
    if not os.path.exists(bytecode_path):
        print('Falta bytecode.hex', file=sys.stderr)
        sys.exit(1)

    with open(bytecode_path, 'r') as f:
        hex_data = f.read().strip()
    bytecode = '0x' + hex_data

    import subprocess
    try:
        # subprocess evita límites de cmd en Windows; Python pasa argv directamente
        r = subprocess.run(
            [sys.executable, '-m', 'panoramix', bytecode],
            capture_output=True,
            text=True,
            timeout=120,
            cwd=out_dir
        )
        result = (r.stdout or '') + (r.stderr or '')
        if r.returncode == 0 and result.strip():
            # Quitar códigos ANSI
            result = result.replace('\x1b[', '\x1b[')  # preserve for strip
            for code in ['\x1b[38;5;8m', '\x1b[0m', '\x1b[91m']:
                result = result.replace(code, '')
            import re
            result = re.sub(r'\x1b\[[0-9;]*m', '', result)
            with open(output_path, 'w') as f:
                f.write(result)
            print(result[:4000])
            if len(result) > 4000:
                print('\n...[truncado]')
            print('\nGuardado:', output_path)
        else:
            print('Panoramix:', result[:500] if result else 'sin salida')
            if r.returncode != 0:
                sys.exit(1)
    except Exception as e:
        print('Error:', e, file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
