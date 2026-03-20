# Script para deshabilitar la indexación en Cursor
Write-Host "Deshabilitando indexación en Cursor..." -ForegroundColor Yellow

# Ruta de configuración de Cursor
$cursorSettingsPath = Join-Path $env:APPDATA "Cursor\User\settings.json"

# Crear directorio si no existe
$settingsDir = Split-Path $cursorSettingsPath -Parent
if (-not (Test-Path $settingsDir)) {
    New-Item -ItemType Directory -Path $settingsDir -Force | Out-Null
}

# Configuración para deshabilitar indexación
$indexingSettings = @{
    "files.watcherExclude" = @{
        "**/.git/objects/**" = $true
        "**/.git/subtree-cache/**" = $true
        "**/node_modules/**" = $true
        "**/build/**" = $true
        "**/dist/**" = $true
        "**/.next/**" = $true
        "**/__pycache__/**" = $true
        "**/.cache/**" = $true
        "**/Cache/**" = $true
        "**/System Volume Information/**" = $true
        "**/`$RECYCLE.BIN/**" = $true
    }
    "search.exclude" = @{
        "**/node_modules" = $true
        "**/build" = $true
        "**/dist" = $true
        "**/.git" = $true
        "**/__pycache__" = $true
        "**/.cache" = $true
        "**/Cache" = $true
        "**/System Volume Information" = $true
        "**/`$RECYCLE.BIN" = $true
    }
    "typescript.disableAutomaticTypeAcquisition" = $true
    "typescript.tsserver.maxTsServerMemory" = 2048
    "typescript.preferences.includePackageJsonAutoImports" = "off"
    "files.maxMemoryForLargeFilesMB" = 4096
    "files.exclude" = @{
        "**/.git" = $true
        "**/.DS_Store" = $true
        "**/Thumbs.db" = $true
        "**/node_modules" = $true
        "**/build" = $true
        "**/dist" = $true
        "**/__pycache__" = $true
        "**/.cache" = $true
        "**/Cache" = $true
    }
    "files.watcherInclude" = @()
    "cursor.indexing.enabled" = $false
    "cursor.indexing.maxFileSize" = 0
    "editor.codeActionsOnSave" = @{}
    "editor.formatOnSave" = $false
    "extensions.autoUpdate" = $false
    "extensions.autoCheckUpdates" = $false
}

# Leer configuración existente si existe
$existingSettings = @{}
if (Test-Path $cursorSettingsPath) {
    try {
        $existingContent = Get-Content $cursorSettingsPath -Raw -ErrorAction SilentlyContinue
        if ($existingContent) {
            $existingSettings = $existingContent | ConvertFrom-Json -AsHashtable -ErrorAction SilentlyContinue
            if ($null -eq $existingSettings) {
                $existingSettings = @{}
            }
        }
    } catch {
        Write-Host "Advertencia: No se pudo leer la configuración existente. Creando nueva configuración." -ForegroundColor Yellow
        $existingSettings = @{}
    }
}

# Fusionar configuraciones
foreach ($key in $indexingSettings.Keys) {
    $existingSettings[$key] = $indexingSettings[$key]
}

# Convertir a JSON y guardar
try {
    $jsonContent = $existingSettings | ConvertTo-Json -Depth 10
    $jsonContent | Set-Content $cursorSettingsPath -Encoding UTF8
    Write-Host "`n✓ Configuración de indexación deshabilitada exitosamente" -ForegroundColor Green
    Write-Host "  Archivo: $cursorSettingsPath" -ForegroundColor Gray
    Write-Host "`nNota: Reinicia Cursor para que los cambios surtan efecto." -ForegroundColor Yellow
} catch {
    Write-Host "`n✗ Error al guardar la configuración: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`nConfiguración aplicada:" -ForegroundColor Cyan
Write-Host "  - Indexación de archivos: DESHABILITADA" -ForegroundColor Gray
Write-Host "  - Seguimiento de cambios: DESHABILITADO para carpetas grandes" -ForegroundColor Gray
Write-Host "  - Búsqueda en node_modules: EXCLUIDA" -ForegroundColor Gray
Write-Host "  - Adquisición automática de tipos TypeScript: DESHABILITADA" -ForegroundColor Gray
