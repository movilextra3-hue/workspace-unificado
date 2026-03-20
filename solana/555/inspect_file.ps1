$filePath = $args[0]
$bytes = [System.IO.File]::ReadAllBytes($filePath)
$text = [System.Text.Encoding]::UTF8.GetString($bytes[0..[Math]::Min(200, $bytes.Length-1)])

Write-Host "Primeros 200 caracteres:"
Write-Host $text
Write-Host "`nPrimeros 30 bytes (hex):"
($bytes[0..29] | ForEach-Object { '{0:X2}' -f $_ }) -join ' '
Write-Host "`nPrimeros 30 bytes (decimal):"
($bytes[0..29] | ForEach-Object { $_.ToString() }) -join ', '
