# Cambios para corregir avisos Wake en MonarcaQuantumTokenDiamond.sol

El archivo `E:\MonarcaQuantumTokenDiamond.sol` no pudo modificarse desde este workspace (permiso denegado). Aplica estos cambios manualmente en ese archivo.

---

## 1. Línea 428 – Variable local no usada (2072)

**Antes:**
```solidity
        DiamondStorage storage ds = diamondStorage();

        for (uint256 facetIndex; facetIndex < _diamondCut.length; facetIndex++) {
```

**Después:**
```solidity
        DiamondStorage storage _ds = diamondStorage();
        _ds; // uso explícito para silenciar aviso (diamondStorage necesario para selector)

        for (uint256 facetIndex; facetIndex < _diamondCut.length; facetIndex++) {
```

(O bien eliminar la variable y dejar solo `diamondStorage();` si el compilador lo acepta.)

---

## 2. Línea 649 – Parámetro no usado (5667)

**Antes:**
```solidity
    function applyFees(
        AppStorage storage s,
        address _from,
        uint256 _amount
    ) internal returns (uint256 finalAmount, uint256 burnAmount, uint256 treasuryAmount) {
```

**Después:**
```solidity
    function applyFees(
        AppStorage storage s,
        address /* _from */,
        uint256 _amount
    ) internal returns (uint256 finalAmount, uint256 burnAmount, uint256 treasuryAmount) {
```

---

## 3. Línea 1045 – Variable local no usada (2072)

**Antes:**
```solidity
        (uint256 finalAmount, uint256 burnAmount, uint256 treasuryAmount) = LibFees.applyFees(s, _from, _amount);
```

**Después:**
```solidity
        (uint256 finalAmount, uint256 burnAmount, ) = LibFees.applyFees(s, _from, _amount);
```

---

## 4. Líneas 1837–1839 – Mutabilidad restringible a pure (2018)

**Antes:**
```solidity
    function countVotesOptimized(uint256 /* _proposalId */, uint256[] calldata _rawVotes) 
        external 
        view 
        returns (uint256 forVotes, uint256 againstVotes)
```

**Después:**
```solidity
    function countVotesOptimized(uint256 /* _proposalId */, uint256[] calldata _rawVotes)
        external
        pure
        returns (uint256 forVotes, uint256 againstVotes)
```

(La función solo usa `_rawVotes` en calldata y no lee estado, por lo que puede ser `pure`.)

---

## Nota sobre node_modules (Lock.sol)

Los avisos Wake 9207 en `ethereum-api-quickstart/tenderly_tools/node_modules/.../Lock.sol` son de dependencias de Hardhat. No conviene editar `node_modules`. Opciones: ignorar el aviso en el IDE o excluir esa ruta en la configuración del linter.
