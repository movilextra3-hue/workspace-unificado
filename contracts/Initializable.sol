// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

/**
 * @title Initializable
 * @author TRC20Token
 * @dev Base para contratos upgradeables. Evita que initialize se llame más de una vez.
 * @notice Usar modifier initializer() en initialize().
 */
abstract contract Initializable {
    error AlreadyInitialized();
    error Initializing();

    uint8 private _initialized;
    bool private _initializing;

    /// @notice Modifier para funciones de inicialización; solo permite una ejecución.
    modifier initializer() {
        if (!(_initializing ? _isConstructor() : _initialized == 0)) revert AlreadyInitialized();
        bool isTopLevelCall = !_initializing;
        if (isTopLevelCall) {
            _initializing = true;
            _initialized = 1;
        }
        _;
        if (isTopLevelCall) {
            _initializing = false;
        }
    }

    /// @notice Modifier para re-inicializaciones en upgrades (ej. initializeV2). version debe ser > 1.
    /// @param version Número de versión de la inicialización (2, 3, ...).
    modifier reinitializer(uint8 version) {
        if (!_initializing && _initialized >= version) revert AlreadyInitialized();
        _initialized = version;
        bool isTopLevelCall = !_initializing;
        if (isTopLevelCall) _initializing = true;
        _;
        if (isTopLevelCall) _initializing = false;
    }

    /// @dev Comprueba si el contexto es el constructor (código no desplegado aún).
    function _isConstructor() private view returns (bool) {
        return address(this).code.length == 0;
    }

    /// @dev Deshabilita inicializadores (llamar desde constructor de la implementación).
    function _disableInitializers() internal virtual {
        if (_initializing) revert Initializing();
        _initialized = 255;
    }
}
