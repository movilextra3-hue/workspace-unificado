// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

/**
 * @title TransparentUpgradeableProxy
 * @author TRC20Token
 * @notice Proxy EIP1967: la dirección del PROXY es la dirección del token (permanente).
 * @dev Las actualizaciones cambian solo la implementación; balances y estado se conservan.
 */
contract TransparentUpgradeableProxy {
    error InitFailed();
    error NotAdmin();
    error NoImplementation();
    error ImplementationZero();
    error ImplementationNotContract();
    error AdminZero();

    bytes32 private constant _IMPLEMENTATION_SLOT = bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);
    bytes32 private constant _ADMIN_SLOT = bytes32(uint256(keccak256("eip1967.proxy.admin")) - 1);

    /**
     * @notice Crea el proxy con la implementación inicial y el admin.
     * @param _logic Dirección de la implementación (lógica del token).
     * @param admin_ Dirección del admin (ProxyAdmin) que podrá hacer upgrade.
     * @param _data Datos para llamada inicial a la implementación (ej. initialize). Use 0x si se inicializa después.
     */
    constructor(address _logic, address admin_, bytes memory _data) payable {
        if (_logic == address(0)) revert ImplementationZero();
        if (_logic.code.length == 0) revert ImplementationNotContract();
        if (admin_ == address(0)) revert AdminZero();
        _setAdmin(admin_);
        _setImplementation(_logic);
        if (_data.length > 0) {
            /* solhint-disable avoid-low-level-calls */
            (bool success, ) = _logic.delegatecall(_data);
            /* solhint-enable avoid-low-level-calls */
            if (!success) revert InitFailed();
        }
    }

    /// @notice Fallback: reenvía todas las llamadas a la implementación actual.
    fallback() external payable {
        _fallback();
    }

    /// @notice Receive: acepta TRX y reenvía a la implementación.
    receive() external payable {
        _fallback();
    }

    /**
     * @notice Actualiza la implementación. Solo el admin puede llamar.
     * @param newImplementation Dirección de la nueva implementación.
     */
    function upgradeTo(address newImplementation) external {
        if (msg.sender != _admin()) revert NotAdmin();
        if (newImplementation == address(0)) revert ImplementationZero();
        if (newImplementation.code.length == 0) revert ImplementationNotContract();
        _setImplementation(newImplementation);
    }

    /// @dev Delega la llamada actual a la implementación.
    function _fallback() internal {
        address impl = _implementation();
        if (impl == address(0)) revert NoImplementation();
        /* solhint-disable no-inline-assembly */
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
        /* solhint-enable no-inline-assembly */
    }

    /// @dev Devuelve la dirección de la implementación (slot EIP-1967).
    function _implementation() internal view returns (address impl) {
        bytes32 slot = _IMPLEMENTATION_SLOT;
        /* solhint-disable no-inline-assembly */
        assembly { impl := sload(slot) }
        /* solhint-enable no-inline-assembly */
    }

    /// @dev Escribe la nueva implementación en el slot.
    function _setImplementation(address newImplementation) private {
        bytes32 slot = _IMPLEMENTATION_SLOT;
        /* solhint-disable no-inline-assembly */
        assembly { sstore(slot, newImplementation) }
        /* solhint-enable no-inline-assembly */
    }

    /// @dev Devuelve la dirección del admin del proxy.
    function _admin() internal view returns (address adm) {
        bytes32 slot = _ADMIN_SLOT;
        /* solhint-disable no-inline-assembly */
        assembly { adm := sload(slot) }
        /* solhint-enable no-inline-assembly */
    }

    /// @dev Fija el admin del proxy (solo en constructor).
    function _setAdmin(address newAdmin) private {
        bytes32 slot = _ADMIN_SLOT;
        /* solhint-disable no-inline-assembly */
        assembly { sstore(slot, newAdmin) }
        /* solhint-enable no-inline-assembly */
    }

    /**
     * @notice Devuelve la dirección de la implementación actual del token.
     * @return Dirección del contrato de implementación (TRC20TokenUpgradeable).
     */
    function implementation() external view returns (address) {
        return _implementation();
    }

    /**
     * @notice Devuelve la dirección del admin del proxy.
     * @return Dirección del ProxyAdmin.
     */
    function admin() external view returns (address) {
        return _admin();
    }
}
