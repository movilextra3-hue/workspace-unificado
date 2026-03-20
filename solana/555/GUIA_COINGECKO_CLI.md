# 🦎 COINGECKO CLI - GUÍA RÁPIDA

## 📋 COMANDOS DISPONIBLES

### 🔍 Búsqueda
```powershell
.\coingecko_cli.ps1 search bitcoin
.\coingecko_cli.ps1 search ethereum
.\coingecko_cli.ps1 search "bitcoin mexicano"
```

### 💰 Precios
```powershell
.\coingecko_cli.ps1 price bitcoin
.\coingecko_cli.ps1 price ethereum
.\coingecko_cli.ps1 price solana
```

### 📊 Información Completa
```powershell
.\coingecko_cli.ps1 info bitcoin
.\coingecko_cli.ps1 info ethereum
```

### 📈 Datos de Mercado
```powershell
.\coingecko_cli.ps1 market bitcoin
.\coingecko_cli.ps1 market ethereum
```

### 🔥 Tokens en Tendencia
```powershell
.\coingecko_cli.ps1 trending
```

### 🌍 Estadísticas Globales
```powershell
.\coingecko_cli.ps1 global
```

### ⚖️ Comparar Tokens
```powershell
.\coingecko_cli.ps1 compare bitcoin ethereum
.\coingecko_cli.ps1 compare solana cardano
```

### 🏗️ Plataformas
```powershell
.\coingecko_cli.ps1 platforms
```

### 📋 Listar por Plataforma
```powershell
.\coingecko_cli.ps1 list binance-smart-chain
.\coingecko_cli.ps1 list ethereum
.\coingecko_cli.ps1 list solana
```

---

## 🎯 EJEMPLOS PRÁCTICOS

### Buscar tus tokens
```powershell
# Buscar BitcoinMexicano
.\coingecko_cli.ps1 search "bitcoin mexicano"

# Buscar Qrypta
.\coingecko_cli.ps1 search qrypta
```

### Verificar si están listados
```powershell
# Si encuentras el ID, verifica el precio
.\coingecko_cli.ps1 price bitcoin-mexicano
.\coingecko_cli.ps1 price qrypta-quantum-token
```

### Comparar con tokens similares
```powershell
# Comparar con Bitcoin
.\coingecko_cli.ps1 compare bitcoin bitcoin-mexicano
```

### Ver tokens en BSC
```powershell
.\coingecko_cli.ps1 list binance-smart-chain
```

---

## 📝 NOTAS

- **IDs de tokens:** Usa el ID exacto de CoinGecko (ej: `bitcoin`, `ethereum`, `solana`)
- **Búsqueda:** Puede buscar por nombre o símbolo
- **Límites:** La API gratuita tiene límites de rate (50 llamadas/minuto)
- **Sin API Key:** Este script usa la API pública gratuita

---

## 🚀 USO RÁPIDO

```powershell
# Ver ayuda
.\coingecko_cli.ps1 help

# Ver tendencias
.\coingecko_cli.ps1 trending

# Ver mercado global
.\coingecko_cli.ps1 global

# Buscar y ver precio
.\coingecko_cli.ps1 search bitcoin
.\coingecko_cli.ps1 price bitcoin
```

---

## 🔗 RECURSOS

- **API CoinGecko:** https://www.coingecko.com/en/api
- **Documentación:** https://www.coingecko.com/en/api/documentation
- **Listado de tokens:** https://www.coingecko.com/en/coins/new
