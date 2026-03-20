$filePath = $args[0]
$bytes = [System.IO.File]::ReadAllBytes($filePath)
Write-Host "Tamaño del archivo: $($bytes.Length) bytes"

$nonZeroCount = 0
$firstNonZero = -1
for ($i = 0; $i -lt $bytes.Length; $i++) {
    if ($bytes[$i] -ne 0) {
        $nonZeroCount++
        if ($firstNonZero -eq -1) {
            $firstNonZero = $i
        }
    }
}

Write-Host "Bytes no nulos: $nonZeroCount"
if ($firstNonZero -ge 0) {
    Write-Host "Primer byte no nulo en posición: $firstNonZero"
    Write-Host "Primeros 100 bytes no nulos (hex):"
    $endIndex = [Math]::Min($firstNonZero + 100, $bytes.Length - 1)
    ($bytes[$firstNonZero..$endIndex] | ForEach-Object { '{0:X2}' -f $_ }) -join ' '
} else {
    Write-Host "Archivo completamente vacío (solo bytes nulos)"
}
