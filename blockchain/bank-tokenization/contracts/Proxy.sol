// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {
    ERC1967Proxy
} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @dev Thin wrapper so Hardhat compiles the proxy; use for bUSDT UUPS deployment.
contract Proxy is ERC1967Proxy {
    constructor(
        address implementation,
        bytes memory data
    ) ERC1967Proxy(implementation, data) {}
}
