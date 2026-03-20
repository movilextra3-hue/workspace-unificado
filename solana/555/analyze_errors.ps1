$content = Get-Content "C:\Users\Administrador\Desktop\rev.txt" -Raw
$json = $content | ConvertFrom-Json

$errorTypes = @{}
foreach ($err in $json) {
    $code = if ($err.code -is [string]) { $err.code } else { $err.code.value }
    if (-not $errorTypes.ContainsKey($code)) {
        $errorTypes[$code] = @{
            Count = 0
            Message = $err.message
            Examples = @()
        }
    }
    $errorTypes[$code].Count++
    if ($errorTypes[$code].Examples.Count -lt 3) {
        $errorTypes[$code].Examples += $err.resource
    }
}

Write-Host "Tipos de errores encontrados:`n"
$errorTypes.GetEnumerator() | Sort-Object { $_.Value.Count } -Descending | ForEach-Object {
    Write-Host "Código: $($_.Key)"
    Write-Host "  Cantidad: $($_.Value.Count)"
    Write-Host "  Mensaje: $($_.Value.Message)"
    Write-Host "  Ejemplos:"
    foreach ($ex in $_.Value.Examples) {
        Write-Host "    - $ex"
    }
    Write-Host ""
}
