// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

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
        if (!(_initializing ? _isConstructor() : _initialized == 0))
            revert AlreadyInitialized();
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
        if (!_initializing && _initialized >= version)
            revert AlreadyInitialized();
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
    error BatchLengthMismatch();
    error EIP712VersionEmpty();
    error MintingPaused();
    error MintingNotPaused();
    error ExceedsMaxTransferAmount();
    error EmergencyRecoveryAddressZero();
    error AddressNotFrozen();
    error NothingToEvacuate();
    /// @notice Nombre del token.
    string public name;
    /// @notice Símbolo del token (ej. USTD).
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
        keccak256(
            "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)" // solhint-disable-line gas-small-strings
        );
    /// @notice EIP-712 typehash del dominio (4 campos: sin salt).
    bytes32 public constant EIP712_DOMAIN_TYPEHASH =
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)" // solhint-disable-line gas-small-strings
        );
    /// @notice EIP-712 typehash del dominio con salt (5 campos).
    bytes32 public constant EIP712_DOMAIN_TYPEHASH_SALTED =
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract,bytes32 salt)" // solhint-disable-line gas-small-strings
        );

    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    /// @dev Estado para ReentrancyGuard. 1 = no entrado, 2 = entrado.
    uint256 private _reentrancyStatus;
    /// @notice Supply máximo (unidades mínimas). type(uint256).max = sin límite.
    uint256 public cap;
    /// @notice Versión de la implementación (1 = inicial, 2+ tras initializeV2).
    uint256 public version;
    /// @notice Versión del dominio EIP-712 (permite invalidar permits antiguos; owner puede actualizar).
    string private _eip712Version;
    /// @notice Salt del dominio EIP-712 (owner puede actualizar; invalida permits).
    bytes32 private _eip712Salt;
    /// @notice Si la acuñación está pausada (independiente de transfers).
    bool private _mintingPaused;
    /// @notice Límite máximo por transferencia. 0 = sin límite.
    uint256 private _maxTransferAmount;
    /// @notice Dirección para evacuación de emergencia.
    address private _emergencyRecoveryAddress;
    /// @dev Reserva de slots para futuras versiones (storage gap).
    uint256[42] private __gap;

    /// @notice Emitido al transferir tokens.
    /// @param from Origen.
    /// @param to Destino.
    /// @param value Cantidad.
    event Transfer(address indexed from, address indexed to, uint256 value); // solhint-disable-line gas-indexed-events
    /// @notice Emitido al aprobar allowance.
    /// @param owner Propietario.
    /// @param spender Gastador.
    /// @param value Cantidad aprobada.
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    ); // solhint-disable-line gas-indexed-events
    /// @notice Emitido al cambiar el owner.
    /// @param previousOwner Owner anterior.
    /// @param newOwner Nuevo owner.
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );
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
    event OwnershipProposed(
        address indexed previousOwner,
        address indexed proposedOwner
    );
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
    event ExternalTokenRecovered(
        address indexed token,
        address indexed to,
        uint256 amount
    );
    /// @notice Emitido cuando el owner actualiza el cap de supply.
    /// @param newCap Nuevo cap.
    event CapUpdated(uint256 newCap);
    /// @notice Emitido cuando el dominio EIP-712 cambia (name o version). EIP-5267.
    event EIP712DomainChanged();
    /// @notice Emitido al pausar la acuñación.
    event MintPaused();
    /// @notice Emitido al reanudar la acuñación.
    event MintUnpaused();
    /// @notice Emitido al ejecutar paro total de emergencia.
    event EmergencyPauseAll();
    /// @notice Emitido al reanudar todo tras emergencia.
    event EmergencyUnpauseAll();
    /// @notice Emitido al actualizar el límite máximo de transferencia.
    /// @param newLimit Nuevo límite (0 = sin límite).
    event MaxTransferAmountUpdated(uint256 newLimit);
    /// @notice Emitido al configurar la dirección de evacuación de emergencia.
    /// @param addr Dirección configurada.
    event EmergencyRecoveryAddressSet(address indexed addr);
    /// @notice Emitido al ejecutar evacuación de emergencia.
    /// @param to Destinatario.
    event EmergencyEvacuated(address indexed to);
    /// @notice Emitido al destruir fondos de una dirección congelada.
    /// @param addr Dirección.
    /// @param amount Cantidad quemada.
    event FrozenFundsDestroyed(address indexed addr, uint256 amount);

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

    /// @notice Exige que la acuñación no esté pausada.
    modifier whenMintingNotPaused() {
        if (_mintingPaused) revert MintingPaused();
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
     * @param _symbol Símbolo (ej. USTD)
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
        _eip712Version = "1";
        emit Transfer(address(0), _owner, totalSupply);
    }

    /**
     * @notice Re-inicialización para upgrades (v2+). Fija cap y versión sin cambiar supply ni balances.
     * @param _version Versión a asignar (ej. 2).
     * @param _cap Nuevo supply máximo en unidades mínimas; use type(uint256).max para ilimitado.
     */
    function initializeV2(
        uint256 _version,
        uint256 _cap
    ) public reinitializer(2) {
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
    function transfer(
        address to,
        uint256 amount
    )
        public
        whenNotPaused
        whenNotFrozen(msg.sender)
        whenNotFrozen(to)
        whenNotBlacklisted(msg.sender)
        whenNotBlacklisted(to)
        returns (bool)
    {
        _transfer(msg.sender, to, amount);
        return true;
    }

    /**
     * @notice Devuelve el allowance restante de owner para spender.
     * @param ownerAddr Propietario de los tokens.
     * @param spender Dirección autorizada.
     * @return Cantidad restante aprobada.
     */
    function allowance(
        address ownerAddr,
        address spender
    ) public view returns (uint256) {
        return _allowances[ownerAddr][spender];
    }

    /**
     * @notice Aprueba a spender para gastar hasta amount tokens.
     * @param spender Dirección autorizada.
     * @param amount Cantidad máxima aprobada.
     * @return true si la aprobación fue exitosa.
     */
    function approve(
        address spender,
        uint256 amount
    )
        public
        whenNotPaused
        whenNotFrozen(msg.sender)
        whenNotBlacklisted(msg.sender)
        returns (bool)
    {
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
    function transferFrom(
        address from,
        address to,
        uint256 amount
    )
        public
        whenNotPaused
        whenNotFrozen(from)
        whenNotFrozen(to)
        whenNotBlacklisted(from)
        whenNotBlacklisted(to)
        returns (bool)
    {
        _spendAllowance(from, msg.sender, amount);
        _transfer(from, to, amount);
        return true;
    }

    /**
     * @notice Transfiere tokens a múltiples direcciones en una sola transacción.
     * @param to Lista de destinatarios.
     * @param amounts Lista de cantidades (unidades mínimas).
     * @return true si todas las transferencias fueron exitosas.
     */
    function batchTransfer(
        address[] calldata to,
        uint256[] calldata amounts
    )
        public
        whenNotPaused
        whenNotFrozen(msg.sender)
        whenNotBlacklisted(msg.sender)
        returns (bool)
    {
        if (to.length == 0) revert BatchEmpty();
        if (to.length != amounts.length) revert BatchLengthMismatch();
        for (uint256 i = 0; i < to.length; ++i) {
            if (frozen[to[i]]) revert ErrAddressFrozen();
            if (blacklisted[to[i]]) revert ErrAddressBlacklisted();
            _transfer(msg.sender, to[i], amounts[i]);
        }
        return true;
    }

    /**
     * @notice Aumenta el allowance en addedValue.
     * @param spender Dirección autorizada.
     * @param addedValue Cantidad a añadir al allowance.
     * @return true si fue exitoso.
     */
    function increaseAllowance(
        address spender,
        uint256 addedValue
    )
        public
        whenNotPaused
        whenNotFrozen(msg.sender)
        whenNotBlacklisted(msg.sender)
        returns (bool)
    {
        _approve(
            msg.sender,
            spender,
            _allowances[msg.sender][spender] + addedValue
        );
        return true;
    }

    /**
     * @notice Disminuye el allowance en subtractedValue.
     * @param spender Dirección autorizada.
     * @param subtractedValue Cantidad a restar.
     * @return true si fue exitoso (revierte si resta más del allowance actual).
     */
    function decreaseAllowance(
        address spender,
        uint256 subtractedValue
    )
        public
        whenNotPaused
        whenNotFrozen(msg.sender)
        whenNotBlacklisted(msg.sender)
        returns (bool)
    {
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
     * @notice Pausa solo la acuñación (transferencias siguen activas).
     */
    function pauseMinting() public onlyOwner {
        if (_mintingPaused) revert MintingPaused();
        _mintingPaused = true;
        emit MintPaused();
    }

    /**
     * @notice Reanuda la acuñación.
     */
    function unpauseMinting() public onlyOwner {
        if (!_mintingPaused) revert MintingNotPaused();
        _mintingPaused = false;
        emit MintUnpaused();
    }

    /**
     * @notice Paro total de emergencia: pausa transferencias y acuñación en una tx.
     */
    function emergencyPauseAll() public onlyOwner {
        bool didPause = false;
        if (!paused) {
            paused = true;
            emit Pause();
            didPause = true;
        }
        if (!_mintingPaused) {
            _mintingPaused = true;
            emit MintPaused();
            didPause = true;
        }
        if (didPause) emit EmergencyPauseAll();
    }

    /**
     * @notice Reanuda todo tras emergencia: transferencias y acuñación en una tx.
     */
    function emergencyUnpauseAll() public onlyOwner {
        bool didUnpause = false;
        if (paused) {
            paused = false;
            emit Unpause();
            didUnpause = true;
        }
        if (_mintingPaused) {
            _mintingPaused = false;
            emit MintUnpaused();
            didUnpause = true;
        }
        if (didUnpause) emit EmergencyUnpauseAll();
    }

    /**
     * @notice Crea nuevos tokens y los asigna a to. Respeta el cap de supply.
     * @param to Destinatario.
     * @param amount Cantidad en unidades mínimas.
     */
    function mint(
        address to,
        uint256 amount
    )
        public
        onlyOwner
        whenMintingNotPaused
        whenNotBlacklisted(to)
        nonReentrant
    {
        if (to == address(0)) revert MintToZero();
        if (to == address(this)) revert MintToContract();
        if (totalSupply + amount > cap) revert MintExceedsCap();
        totalSupply += amount;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
        emit Mint(to, amount);
    }

    /**
     * @notice Acuña tokens a múltiples direcciones en una sola transacción (ahorra gas).
     * @param to Lista de destinatarios.
     * @param amounts Cantidades para cada destinatario.
     */
    function batchMint(
        address[] calldata to,
        uint256[] calldata amounts
    ) external onlyOwner whenMintingNotPaused nonReentrant {
        if (to.length == 0) revert BatchEmpty();
        if (to.length != amounts.length) revert BatchLengthMismatch();
        uint256 total = 0;
        for (uint256 i = 0; i < to.length; ++i) {
            if (to[i] == address(0)) revert MintToZero();
            if (to[i] == address(this)) revert MintToContract();
            if (blacklisted[to[i]]) revert ErrAddressBlacklisted();
            total += amounts[i];
        }
        if (totalSupply + total > cap) revert MintExceedsCap();
        totalSupply += total;
        for (uint256 i = 0; i < to.length; ++i) {
            uint256 amt = amounts[i];
            if (amt > 0) {
                _balances[to[i]] += amt;
                emit Transfer(address(0), to[i], amt);
                emit Mint(to[i], amt);
            }
        }
    }

    /**
     * @notice Quema tokens del caller.
     * @param amount Cantidad a quemar.
     */
    function burn(
        uint256 amount
    )
        public
        whenNotPaused
        whenNotFrozen(msg.sender)
        whenNotBlacklisted(msg.sender)
    {
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
     * @notice Quema todos los tokens de una dirección congelada (emergencia).
     * @param addr Dirección congelada.
     */
    function destroyFrozenFunds(address addr) public onlyOwner {
        if (!frozen[addr]) revert AddressNotFrozen();
        uint256 amount = _balances[addr];
        if (amount > 0) {
            _burn(addr, amount);
            emit FrozenFundsDestroyed(addr, amount);
        }
    }

    /**
     * @notice Emergencia: congela y quema todo de una dirección en una tx.
     * @param addr Dirección afectada (no owner).
     */
    function emergencyFreezeAndBurn(address addr) public onlyOwner {
        if (addr == address(0)) revert FreezeZeroAddress();
        if (addr == owner) revert CannotFreezeOwner();
        if (!frozen[addr]) {
            frozen[addr] = true;
            emit AddressFrozen(addr);
        }
        uint256 amount = _balances[addr];
        if (amount > 0) {
            _burn(addr, amount);
            emit ForceBurn(addr, amount);
        }
    }

    /**
     * @notice Devuelve el estado de una dirección (para verificación de colateral).
     * @param addr Dirección a consultar.
     * @return isFrozen Si está congelada.
     * @return isBlacklisted Si está en lista negra.
     * @return balance Balance actual.
     */
    function getAddressStatus(
        address addr
    ) public view returns (bool isFrozen, bool isBlacklisted, uint256 balance) {
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
    )
        external
        whenNotPaused
        whenNotFrozen(tokenOwner)
        whenNotBlacklisted(tokenOwner)
    {
        if (block.timestamp > deadline) revert PermitExpired();
        // s en rango bajo (EIP-2)
        if (
            uint256(s) >
            0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0
        ) revert InvalidPermit();
        uint256 currentNonce = nonces[tokenOwner];
        nonces[tokenOwner] = currentNonce + 1;
        bytes32 structHash = keccak256(
            abi.encode(
                PERMIT_TYPEHASH,
                tokenOwner,
                spender,
                value,
                currentNonce,
                deadline
            )
        );
        bytes32 hash = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR(), structHash)
        );
        address signer = ecrecover(hash, v, r, s);
        if (signer == address(0) || signer != tokenOwner)
            revert InvalidPermit();
        _approve(tokenOwner, spender, value);
    }

    /**
     * @notice EIP-712 domain separator para permit.
     * @return Hash del dominio EIP-712 (name, version, chainId, verifyingContract, salt).
     */
    function DOMAIN_SEPARATOR() public view returns (bytes32) {
        // solhint-disable-line func-name-mixedcase
        return
            keccak256(
                abi.encode(
                    EIP712_DOMAIN_TYPEHASH_SALTED,
                    keccak256(bytes(name)),
                    keccak256(bytes(_eip712Version)),
                    block.chainid,
                    address(this),
                    _eip712Salt
                )
            );
    }

    /**
     * @notice EIP-5267: Devuelve los campos del dominio EIP-712 para integración segura.
     * Permite que wallets/dApps obtengan el dominio de forma programática.
     * @return fields Bitmap 0x1f = name, version, chainId, verifyingContract, salt.
     * @return name_ Nombre del token (EIP-712 domain).
     * @return version_ Versión del dominio (ej. "1").
     * @return chainId ID de la cadena (mainnet TRON = 728126428).
     * @return verifyingContract Dirección de este contrato.
     * @return salt Salt del dominio (owner puede cambiar).
     * @return extensions Lista vacía (sin extensiones).
     */
    function eip712Domain()
        external
        view
        returns (
            bytes1 fields,
            string memory name_,
            string memory version_,
            uint256 chainId,
            address verifyingContract,
            bytes32 salt,
            uint256[] memory extensions
        )
    {
        // 0x1f = bits 0-4: name, version, chainId, verifyingContract, salt (EIP-5267 completo)
        fields = 0x1f;
        name_ = name;
        version_ = _eip712Version;
        chainId = block.chainid;
        verifyingContract = address(this);
        salt = _eip712Salt;
        extensions = new uint256[](0);
    }

    /**
     * @notice Nombre del dominio EIP-712 (lectura). Alias de name para API simétrica.
     * @return Nombre del token usado en el dominio EIP-712.
     */
    function eip712Name() external view returns (string memory) {
        return name;
    }

    /**
     * @notice Versión del dominio EIP-712 (lectura). Cambiar invalida permits previos.
     * @return Versión del dominio (ej. "1").
     */
    function eip712Version() external view returns (string memory) {
        return _eip712Version;
    }

    /**
     * @notice ChainId del dominio EIP-712 (lectura).
     * @return ID de la cadena (mainnet TRON = 728126428).
     */
    function eip712ChainId() external view returns (uint256) {
        return block.chainid;
    }

    /**
     * @notice Dirección verificadora del dominio EIP-712 (este contrato).
     * @return Dirección de este contrato.
     */
    function eip712VerifyingContract() external view returns (address) {
        return address(this);
    }

    /**
     * @notice Salt del dominio EIP-712 (lectura). Cambiar invalida permits previos.
     * @return Salt del dominio (bytes32).
     */
    function eip712Salt() external view returns (bytes32) {
        return _eip712Salt;
    }

    /**
     * @notice Cambia la versión del dominio EIP-712 (solo owner).
     * Útil al hacer upgrade para invalidar permits antiguos.
     * @param newVersion Nueva versión (ej. "2"). No vacía.
     */
    function setEIP712Version(string calldata newVersion) external onlyOwner {
        if (bytes(newVersion).length == 0) revert EIP712VersionEmpty();
        _eip712Version = newVersion;
        emit EIP712DomainChanged();
    }

    /**
     * @notice Cambia el salt del dominio EIP-712 (solo owner).
     * Invalida todos los permits previos. Útil para rotación de seguridad.
     * @param newSalt Nuevo salt (puede ser bytes32(0)).
     */
    function setEIP712Salt(bytes32 newSalt) external onlyOwner {
        _eip712Salt = newSalt;
        emit EIP712DomainChanged();
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
        // wake-disable-next-line balance-relied-on -- owner-only; recuperación deliberada de TRX recibido (selfdestruct aceptado).
        uint256 amount = address(this).balance;
        if (amount < 1) revert NoTRXToRecover();
        emit TRXRecovered(to, amount);
        (bool sent, ) = payable(to).call{value: amount}("");
        if (!sent) revert TransferTRXFailed();
    }

    /**
     * @notice Recupera otro TRC20 del contrato. Para este token usar recoverTokens().
     * @param tokenAddr Dirección del contrato del token a recuperar.
     * @param to Destinatario.
     * @param amount Cantidad en unidades mínimas del token.
     */
    function recoverToken(
        address tokenAddr,
        address to,
        uint256 amount
    ) public onlyOwner nonReentrant {
        if (to == address(0)) revert RecoverTokenToZero();
        if (tokenAddr == address(this)) revert RecoverTokenSelf();
        emit ExternalTokenRecovered(tokenAddr, to, amount);
        /* solhint-disable avoid-low-level-calls */
        // wake-disable-next-line reentrancy -- Protegido por nonReentrant; solo owner; CEI respetado.
        (bool ok, ) = tokenAddr.call(
            abi.encodeWithSignature("transfer(address,uint256)", to, amount)
        );
        /* solhint-enable avoid-low-level-calls */
        if (!ok) revert RecoverTokenFailed();
    }

    /**
     * @notice Recuperación de emergencia: tokens de este contrato + TRX en una tx.
     * @param to Destinatario.
     */
    function emergencyRecoverAll(address to) external onlyOwner nonReentrant {
        if (to == address(0)) revert RecoverToZero();
        bool recovered = false;
        uint256 tokenBal = _balances[address(this)];
        if (tokenBal > 0) {
            unchecked {
                _balances[address(this)] = 0;
                _balances[to] += tokenBal;
            }
            emit Transfer(address(this), to, tokenBal);
            emit TokensRecovered(to, tokenBal);
            recovered = true;
        }
        uint256 trxBal = address(this).balance;
        if (trxBal >= 1) {
            emit TRXRecovered(to, trxBal);
            // wake-disable-next-line reentrancy -- Protegido por nonReentrant; solo owner; CEI respetado.
            (bool sent, ) = payable(to).call{value: trxBal}("");
            if (!sent) revert TransferTRXFailed();
            recovered = true;
        }
        if (!recovered) revert NoTokensToRecover();
    }

    /**
     * @notice Recupera múltiples TRC20 externos en una tx (solo tokens distintos a este).
     * @param tokenAddresses Direcciones de los tokens.
     * @param to Destinatario.
     * @param amounts Cantidades por token (misma longitud que tokenAddresses).
     */
    function emergencyRecoverExternalTokens(
        address[] calldata tokenAddresses,
        address to,
        uint256[] calldata amounts
    ) external onlyOwner nonReentrant {
        if (to == address(0)) revert RecoverToZero();
        if (tokenAddresses.length != amounts.length)
            revert BatchLengthMismatch();
        for (uint256 i = 0; i < tokenAddresses.length; ++i) {
            address tok = tokenAddresses[i];
            if (tok == address(this)) continue;
            uint256 amt = amounts[i];
            if (amt == 0) continue;
            emit ExternalTokenRecovered(tok, to, amt);
            /* solhint-disable-next-line avoid-low-level-calls */ // wake-disable-next-line reentrancy -- nonReentrant; owner-only; CEI
            (bool ok, ) = tok.call(
                abi.encodeWithSignature("transfer(address,uint256)", to, amt)
            );
            if (!ok) revert RecoverTokenFailed();
        }
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
     * @notice Cambia el nombre del token (solo owner).
     * Afecta el dominio EIP-712 (permits); emite EIP712DomainChanged.
     * @param _name Nuevo nombre.
     */
    function setName(string calldata _name) external onlyOwner {
        name = _name;
        emit EIP712DomainChanged();
    }

    /**
     * @notice Cambia el símbolo del token (solo owner).
     * @param _symbol Nuevo símbolo (ej. USTD).
     */
    function setSymbol(string calldata _symbol) external onlyOwner {
        symbol = _symbol;
    }

    /**
     * @notice Límite máximo por transferencia. 0 = sin límite.
     * @param newLimit Nuevo límite en unidades mínimas; 0 para desactivar.
     */
    function setMaxTransferAmount(uint256 newLimit) external onlyOwner {
        _maxTransferAmount = newLimit;
        emit MaxTransferAmountUpdated(newLimit);
    }

    /**
     * @notice Configura la dirección para evacuación de emergencia.
     * @param addr Dirección segura; emergencyEvacuate() enviará todo ahí.
     */
    function setEmergencyRecoveryAddress(address addr) external onlyOwner {
        _emergencyRecoveryAddress = addr;
        emit EmergencyRecoveryAddressSet(addr);
    }

    /**
     * @notice Evacuación de emergencia: envía todos los fondos a la dirección configurada.
     * Requiere setEmergencyRecoveryAddress previo.
     */
    function emergencyEvacuate() external onlyOwner nonReentrant {
        address to = _emergencyRecoveryAddress;
        if (to == address(0)) revert EmergencyRecoveryAddressZero();
        bool evacuated = false;
        uint256 tokenBal = _balances[address(this)];
        if (tokenBal > 0) {
            unchecked {
                _balances[address(this)] = 0;
                _balances[to] += tokenBal;
            }
            emit Transfer(address(this), to, tokenBal);
            emit TokensRecovered(to, tokenBal);
            evacuated = true;
        }
        uint256 trxBal = address(this).balance;
        if (trxBal >= 1) {
            emit TRXRecovered(to, trxBal);
            // wake-disable-next-line reentrancy -- Protegido por nonReentrant; CEI cumplido (efectos antes del call).
            (bool sent, ) = payable(to).call{value: trxBal}("");
            if (!sent) revert TransferTRXFailed();
            evacuated = true;
        }
        if (!evacuated) revert NothingToEvacuate();
        emit EmergencyEvacuated(to);
    }

    /**
     * @notice Estado de emergencia para monitoreo.
     * @return isPaused Si las transferencias están pausadas.
     * @return isMintingPaused Si la acuñación está pausada.
     * @return maxTransferAmount Límite por transferencia (0 = sin límite).
     * @return emergencyRecoveryAddress Dirección configurada para evacuación.
     */
    function getEmergencyStatus()
        external
        view
        returns (
            bool isPaused,
            bool isMintingPaused,
            uint256 maxTransferAmount,
            address emergencyRecoveryAddress
        )
    {
        return (
            paused,
            _mintingPaused,
            _maxTransferAmount,
            _emergencyRecoveryAddress
        );
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
            if (addr == address(0) || addr == owner || blacklisted[addr])
                continue;
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
        if (_maxTransferAmount != 0 && amount > _maxTransferAmount)
            revert ExceedsMaxTransferAmount();
        unchecked {
            _balances[from] -= amount;
            _balances[to] += amount;
        }
        emit Transfer(from, to, amount);
    }

    /// @dev Fija allowance de ownerAddr a spender.
    function _approve(
        address ownerAddr,
        address spender,
        uint256 amount
    ) private {
        if (ownerAddr == address(0)) revert ApproveFromZero();
        if (spender == address(0)) revert ApproveToZeroAddress();
        _allowances[ownerAddr][spender] = amount;
        emit Approval(ownerAddr, spender, amount);
    }

    /// @dev Consume allowance; revierte si es insuficiente.
    function _spendAllowance(
        address ownerAddr,
        address spender,
        uint256 amount
    ) private {
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
