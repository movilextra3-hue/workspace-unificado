# Genera PDF del informe HTML sin headers/footers
$html = "E:\workspace-unificado\docs\vitacora\INFORME_ZIP_EMISION_300M_COMPLETO.html"
$pdf = "E:\workspace-unificado\docs\vitacora\INFORME_ZIP_EMISION_300M_COMPLETO.pdf"

# Edge en Windows - flags para quitar header y footer
$edgePath = (Get-Command msedge -ErrorAction SilentlyContinue).Source
if (-not $edgePath) {
    $edgePath = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
}
if (-not (Test-Path $edgePath)) {
    $edgePath = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
}

$htmlUri = [System.Uri]::new($html).AbsoluteUri
$args = @(
    "--headless",
    "--disable-gpu",
    "--print-to-pdf=`"$pdf`"",
    "--no-pdf-header-footer",
    "--no-margins",
    "`"$htmlUri`""
)

Start-Process -FilePath $edgePath -ArgumentList $args -Wait -NoNewWindow
if (Test-Path $pdf) { Write-Host "PDF generado: $pdf" } else { Write-Host "Error al generar PDF" }
