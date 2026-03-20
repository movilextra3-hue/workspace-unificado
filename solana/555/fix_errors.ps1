# Script para corregir errores en archivos .sol
$jsonContent = Get-Content "C:\Users\Administrador\Desktop\rev.txt" -Raw -Encoding UTF8
$errors = $jsonContent | ConvertFrom-Json

# Agrupar errores por archivo
$fileErrors = @{}
foreach ($err in $errors) {
    if ($err.resource) {
        $file = $err.resource
        if (-not $fileErrors.ContainsKey($file)) {
            $fileErrors[$file] = @()
        }
        $fileErrors[$file] += $err
    }
}

Write-Host "Total archivos con errores: $($fileErrors.Count)"

# Procesar cada archivo
$fixed = 0
$notFound = 0
$skipped = 0

foreach ($file in $fileErrors.Keys) {
    # Convertir ruta de D: a formato Windows si es necesario
    $filePath = $file -replace '^/D:', 'D:'
    
    if (Test-Path $filePath) {
        try {
            # Leer archivo como bytes para detectar BOM
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            
            # Buscar el primer byte no nulo (prioridad 1: eliminar bytes nulos)
            $firstNonZero = -1
            for ($i = 0; $i -lt $bytes.Length; $i++) {
                if ($bytes[$i] -ne 0) {
                    $firstNonZero = $i
                    break
                }
            }
            
            # Si el archivo está completamente lleno de bytes nulos, saltarlo
            if ($firstNonZero -eq -1) {
                Write-Host "Advertencia: $filePath está completamente vacío (solo bytes nulos)"
                $skipped++
                continue
            }
            
            # Si hay bytes nulos al inicio, eliminarlos
            if ($firstNonZero -gt 0) {
                $newBytes = $bytes[$firstNonZero..($bytes.Length - 1)]
                [System.IO.File]::WriteAllBytes($filePath, $newBytes)
                Write-Host "Corregido: $filePath (eliminados $firstNonZero bytes nulos al inicio)"
                $fixed++
                continue
            }
            
            # Verificar si tiene BOM UTF-8 (EF BB BF) - prioridad 2
            $hasBOM = ($bytes.Length -ge 3) -and ($bytes[0] -eq 0xEF) -and ($bytes[1] -eq 0xBB) -and ($bytes[2] -eq 0xBF)
            
            if ($hasBOM) {
                $newBytes = $bytes[3..($bytes.Length - 1)]
                [System.IO.File]::WriteAllBytes($filePath, $newBytes)
                Write-Host "Corregido: $filePath (eliminado BOM UTF-8)"
                $fixed++
                continue
            }
            
            # Verificar si tiene otros caracteres problemáticos al inicio - prioridad 3
            $needsFix = $false
            $startIndex = 0
            
            if ($bytes.Length -gt 0) {
                $firstByte = $bytes[0]
                # Los caracteres válidos para inicio de archivo Solidity son: letras, números, espacios, tabs, pragma, import, etc.
                # Si no es ASCII imprimible o es un carácter especial problemático, necesita corrección
                if ($firstByte -lt 32 -and $firstByte -ne 9 -and $firstByte -ne 10 -and $firstByte -ne 13) {
                    $needsFix = $true
                    # Buscar el primer carácter imprimible
                    for ($i = 0; $i -lt [Math]::Min($bytes.Length, 1000); $i++) {
                        if ($bytes[$i] -ge 32 -or $bytes[$i] -eq 9 -or $bytes[$i] -eq 10 -or $bytes[$i] -eq 13) {
                            $startIndex = $i
                            break
                        }
                    }
                }
            }
            
            if ($needsFix -and $startIndex -gt 0) {
                $newBytes = $bytes[$startIndex..($bytes.Length - 1)]
                [System.IO.File]::WriteAllBytes($filePath, $newBytes)
                Write-Host "Corregido: $filePath (eliminados $startIndex bytes problemáticos al inicio)"
                $fixed++
            } else {
                $skipped++
            }
        } catch {
            Write-Host "Error procesando $filePath : $_"
        }
    } else {
        Write-Host "No encontrado: $filePath"
        $notFound++
    }
}

Write-Host "`nResumen:"
Write-Host "  Corregidos: $fixed"
Write-Host "  No encontrados: $notFound"
Write-Host "  Sin cambios: $skipped"
