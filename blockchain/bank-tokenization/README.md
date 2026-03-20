# Bank tokenization — bUSDT on Ethereum mainnet

Tokenización bancaria: bUSDT respaldado 1:1 por USDT en bUSDT-Vault. Mint/redeem solo mediante instrucciones firmadas por el Oracle (oficial bancario autorizado).

- **bUSDT**: ERC-20 + EIP-2612 (permit) + Mintable/Burnable, proxy UUPS.
- **bUSDT-Vault**: custodia USDT; `execute(Instruction)` solo acepta firmas del Oracle (EIP-712).
- **Oracle**: verifica SWIFT gpi (ACCC), firma `Instruction` y la envía al Vault.

Documentación consolidada y registro de despliegues: `docs/vitacora/CONSOLIDACION_COMPLETA_TODO.md`.

## Uso rápido

```bash
npm i
cp .env.example .env   # o config/.env; rellenar PRIVATE_KEY, OPS_SAFE, TECH_SAFE, ORACLE, TREASURY
npm run build
npm run deploy:busdt   # exportar BUSDT_ADDR
npm run deploy:vault  # exportar VAULT_ADDR
npm run grant         # otorgar MINTER_ROLE al Vault
npm run reconciliation  # comprobar 1:1
```

## Esquema JSON para el adaptador SWIFT

Ver procedimiento completo y esquema del evento en la vitácora (sección Bank Tokenization).
