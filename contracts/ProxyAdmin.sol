// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

/**
 * @title ProxyAdmin
 * @author TRC20Token
 * @notice Administra upgrades del proxy. Solo el owner puede actualizar la implementación.
 * @dev Administra upgrades del proxy. Solo el owner puede actualizar.
 */
contract ProxyAdmin {
    error NotOwner();
    error ZeroAddress();
    error UpgradeFailed();
    error CallFailed();
    error SameAsCurrentOwner();
    error NoPendingTransfer();
    error NotPendingOwner();
    error NewOwnerZero();
    error ReentrantCall();

    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _reentrancyStatus = _NOT_ENTERED;

    /// @notice Propietario del ProxyAdmin (puede hacer upgrade y callProxy).
    address public owner;
    /// @notice Dirección que puede aceptar la propiedad (transfer en dos pasos).
    address public pendingOwner;

    /// @notice Emitido al transferir la propiedad.
    /// @param previousOwner Owner anterior.
    /// @param newOwner Nuevo owner.
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    /// @notice Emitido al proponer nuevo owner.
    /// @param currentOwner Owner actual.
    /// @param proposedOwner Dirección propuesta como nuevo owner.
    event OwnershipProposed(address indexed currentOwner, address indexed proposedOwner);

    /// @notice Emitido cuando el proxy se actualiza a una nueva implementación.
    /// @param proxy Dirección del proxy.
    /// @param implementation Nueva implementación.
    event Upgraded(address indexed proxy, address indexed implementation);

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /// @notice Restringe la llamada al owner del ProxyAdmin.
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier nonReentrant() {
        if (_reentrancyStatus == _ENTERED) revert ReentrantCall();
        _reentrancyStatus = _ENTERED;
        _;
        _reentrancyStatus = _NOT_ENTERED;
    }

    /**
     * @notice Propone un nuevo owner (paso 1). Recomendado sobre transferOwnership.
     * @param newOwner Dirección propuesta como nuevo owner.
     */
    function proposeOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert NewOwnerZero();
        if (newOwner == owner) revert SameAsCurrentOwner();
        pendingOwner = newOwner;
        emit OwnershipProposed(owner, newOwner);
    }

    /**
     * @notice Acepta la propiedad (paso 2). Solo puede llamar el pendingOwner.
     */
    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        emit OwnershipTransferred(owner, msg.sender);
        owner = msg.sender;
        pendingOwner = address(0);
    }

    /**
     * @notice Cancela la propuesta de transferencia pendiente.
     */
    function cancelOwnershipTransfer() external onlyOwner {
        if (pendingOwner == address(0)) revert NoPendingTransfer();
        pendingOwner = address(0);
    }

    /**
     * @notice Transfiere la propiedad en un solo paso. Preferir proposeOwnership + acceptOwnership.
     * @param newOwner Nueva dirección owner.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
        if (pendingOwner != address(0)) pendingOwner = address(0);
    }

    /**
     * @notice Actualiza el proxy a una nueva implementación. La dirección del token (proxy) NO cambia.
     * @param proxyAddress Dirección del proxy (token).
     * @param newImplementation Dirección de la nueva implementación.
     */
    function upgrade(address proxyAddress, address newImplementation) external onlyOwner nonReentrant {
        if (proxyAddress == address(0) || newImplementation == address(0)) revert ZeroAddress();
        /* solhint-disable avoid-low-level-calls */
        (bool success, ) = proxyAddress.call(
            abi.encodeWithSignature("upgradeTo(address)", newImplementation)
        );
        /* solhint-enable avoid-low-level-calls */
        if (!success) revert UpgradeFailed();
        emit Upgraded(proxyAddress, newImplementation);
    }

    /**
     * @notice Ejecuta una llamada en el proxy (ej. initializeV2).
     * @param proxyAddress Dirección del proxy.
     * @param data Datos codificados de la llamada.
     * @return result Resultado de la llamada.
     */
    function callProxy(address proxyAddress, bytes calldata data) external onlyOwner nonReentrant returns (bytes memory) {
        /* solhint-disable avoid-low-level-calls */
        (bool success, bytes memory result) = proxyAddress.call(data);
        /* solhint-enable avoid-low-level-calls */
        if (!success) revert CallFailed();
        return result;
    }
}
