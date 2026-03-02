// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import { Initializable } from "./Initializable.sol";

/**
 * @title TRC20TokenUpgradeable
 * @author TRC20Token
 * @notice Token TRC-20 upgradeable con pausa, freeze, blacklist y EIP-2612 permit.
 * @dev Usar initialize() en lugar de constructor.
 */
contract TRC20TokenUpgradeable is Initializable {
    error CallerNotOwner();
    error TokenPaused();
    error ErrAddressFrozen();
    error ErrAddressBlacklisted();
    error OwnerZero();
    error AllowanceBelowZero();
    error NewOwnerZero();
    error SameAsCurrentOwner();
    error NotPendingOwner();
    error NoPendingTransfer();
    error AlreadyPaused();
    error NotPaused();
    error MintToZero();
    error MintToContract();
    error ForceBurnFromZero();
    error FreezeZeroAddress();
    error AlreadyFrozen();
    error NotFrozen();
    error BlacklistZeroAddress();
    error AlreadyBlacklisted();
    error NotBlacklisted();
    error AddressNotBlacklisted();
    error PermitExpired();
    error InvalidPermit();
    error RecoverToZero();
    error NoTokensToRecover();
    error RecoverTRXToZero();
    error NoTRXToRecover();
    error TransferTRXFailed();
    error DecimalsTooHigh();
    error CapBelowTotalSupply();
    error CannotFreezeOwner();
    error CannotBlacklistOwner();
    error TransferFromZero();
    error TransferToZero();
    error TransferToContract();
    error InsufficientBalance();
    error ApproveFromZero();
    error ApproveToZeroAddress();
    error InsufficientAllowance();
    error BurnFromZero();
    error BurnExceedsBalance();
    error ReentrantCall();
    error MintExceedsCap();
    error RecoverTokenToZero();
    error RecoverTokenSelf();
    error RecoverTokenFailed();
    error BatchEmpty();
    /// @notice Nombre del token.
    string public name;
    /// @notice Símbolo del token (ej. USDT).
    string public symbol;
    /// @notice Número de decimales.
    uint8 public decimals;
    /// @notice Supply total en unidades mínimas.
    uint256 public totalSupply;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    /// @notice Propietario del contrato (admin).
    address public owner;
    /// @notice Dirección que puede aceptar la propiedad (transfer en 2 pasos).
    address public pendingOwner;
    /// @notice Si está pausado (bloquea transfer/approve).
    bool public paused;

    /// @notice Direcciones congeladas (no pueden transferir ni recibir).
    mapping(address => bool) public frozen;
    /// @notice Direcciones en lista negra.
    mapping(address => bool) public blacklisted;

    /// @notice Nonce por cuenta para EIP-2612 permit (approve por firma sin gas).
    mapping(address => uint256) public nonces;

    /// @notice EIP-712 typehash para Permit.
    bytes32 public constant PERMIT_TYPEHASH =
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"); // solhint-disable-line gas-small-strings
    /// @notice EIP-712 typehash del dominio.
    bytes32 public constant EIP712_DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"); // solhint-disable-line gas-small-strings

    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    /// @dev Estado para ReentrancyGuard. 1 = no entrado, 2 = entrado.
    uint256 private _reentrancyStatus;
    /// @notice Supply máximo (unidades mínimas). type(uint256).max = sin límite.
    uint256 public cap;
    /// @notice Versión de la implementación (1 = inicial, 2+ tras initializeV2).
    uint256 public version;
    /// @dev Reserva de slots para futuras versiones (storage gap).
    uint256[47] private __gap;

    /// @notice Emitido al transferir tokens.
    /// @param from Origen.
    /// @param to Destino.
    /// @param value Cantidad.
    event Transfer(address indexed from, address indexed to, uint256 value); // solhint-disable-line gas-indexed-events
    /// @notice Emitido al aprobar allowance.
    /// @param owner Propietario.
    /// @param spender Gastador.
    /// @param value Cantidad aprobada.
    event Approval(address indexed owner, address indexed spender, uint256 value); // solhint-disable-line gas-indexed-events
    /// @notice Emitido al cambiar el owner.
    /// @param previousOwner Owner anterior.
    /// @param newOwner Nuevo owner.
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    /// @notice Emitido al pausar el contrato.
    event Pause();
    /// @notice Emitido al reanudar el contrato.
    event Unpause();
    /// @notice Emitido al acuñar tokens.
    /// @param to Destinatario.
    /// @param amount Cantidad.
    event Mint(address indexed to, uint256 amount); // solhint-disable-line gas-indexed-events
    /// @notice Emitido al quemar tokens.
    /// @param from Origen.
    /// @param amount Cantidad.
    event Burn(address indexed from, uint256 amount); // solhint-disable-line gas-indexed-events
    /// @notice Emitido al congelar una dirección.
    /// @param addr Dirección congelada.
    event AddressFrozen(address indexed addr);
    /// @notice Emitido al descongelar una dirección.
    /// @param addr Dirección.
    event AddressUnfrozen(address indexed addr);
    /// @notice Emitido al añadir a la lista negra.
    /// @param addr Dirección.
    event BlacklistAdded(address indexed addr);
    /// @notice Emitido al quitar de la lista negra.
    /// @param addr Dirección.
    event BlacklistRemoved(address indexed addr);
    /// @notice Emitido al destruir fondos de una dirección blacklisted.
    /// @param addr Dirección.
    /// @param amount Cantidad quemada.
    event BlackFundsDestroyed(address indexed addr, uint256 amount); // solhint-disable-line gas-indexed-events
    /// @notice Emitido al proponer nuevo owner.
    /// @param previousOwner Owner actual.
    /// @param proposedOwner Propuesto.
    event OwnershipProposed(address indexed previousOwner, address indexed proposedOwner);
    /// @notice Emitido en forceBurn (incautación).
    /// @param from Origen.
    /// @param amount Cantidad.
    event ForceBurn(address indexed from, uint256 amount); // solhint-disable-line gas-indexed-events
    /// @notice Emitido al recuperar tokens del contrato.
    /// @param to Destinatario.
    /// @param amount Cantidad.
    event TokensRecovered(address indexed to, uint256 amount); // solhint-disable-line gas-indexed-events
    /// @notice Emitido al recuperar TRX enviados por error al contrato.
    /// @param to Destinatario.
    /// @param amount Cantidad en sun.
    event TRXRecovered(address indexed to, uint256 amount);
    /// @notice Emitido al recuperar otro TRC20 enviado por error al contrato.
    /// @param token Dirección del token recuperado.
    /// @param to Destinatario.
    /// @param amount Cantidad.
    event ExternalTokenRecovered(address indexed token, address indexed to, uint256 amount);
    /// @notice Emitido cuando el owner actualiza el cap de supply.
    /// @param newCap Nuevo cap.
    event CapUpdated(uint256 newCap);

    /// @notice Restringe la llamada al owner del contrato.
    modifier onlyOwner() {
        if (msg.sender != owner) revert CallerNotOwner();
        _;
    }

    /// @notice Exige que el contrato no esté pausado.
    modifier whenNotPaused() {
        if (paused) revert TokenPaused();
        _;
    }

    /// @notice Exige que la dirección no esté congelada.
    /// @param addr Dirección a comprobar.
    modifier whenNotFrozen(address addr) {
        if (frozen[addr]) revert ErrAddressFrozen();
        _;
    }

    /// @notice Exige que la dirección no esté en lista negra.
    /// @param addr Dirección a comprobar.
    modifier whenNotBlacklisted(address addr) {
        if (blacklisted[addr]) revert ErrAddressBlacklisted();
        _;
    }

    /// @notice Impide llamadas reentrantes.
    modifier nonReentrant() {
        if (_reentrancyStatus == _ENTERED) revert ReentrantCall();
        _reentrancyStatus = _ENTERED;
        _;
        _reentrancyStatus = _NOT_ENTERED;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Inicializa el token (reemplaza constructor en patrón upgradeable).
     * @param _name Nombre del token
     * @param _symbol Símbolo (ej. USDT)
     * @param _decimals Decimales (típicamente 18)
     * @param _initialSupply Supply inicial en unidades (se multiplica por 10^decimals)
     * @param _owner Dirección del owner inicial
     */
    function initialize(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _initialSupply,
        address _owner
    ) public initializer {
        if (_owner == address(0)) revert OwnerZero();
        if (_decimals > 77) revert DecimalsTooHigh(); // 10**78 overflow en uint256
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        owner = _owner;
        totalSupply = _initialSupply * 10 ** _decimals;
        _balances[_owner] = totalSupply;
        _reentrancyStatus = _NOT_ENTERED;
        cap = type(uint256).max;
        version = 1;
        emit Transfer(address(0), _owner, totalSupply);
    }

    /**
     * @notice Re-inicialización para upgrades (v2+). Fija cap y versión sin cambiar supply ni balances.
     * @param _version Versión a asignar (ej. 2).
     * @param _cap Nuevo supply máximo en unidades mínimas; use type(uint256).max para ilimitado.
     */
    function initializeV2(uint256 _version, uint256 _cap) public reinitializer(2) {
        if (_cap < totalSupply) revert CapBelowTotalSupply();
        version = _version;
        cap = _cap;
    }

    /**
     * @notice Devuelve el balance de una cuenta.
     * @param account Dirección a consultar.
     * @return Balance en unidades mínimas.
     */
    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    /**
     * @notice Transfiere tokens a una dirección.
     * @param to Destinatario.
     * @param amount Cantidad en unidades mínimas.
     * @return true si la transferencia fue exitosa.
     */
    function transfer(address to, uint256 amount) public whenNotPaused whenNotFrozen(msg.sender) whenNotFrozen(to) whenNotBlacklisted(msg.sender) whenNotBlacklisted(to) returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    /**
     * @notice Devuelve el allowance restante de owner para spender.
     * @param ownerAddr Propietario de los tokens.
     * @param spender Dirección autorizada.
     * @return Cantidad restante aprobada.
     */
    function allowance(address ownerAddr, address spender) public view returns (uint256) {
        return _allowances[ownerAddr][spender];
    }

    /**
     * @notice Aprueba a spender para gastar hasta amount tokens.
     * @param spender Dirección autorizada.
     * @param amount Cantidad máxima aprobada.
     * @return true si la aprobación fue exitosa.
     */
    function approve(address spender, uint256 amount) public whenNotPaused whenNotFrozen(msg.sender) whenNotBlacklisted(msg.sender) returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    /**
     * @notice Transfiere tokens desde from a to usando allowance.
     * @param from Origen de los tokens.
     * @param to Destinatario.
     * @param amount Cantidad a transferir.
     * @return true si la transferencia fue exitosa.
     */
    function transferFrom(address from, address to, uint256 amount) public whenNotPaused whenNotFrozen(from) whenNotFrozen(to) whenNotBlacklisted(from) whenNotBlacklisted(to) returns (bool) {
        _spendAllowance(from, msg.sender, amount);
        _transfer(from, to, amount);
        return true;
    }

    /**
     * @notice Aumenta el allowance en addedValue.
     * @param spender Dirección autorizada.
     * @param addedValue Cantidad a añadir al allowance.
     * @return true si fue exitoso.
     */
    function increaseAllowance(address spender, uint256 addedValue) public whenNotPaused whenNotFrozen(msg.sender) whenNotBlacklisted(msg.sender) returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender] + addedValue);
        return true;
    }

    /**
     * @notice Disminuye el allowance en subtractedValue.
     * @param spender Dirección autorizada.
     * @param subtractedValue Cantidad a restar.
     * @return true si fue exitoso (revierte si resta más del allowance actual).
     */
    function decreaseAllowance(address spender, uint256 subtractedValue) public whenNotPaused whenNotFrozen(msg.sender) whenNotBlacklisted(msg.sender) returns (bool) {
        uint256 current = _allowances[msg.sender][spender];
        if (current < subtractedValue) revert AllowanceBelowZero();
        unchecked {
            _approve(msg.sender, spender, current - subtractedValue);
        }
        return true;
    }

    /**
     * @notice Propone un nuevo owner (paso 1 de transferencia en dos pasos).
     * @param newOwner Dirección propuesta como nuevo owner.
     */
    function proposeOwnership(address newOwner) public onlyOwner {
        if (newOwner == address(0)) revert NewOwnerZero();
        if (newOwner == owner) revert SameAsCurrentOwner();
        pendingOwner = newOwner;
        emit OwnershipProposed(owner, newOwner);
    }

    /**
     * @notice Acepta la propiedad (paso 2). Solo puede llamar el pendingOwner.
     */
    function acceptOwnership() public {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        emit OwnershipTransferred(owner, msg.sender);
        owner = msg.sender;
        pendingOwner = address(0);
    }

    /**
     * @notice Cancela una propuesta de transferencia pendiente.
     */
    function cancelOwnershipTransfer() public onlyOwner {
        if (pendingOwner == address(0)) revert NoPendingTransfer();
        pendingOwner = address(0);
    }

    /**
     * @notice Pausa todas las transferencias y aprobaciones.
     */
    function pause() public onlyOwner {
        if (paused) revert AlreadyPaused();
        paused = true;
        emit Pause();
    }

    /**
     * @notice Reanuda las transferencias.
     */
    function unpause() public onlyOwner {
        if (!paused) revert NotPaused();
        paused = false;
        emit Unpause();
    }

    /**
     * @notice Crea nuevos tokens y los asigna a to. Respeta el cap de supply.
     * @param to Destinatario.
     * @param amount Cantidad en unidades mínimas.
     */
    function mint(address to, uint256 amount) public onlyOwner whenNotBlacklisted(to) nonReentrant {
        if (to == address(0)) revert MintToZero();
        if (to == address(this)) revert MintToContract();
        if (totalSupply + amount > cap) revert MintExceedsCap();
        totalSupply += amount;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
        emit Mint(to, amount);
    }

    /**
     * @notice Quema tokens del caller.
     * @param amount Cantidad a quemar.
     */
    function burn(uint256 amount) public whenNotPaused whenNotFrozen(msg.sender) whenNotBlacklisted(msg.sender) {
        _burn(msg.sender, amount);
    }

    /**
     * @notice Quema tokens de account usando allowance al owner.
     * @param account Cuenta de la que se queman tokens.
     * @param amount Cantidad a quemar.
     */
    function burnFrom(address account, uint256 amount) public onlyOwner {
        _spendAllowance(account, msg.sender, amount);
        _burn(account, amount);
    }

    /**
     * @notice Quema tokens de cualquier dirección sin allowance.
     * @param account Cuenta afectada.
     * @param amount Cantidad a quemar.
     */
    function forceBurn(address account, uint256 amount) public onlyOwner {
        if (account == address(0)) revert ForceBurnFromZero();
        _burn(account, amount);
        emit ForceBurn(account, amount);
    }

    /**
     * @notice Congela una dirección (no puede transferir ni recibir).
     * @param addr Dirección a congelar.
     */
    function freezeAddress(address addr) public onlyOwner {
        if (addr == address(0)) revert FreezeZeroAddress();
        if (addr == owner) revert CannotFreezeOwner();
        if (frozen[addr]) revert AlreadyFrozen();
        frozen[addr] = true;
        emit AddressFrozen(addr);
    }

    /**
     * @notice Descongela una dirección.
     * @param addr Dirección a descongelar.
     */
    function unfreezeAddress(address addr) public onlyOwner {
        if (!frozen[addr]) revert NotFrozen();
        frozen[addr] = false;
        emit AddressUnfrozen(addr);
    }

    /**
     * @notice Añade una dirección a la lista negra.
     * @param addr Dirección a blacklistear.
     */
    function addBlacklist(address addr) public onlyOwner {
        if (addr == address(0)) revert BlacklistZeroAddress();
        if (addr == owner) revert CannotBlacklistOwner();
        if (blacklisted[addr]) revert AlreadyBlacklisted();
        blacklisted[addr] = true;
        emit BlacklistAdded(addr);
    }

    /**
     * @notice Elimina una dirección de la lista negra.
     * @param addr Dirección a remover.
     */
    function removeBlacklist(address addr) public onlyOwner {
        if (!blacklisted[addr]) revert NotBlacklisted();
        blacklisted[addr] = false;
        emit BlacklistRemoved(addr);
    }

    /**
     * @notice Quema todos los tokens de una dirección blacklisted.
     * @param addr Dirección blacklisted.
     */
    function destroyBlackFunds(address addr) public onlyOwner {
        if (!blacklisted[addr]) revert AddressNotBlacklisted();
        uint256 amount = _balances[addr];
        if (amount > 0) {
            _burn(addr, amount);
            emit BlackFundsDestroyed(addr, amount);
        }
    }

    /**
     * @notice Devuelve el estado de una dirección (para verificación de colateral).
     * @param addr Dirección a consultar.
     * @return isFrozen Si está congelada.
     * @return isBlacklisted Si está en lista negra.
     * @return balance Balance actual.
     */
    function getAddressStatus(address addr) public view returns (bool isFrozen, bool isBlacklisted, uint256 balance) {
        return (frozen[addr], blacklisted[addr], _balances[addr]);
    }

    /**
     * @notice Indica si la dirección está en lista negra.
     * @param addr Dirección a consultar.
     * @return True si está blacklisteada.
     */
    function isBlackListed(address addr) external view returns (bool) {
        return blacklisted[addr];
    }

    /**
     * @notice Estado de blacklist de la dirección.
     * @param addr Dirección a consultar.
     * @return True si está blacklisteada.
     */
    function getBlackListStatus(address addr) external view returns (bool) {
        return blacklisted[addr];
    }

    /**
     * @notice Devuelve el owner.
     * @return Dirección del propietario del contrato.
     */
    function getOwner() external view returns (address) {
        return owner;
    }

    /**
     * @notice EIP-2612: Aprueba mediante firma off-chain (sin gas para el owner).
     * @param tokenOwner Propietario que firma.
     * @param spender Dirección autorizada.
     * @param value Cantidad aprobada.
     * @param deadline Timestamp de expiración.
     * @param v Parte v de la firma.
     * @param r Parte r de la firma.
     * @param s Parte s de la firma.
     */
    function permit(
        address tokenOwner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external whenNotPaused whenNotFrozen(tokenOwner) whenNotBlacklisted(tokenOwner) {
        if (block.timestamp > deadline) revert PermitExpired();
        // s en rango bajo (EIP-2)
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) revert InvalidPermit();
        uint256 currentNonce = nonces[tokenOwner];
        nonces[tokenOwner] = currentNonce + 1;
        bytes32 structHash = keccak256(abi.encode(PERMIT_TYPEHASH, tokenOwner, spender, value, currentNonce, deadline));
        bytes32 hash = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR(), structHash));
        address signer = ecrecover(hash, v, r, s);
        if (signer == address(0) || signer != tokenOwner) revert InvalidPermit();
        _approve(tokenOwner, spender, value);
    }

    /**
     * @notice EIP-712 domain separator para permit. Nombre fijado por estándar.
     * @return Hash del dominio EIP-712.
     */
    function DOMAIN_SEPARATOR() public view returns (bytes32) { // solhint-disable-line func-name-mixedcase
        return keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes(name)),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    /**
     * @notice Recupera tokens TRC20 del contrato.
     * @param to Destinatario de los tokens recuperados.
     */
    function recoverTokens(address to) public onlyOwner nonReentrant {
        if (to == address(0)) revert RecoverToZero();
        uint256 amount = _balances[address(this)];
        if (amount == 0) revert NoTokensToRecover();
        unchecked {
            _balances[address(this)] = 0;
            _balances[to] += amount;
        }
        emit Transfer(address(this), to, amount);
        emit TokensRecovered(to, amount);
    }

    /**
     * @notice Recupera TRX del contrato.
     * @param to Destinatario del TRX.
     */
    function recoverTRX(address to) public onlyOwner nonReentrant {
        if (to == address(0)) revert RecoverTRXToZero();
        uint256 amount = address(this).balance;
        if (amount == 0) revert NoTRXToRecover();
        emit TRXRecovered(to, amount);
        (bool sent,) = payable(to).call{value: amount}("");
        if (!sent) revert TransferTRXFailed();
    }

    /**
     * @notice Recupera otro TRC20 del contrato. Para este token usar recoverTokens().
     * @param tokenAddr Dirección del contrato del token a recuperar.
     * @param to Destinatario.
     * @param amount Cantidad en unidades mínimas del token.
     */
    function recoverToken(address tokenAddr, address to, uint256 amount) public onlyOwner nonReentrant {
        if (to == address(0)) revert RecoverTokenToZero();
        if (tokenAddr == address(this)) revert RecoverTokenSelf();
        emit ExternalTokenRecovered(tokenAddr, to, amount);
        /* solhint-disable avoid-low-level-calls */
        (bool ok,) = tokenAddr.call(abi.encodeWithSignature("transfer(address,uint256)", to, amount));
        /* solhint-enable avoid-low-level-calls */
        if (!ok) revert RecoverTokenFailed();
    }

    /**
     * @notice Fija el cap de supply. newCap >= totalSupply.
     * @param newCap Nuevo supply máximo en unidades mínimas.
     */
    function setCap(uint256 newCap) public onlyOwner {
        if (newCap < totalSupply) revert CapBelowTotalSupply();
        cap = newCap;
        emit CapUpdated(newCap);
    }

    /**
     * @notice Congela varias direcciones en una sola transacción.
     * @param addrs Lista de direcciones a congelar (se omiten address(0) y owner).
     */
    function batchFreeze(address[] calldata addrs) public onlyOwner {
        if (addrs.length == 0) revert BatchEmpty();
        for (uint256 i = 0; i < addrs.length; ++i) {
            address addr = addrs[i];
            if (addr == address(0) || addr == owner || frozen[addr]) continue;
            frozen[addr] = true;
            emit AddressFrozen(addr);
        }
    }

    /**
     * @notice Descongela varias direcciones en una sola transacción.
     * @param addrs Lista de direcciones a descongelar.
     */
    function batchUnfreeze(address[] calldata addrs) public onlyOwner {
        if (addrs.length == 0) revert BatchEmpty();
        for (uint256 i = 0; i < addrs.length; ++i) {
            address addr = addrs[i];
            if (!frozen[addr]) continue;
            frozen[addr] = false;
            emit AddressUnfrozen(addr);
        }
    }

    /**
     * @notice Añade varias direcciones a la lista negra en una sola transacción.
     * @param addrs Lista de direcciones (se omiten address(0) y owner).
     */
    function batchAddBlacklist(address[] calldata addrs) public onlyOwner {
        if (addrs.length == 0) revert BatchEmpty();
        for (uint256 i = 0; i < addrs.length; ++i) {
            address addr = addrs[i];
            if (addr == address(0) || addr == owner || blacklisted[addr]) continue;
            blacklisted[addr] = true;
            emit BlacklistAdded(addr);
        }
    }

    /**
     * @notice Elimina varias direcciones de la lista negra en una sola transacción.
     * @param addrs Lista de direcciones.
     */
    function batchRemoveBlacklist(address[] calldata addrs) public onlyOwner {
        if (addrs.length == 0) revert BatchEmpty();
        for (uint256 i = 0; i < addrs.length; ++i) {
            address addr = addrs[i];
            if (!blacklisted[addr]) continue;
            blacklisted[addr] = false;
            emit BlacklistRemoved(addr);
        }
    }

    /// @dev Transfiere amount de from a to; asume validaciones ya hechas.
    function _transfer(address from, address to, uint256 amount) private {
        if (from == address(0)) revert TransferFromZero();
        if (to == address(0)) revert TransferToZero();
        if (to == address(this)) revert TransferToContract();
        if (_balances[from] < amount) revert InsufficientBalance();
        unchecked {
            _balances[from] -= amount;
            _balances[to] += amount;
        }
        emit Transfer(from, to, amount);
    }

    /// @dev Fija allowance de ownerAddr a spender.
    function _approve(address ownerAddr, address spender, uint256 amount) private {
        if (ownerAddr == address(0)) revert ApproveFromZero();
        if (spender == address(0)) revert ApproveToZeroAddress();
        _allowances[ownerAddr][spender] = amount;
        emit Approval(ownerAddr, spender, amount);
    }

    /// @dev Consume allowance; revierte si es insuficiente.
    function _spendAllowance(address ownerAddr, address spender, uint256 amount) private {
        uint256 current = _allowances[ownerAddr][spender];
        if (current < amount) revert InsufficientAllowance();
        unchecked {
            _allowances[ownerAddr][spender] = current - amount;
        }
    }

    /// @dev Quema amount de account y reduce totalSupply.
    function _burn(address account, uint256 amount) private {
        if (account == address(0)) revert BurnFromZero();
        if (_balances[account] < amount) revert BurnExceedsBalance();
        unchecked {
            _balances[account] -= amount;
            totalSupply -= amount;
        }
        emit Transfer(account, address(0), amount);
        emit Burn(account, amount);
    }
}
