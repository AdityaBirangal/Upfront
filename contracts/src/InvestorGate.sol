// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {UpfrontAccess} from "./UpfrontAccess.sol";

/// @title InvestorGate
/// @notice Lets a verified human join as an investor without the Admin, once per human. World ID has no
/// verifier on Whitechain, so the backend checks the proof offchain and signs a voucher for the wallet.
/// @dev Must hold DEFAULT_ADMIN_ROLE on UpfrontAccess, because that role controls INVESTOR_ROLE and can't
/// be narrowed without redeploying. This is safe because `join` is the only state-changing function, it
/// only ever grants INVESTOR_ROLE, and the contract has no owner and can't be upgraded.
contract InvestorGate is EIP712 {
    uint256 public constant VERSION = 7;

    bytes32 private constant VOUCHER_TYPEHASH =
        keccak256("JoinVoucher(address wallet,bytes32 nullifierHash,uint64 expiry)");

    UpfrontAccess public immutable access;
    /// @notice The backend key that signs vouchers. It holds no funds and sends no transactions.
    address public immutable signer;

    mapping(bytes32 nullifierHash => bool used) public nullifierUsed;

    event InvestorJoined(address indexed wallet, bytes32 indexed nullifierHash);

    error ZeroAddress();
    error VoucherExpired();
    error BadSignature();
    error NullifierAlreadyUsed();

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

        if (nullifierUsed[nullifierHash]) revert NullifierAlreadyUsed();
        nullifierUsed[nullifierHash] = true;

        emit InvestorJoined(msg.sender, nullifierHash);
        access.grantRole(access.INVESTOR_ROLE(), msg.sender);
    }
}
