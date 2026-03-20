// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Migrations
 * @author TronBox
 * @notice Seguimiento de migraciones de TronBox (última migración completada).
 */
contract Migrations {
    error Restricted();

    /// @notice Dirección que puede marcar migraciones como completadas.
    address public owner = msg.sender;
    /// @notice Número de la última migración ejecutada.
    uint256 public lastCompletedMigration;

    modifier restricted() {
        if (msg.sender != owner) revert Restricted();
        _;
    }

    /**
     * @notice Marca una migración como completada.
     * @param completed Número de migración a marcar como completada.
     */
    function setCompleted(uint256 completed) public restricted {
        lastCompletedMigration = completed;
    }
}
