// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title MiToken
/// @author Workspace
/// @notice Token ERC-20 desde cero. Compatible con Ethereum, BSC, Polygon, Tron (TRC-20).
contract MiToken {
    /// @notice Nombre del token
    string public name;
    /// @notice Símbolo del token
    string public symbol;
    /// @notice Decimales
    uint8 public decimals;
    /// @notice Supply total
    uint256 public totalSupply;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    error TransferFromZero();
    error TransferToZero();
    error InsufficientBalance();
    error ApproveFromZero();
    error ApproveToZero();
    error InsufficientAllowance();

    /// @notice Emitido al transferir tokens
    /// @param from Dirección origen
    /// @param to Dirección destino
    /// @param value Cantidad transferida
    event Transfer(address indexed from, address indexed to, uint256 value);
    /// @notice Emitido al aprobar allowance
    /// @param owner Propietario de los tokens
    /// @param spender Dirección autorizada a gastar
    /// @param value Cantidad aprobada
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /// @notice Inicializa el token con nombre, símbolo, decimales y supply
    /// @param _name Nombre del token
    /// @param _symbol Símbolo del token
    /// @param _decimals Número de decimales
    /// @param _initialSupply Supply inicial (en unidades enteras, se multiplica por 10^decimals)
    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _initialSupply
    ) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        totalSupply = _initialSupply * 10 ** _decimals;
        _balances[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    /// @notice Devuelve el balance de una cuenta
    /// @param account Dirección a consultar
    /// @return Balance en unidades mínimas
    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    /// @notice Transfiere tokens al destinatario
    /// @param to Dirección receptora
    /// @param amount Cantidad a transferir
    /// @return true si la transferencia fue exitosa
    function transfer(address to, uint256 amount) public returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    /// @notice Devuelve el allowance aprobado
    /// @param owner Propietario de los tokens
    /// @param spender Dirección autorizada
    /// @return Cantidad aprobada restante
    function allowance(address owner, address spender) public view returns (uint256) {
        return _allowances[owner][spender];
    }

    /// @notice Aprueba un spender para gastar tokens
    /// @param spender Dirección autorizada a gastar
    /// @param amount Cantidad aprobada
    /// @return true si la aprobación fue exitosa
    function approve(address spender, uint256 amount) public returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    /// @notice Transfiere desde una dirección usando allowance
    /// @param from Dirección origen
    /// @param to Dirección destino
    /// @param amount Cantidad a transferir
    /// @return true si la transferencia fue exitosa
    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        _spendAllowance(from, msg.sender, amount);
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) private {
        if (from == address(0)) revert TransferFromZero();
        if (to == address(0)) revert TransferToZero();
        if (_balances[from] < amount) revert InsufficientBalance();
        unchecked {
            _balances[from] -= amount;
            _balances[to] += amount;
        }
        emit Transfer(from, to, amount);
    }

    function _approve(address owner, address spender, uint256 amount) private {
        if (owner == address(0)) revert ApproveFromZero();
        if (spender == address(0)) revert ApproveToZero();
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    /// @notice Consume allowance; revierte si insuficiente
    /// @param owner Propietario de los tokens
    /// @param spender Dirección que gasta
    /// @param amount Cantidad a gastar
    function _spendAllowance(address owner, address spender, uint256 amount) private {
        uint256 current = _allowances[owner][spender];
        if (current < amount) revert InsufficientAllowance();
        unchecked {
            _allowances[owner][spender] = current - amount;
        }
    }
}
