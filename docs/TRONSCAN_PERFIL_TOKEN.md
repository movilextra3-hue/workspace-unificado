# Completar perfil del token en TronScan

Para que el token aparezca en TronScan (y en wallets que usan sus datos) con **logo, descripción, web y redes sociales** — igual que [USDT en mainnet](https://tronscan.org/#/token20/TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t).

**Guía paso a paso “tal cual USDT”:** [PERFIL_IGUAL_QUE_USDT.md](PERFIL_IGUAL_QUE_USDT.md).

---

## 1. Dirección a usar

Siempre usa la **dirección del Proxy** = `tokenAddress` en `deploy-info.json`. Es la dirección pública del token; si usas la de la implementación, el perfil no coincidirá con lo que ven las wallets.

---

## 2. Enlaces por red

| Red    | Crear/editar perfil token |
|--------|----------------------------|
| Mainnet | https://tronscan.org/#/tokens/create/TRC20 |
| Nile   | https://nile.tronscan.org/#/tokens/create/TRC20 |
| Shasta | https://shasta.tronscan.org/#/tokens/create/TRC20 |

Si el token ya existe (contrato desplegado), TronScan puede permitir editar el perfil desde la página del contrato; si no, usa la URL de “create” e introduce la dirección del contrato (Proxy) para asociar el perfil.

---

## 3. Pasos

1. **Conectar wallet:** TronLink (o la que use TronScan) con la cuenta que desplegó o que es owner del token.
2. **Abrir la URL** de la red correspondiente (tabla anterior).
3. **Seleccionar TRC20** si la página lo pide.
4. **Introducir la dirección del contrato:** pegar `tokenAddress` (Proxy) de `deploy-info.json`. Nombre, símbolo y decimales suelen rellenarse solos desde el contrato.
5. **Completar los campos del perfil:**

   | Campo (referencia API) | Descripción | Ejemplo |
   |------------------------|-------------|---------|
   | Logo (imgUrl) | URL de imagen del token (PNG/JPG/WebP) | **Logo principal:** `assets/tether-logo.webp`. Súbelo a tu web o GitHub y pega la URL. Ver [TRONSCAN_DATOS_PEGAR.md](TRONSCAN_DATOS_PEGAR.md) y [assets/README.md](../assets/README.md). |
   | Description | Descripción pública del token | "Token estable vinculado a USD..." |
   | Project website (projectSite) | Web oficial del proyecto | `https://tudominio.com` |
   | Social media | Twitter, Telegram, etc. | Enlaces según ofrezca el formulario |
   | GitHub | Repositorio del proyecto | Opcional |
   | White paper | URL del documento | Opcional |

6. **Enviar / guardar** según la interfaz de TronScan.

---

## 4. Verificación antes del perfil

Para que el token tenga mejor presencia (código público y confianza), **verifica primero los contratos** en TronScan. Ver [VERIFICATION.md](VERIFICATION.md). El perfil (logo, descripción, web) es independiente pero suele completarse después de verificar.

---

## 5. Alineación con USDT en mainnet (referencia exacta)

**Página de referencia:** https://tronscan.org/#/token20/TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t

En mainnet, USDT en TronScan tiene:

- **name:** Tether USD  
- **abbr (símbolo):** USDT  
- **decimal:** 6  
- **icon_url:** logo (URL)  
- **token_desc:** "USDT is the official stablecoin issued by Tether on the TRON network."  
- **home_page:** https://tether.to/  
- **social_media_list:** Twitter, etc.  
- **priceInUsd:** ~1 (viene de Tronscan/agregadores, no del perfil)

Para que el tuyo **se vea tal cual**: mismo **nombre, símbolo y decimales** en el despliegue (`.env`) y en el perfil de Tronscan **logo (URL), descripción y web**. Ver [PERFIL_IGUAL_QUE_USDT.md](PERFIL_IGUAL_QUE_USDT.md).

---

## 6. Resumen

- **Dirección:** siempre `tokenAddress` (Proxy) de `deploy-info.json`.  
- **Dónde:** tronscan.org (o nile/shasta) → tokens/create/TRC20.  
- **Qué completar:** logo (URL), descripción, web, redes sociales si aplica.  
- **Orden recomendado:** verificar contratos ([VERIFICATION.md](VERIFICATION.md)) → luego completar perfil.

Con esto el token queda alineado con el nivel de información que tiene USDT en mainnet (perfil completo en TronScan).
