# Logo: requisitos para mainnet (Tronscan)

Resumen de lo que **mainnet y Tronscan** requieren para el logo del token y cómo queda este proyecto.

---

## Qué pide Tronscan en mainnet

- **Requisito publicado:** Tronscan **solo exige una URL** del logo. No subes archivo; pegas la URL en el perfil del token.
- **Formato y tamaño:** Tronscan **no publica** requisitos oficiales de formato (PNG/WebP/JPG) ni de dimensiones en píxeles.
- **Referencia USDT:** En la API, el logo de USDT en mainnet es una URL a PNG en su CDN:  
  `https://static.tronscan.org/production/logo/usdtlogo.png`  
  Eso indica que ellos usan PNG en su CDN; no implica que rechacen otras URLs (p. ej. WebP).

Conclusión: **cumplir mainnet = tener una URL pública y estable del logo**. No hay especificación oficial de tamaño ni formato.

---

## Qué tiene este proyecto

| Aspecto | Valor | ¿Válido para mainnet? |
|--------|--------|------------------------|
| **Archivo** | `assets/tether-logo.webp` | ✅ |
| **Formato** | WebP | ✅ (Tronscan pide URL; no exige formato concreto) |
| **Tamaño** | ~78 KB | ✅ (sin límite publicado) |
| **Uso** | Subir a tu web o GitHub y pegar esa URL en Tronscan | ✅ |

El **formato, tamaño y uso** están **tal cual se necesitan** para mainnet: Tronscan solo requiere que pegues una URL del logo; el archivo actual es adecuado.

---

## Compatibilidad extra (opcional)

- **Otras plataformas** (p. ej. Trust Wallet) suelen pedir **256×256 px PNG**. Si además quieres listar el token ahí, conviene tener una versión PNG de ese tamaño.
- **Si Tronscan no mostrara bien la URL en WebP** (poco frecuente), sube una versión PNG de la misma imagen y pega esa URL.

Para **solo Tronscan mainnet**, el logo actual (`tether-logo.webp` en una URL pública) cumple lo que requieren.

---

## Comprobado con navegador (Tronscan)

Verificado con las herramientas del navegador en Tronscan:

| Comprobación | Resultado |
|--------------|-----------|
| Página USDT mainnet | https://tronscan.org/#/token20/TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t — carga correctamente (título: Tether USD (USDT)). |
| Página "Record Token" TRC20 | https://tronscan.org/#/tokens/create/TRC20 — carga; formulario para registrar token (contract address, logo, etc.). |
| URL del logo USDT (CDN Tronscan) | https://static.tronscan.org/production/logo/usdtlogo.png — responde; imagen PNG 100×100. |
