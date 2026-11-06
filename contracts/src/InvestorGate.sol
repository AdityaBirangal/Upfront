// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {UpfrontAccess} from "./UpfrontAccess.sol";

/// @title InvestorGate
/// @notice Lets a verified human join as an investor without the Admin, once per human. World ID has no
/// verifier on Whitechain, so the backend checks the proof offchain and signs a voucher for the wallet.
/// @dev Must hold DEFAULT_ADMIN_ROLE on UpfrontAccess, because that role controls INVESTOR_ROLE and can't
/// be narrowed without redeploying. This is safe because `join` only grants INVESTOR_ROLE, `reset` only
/// revokes it from wallets that joined here, and the contract has no owner and can't be upgraded.
contract InvestorGate is EIP712 {
    uint256 public constant VERSION = 7;

    bytes32 private constant VOUCHER_TYPEHASH =
        keccak256("JoinVoucher(address wallet,bytes32 nullifierHash,uint64 expiry)");

    UpfrontAccess public immutable access;
    /// @notice The backend key that signs vouchers. It holds no funds and sends no transactions.
    address public immutable signer;

    /// @notice Goes up on each reset, which clears every used nullifier at once.
    uint256 public round;
    mapping(uint256 round => mapping(bytes32 nullifierHash => bool used)) private _used;
    address[] private _joined;

    event InvestorJoined(address indexed wallet, bytes32 indexed nullifierHash);
    event GateReset(address indexed admin, uint256 round, uint256 walletsRevoked);

    error ZeroAddress();
    error VoucherExpired();
    error BadSignature();
    error NullifierAlreadyUsed();
    error NotAdmin();

    constructor(UpfrontAccess access_, address signer_) EIP712("Upfront InvestorGate", "7") {
        if (address(access_) == address(0) || signer_ == address(0)) revert ZeroAddress();
        access = access_;
        signer = signer_;
    }

    /// @notice Grants the caller INVESTOR_ROLE. The voucher is bound to the caller, so it can't be used
    /// by another wallet, and each nullifier works once, so a human can't join with a second wallet.
    function join(bytes32 nullifierHash, uint64 expiry, bytes calldata signature) external {
        if (block.timestamp > expiry) revert VoucherExpired();

        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(VOUCHER_TYPEHASH, msg.sender, nullifierHash, expiry)));
        (address recovered, ECDSA.RecoverError error,) = ECDSA.tryRecover(digest, signature);
        if (error != ECDSA.RecoverError.NoError || recovered != signer) revert BadSignature();

        if (_used[round][nullifierHash]) revert NullifierAlreadyUsed();
        _used[round][nullifierHash] = true;
        _joined.push(msg.sender);

        emit InvestorJoined(msg.sender, nullifierHash);
        access.grantRole(access.INVESTOR_ROLE(), msg.sender);
    }

    /// @notice Lets the demo run again: revokes INVESTOR_ROLE from every wallet that joined this round,
    /// and forgets their nullifiers. It gives an Admin no new power, because an Admin can already add or
    /// remove any investor by hand. Investors added by an Admin aren't touched, and units stay with
    /// their holders.
    function reset() external {
        if (!access.hasRole(access.DEFAULT_ADMIN_ROLE(), msg.sender)) revert NotAdmin();

        address[] memory wallets = _joined;
        delete _joined;
        round += 1;
        emit GateReset(msg.sender, round, wallets.length);

        bytes32 investorRole = access.INVESTOR_ROLE();
        for (uint256 i = 0; i < wallets.length; ++i) {
            access.revokeRole(investorRole, wallets[i]);
        }
    }

    function nullifierUsed(bytes32 nullifierHash) external view returns (bool) {
        return _used[round][nullifierHash];
    }

    /// @notice How many wallets joined this round, which is what a reset would revoke.
    function joinedCount() external view returns (uint256) {
        return _joined.length;
    }
}
