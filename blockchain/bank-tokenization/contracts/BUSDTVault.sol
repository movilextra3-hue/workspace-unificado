// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    SafeERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {
    ReentrancyGuard
} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import {BUSDT} from "./BUSDT.sol";

/**
 * @title BUSDTVault
 * @dev Holds real USDT; mints/burns bUSDT only on Oracle-signed Instruction (EIP-712).
 *      Mint: pull USDT from Treasury, mint bUSDT to beneficiary.
 *      Redeem: burn bUSDT from beneficiary, transfer USDT to beneficiary.
 *      Uses SafeERC20 for USDT (handles non-standard return values) and ReentrancyGuard.
 */
contract BUSDTVault is EIP712, ReentrancyGuard {
    BUSDT public immutable bUSDT;
    IERC20 public immutable USDT;
    address public immutable TREASURY;
    address public immutable ORACLE;

    bytes32 public constant INSTRUCTION_TYPEHASH =
        keccak256(
            "Instruction(bytes32 swiftHash,address beneficiary,uint256 usdtAmount,bool mint,uint256 deadline)"
        );

    struct Instruction {
        bytes32 swiftHash;
        address beneficiary;
        uint256 usdtAmount;
        bool mint;
        uint256 deadline;
        bytes sig;
    }

    mapping(bytes32 => bool) public spent;

    event SwiftEvent(
        bytes32 indexed swiftHash,
        address indexed beneficiary,
        uint256 usdtAmount,
        bool mint
    );

    error Spent();
    error Expired();
    error BadSignature();

    constructor(
        address _bUSDT,
        address _usdt,
        address _treasury,
        address _oracle
    ) EIP712("bUSDT-Vault", "1") {
        bUSDT = BUSDT(_bUSDT);
        USDT = IERC20(_usdt);
        TREASURY = _treasury;
        ORACLE = _oracle;
    }

    function execute(Instruction calldata _i) external nonReentrant {
        if (spent[_i.swiftHash]) revert Spent();
        if (block.timestamp > _i.deadline) revert Expired();

        bytes32 structHash = keccak256(
            abi.encode(
                INSTRUCTION_TYPEHASH,
                _i.swiftHash,
                _i.beneficiary,
                _i.usdtAmount,
                _i.mint,
                _i.deadline
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, _i.sig);
        if (signer != ORACLE) revert BadSignature();

        spent[_i.swiftHash] = true;

        if (_i.mint) {
            SafeERC20.safeTransferFrom(
                USDT,
                TREASURY,
                address(this),
                _i.usdtAmount
            );
            bUSDT.mint(_i.beneficiary, _i.usdtAmount);
        } else {
            bUSDT.burnFrom(_i.beneficiary, _i.usdtAmount);
            SafeERC20.safeTransfer(USDT, _i.beneficiary, _i.usdtAmount);
        }

        emit SwiftEvent(_i.swiftHash, _i.beneficiary, _i.usdtAmount, _i.mint);
    }
}
