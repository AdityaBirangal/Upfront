// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC1155, ERC1155Supply} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {UpfrontAccess} from "./UpfrontAccess.sol";

/// @notice Lifecycle of a receivable. Final from V2, though later versions reach the later states.
/// Verification isn't a step here: see `Receivable.verified`.
enum Status {
    None,
    Created,
    Listed,
    Funded,
    Settled,
    Defaulted,
    Rejected,
    Cancelled
}

/// @notice Final from V2. Fields a version doesn't use yet stay zero.
struct Receivable {
    address seller;
    address buyer;
    uint256 faceValue; // USDT base units
    uint256 totalUnits; // faceValue / UNIT
    uint256 unitPrice; // USDT base units per unit, set when listed
    uint256 unitsSold;
    uint256 maxUnitsPerInvestor; // set when listed
    uint64 dueDate; // unix seconds
    uint64 createdAt;
    uint16 discountBps; // set when listed
    Status status;
    bool verified; // set by the buyer, never cleared
    bytes32 docHash; // SHA-256 of the document
    string ref; // e.g. "RCV-1001"
}

/// @title Upfront
/// @notice ERC-1155 where each receivable is one token ID and 1 unit pays 1 USDT after settlement.
contract Upfront is ERC1155Supply {
    uint256 public constant VERSION = 2;

    UpfrontAccess public immutable access;
    IERC20Metadata public immutable usdt;

    /// @notice USDT base units in one unit, read from the token rather than hardcoded.
    uint256 public immutable UNIT;

    /// @notice Number of receivables created. Ids run 1..receivableCount.
    uint256 public receivableCount;

    /// @notice Active receivable backed by a document, or 0 if unused.
    mapping(bytes32 docHash => uint256 id) public receivableIdByDocHash;

    mapping(uint256 id => Receivable) private _receivables;

    event ReceivableCreated(
        uint256 indexed id,
        address indexed seller,
        address indexed buyer,
        uint256 faceValue,
        uint64 dueDate,
        bytes32 docHash,
        string ref
    );
    event ReceivableVerified(uint256 indexed id, address indexed buyer);
    event ReceivableRejected(uint256 indexed id);
    event ReceivableCancelled(uint256 indexed id);

    error ZeroAddress();
    error NotAllowed(address account, bytes32 role);
    error SellerIsBuyer();
    error InvalidFaceValue();
    error DueDateNotInFuture();
    error EmptyDocHash();
    error DocHashInUse();
    error UnknownReceivable();
    error NotBuyer();
    error NotSeller();
    error InvalidStatus(Status status);
    error DueDatePassed();
    error AlreadyVerified();
    error UnitsAlreadySold();
    error UnitsLocked();

    constructor(UpfrontAccess access_, IERC20Metadata usdt_, string memory uri_) ERC1155(uri_) {
        if (address(access_) == address(0) || address(usdt_) == address(0)) revert ZeroAddress();
        access = access_;
        usdt = usdt_;
        UNIT = 10 ** usdt_.decimals();
    }

    /// @notice Creates a receivable owed by `buyer` and mints all its units to the caller.
    /// @param buyer Wallet that owes the money. Must hold BUYER_ROLE.
    /// @param faceValue Total owed in USDT base units, in whole units.
    /// @param dueDate Unix seconds when payment is due.
    /// @param docHash SHA-256 of the signed project agreement.
    /// @param ref Seller's own document number, for display.
    /// @return id The new token ID.
    function createReceivable(address buyer, uint256 faceValue, uint64 dueDate, bytes32 docHash, string calldata ref)
        external
        returns (uint256 id)
    {
        _requireRole(msg.sender, access.SELLER_ROLE());
        if (buyer == address(0)) revert ZeroAddress();
        _requireRole(buyer, access.BUYER_ROLE());
        if (buyer == msg.sender) revert SellerIsBuyer();
        if (faceValue == 0 || faceValue % UNIT != 0) revert InvalidFaceValue();
        if (dueDate <= block.timestamp) revert DueDateNotInFuture();
        if (docHash == bytes32(0)) revert EmptyDocHash();
        if (receivableIdByDocHash[docHash] != 0) revert DocHashInUse();

        id = ++receivableCount;
        uint256 totalUnits = faceValue / UNIT;
        receivableIdByDocHash[docHash] = id;

        Receivable storage r = _receivables[id];
        r.seller = msg.sender;
        r.buyer = buyer;
        r.faceValue = faceValue;
        r.totalUnits = totalUnits;
        r.dueDate = dueDate;
        r.createdAt = uint64(block.timestamp);
        r.status = Status.Created;
        r.docHash = docHash;
        r.ref = ref;

        emit ReceivableCreated(id, msg.sender, buyer, faceValue, dueDate, docHash, ref);
        _mint(msg.sender, id, totalUnits, "");
    }

    /// @notice Sets the Verified tag. Investors see it, but listing and investing don't require it.
    /// @dev The tag can't be cleared, and verifying doesn't change the status.
    function verifyReceivable(uint256 id) external {
        Receivable storage r = _get(id);
        if (msg.sender != r.buyer) revert NotBuyer();
        _requireRole(msg.sender, access.BUYER_ROLE());
        if (r.status != Status.Created && r.status != Status.Listed && r.status != Status.Funded) {
            revert InvalidStatus(r.status);
        }
        if (block.timestamp >= r.dueDate) revert DueDatePassed();
        if (r.verified) revert AlreadyVerified();

        r.verified = true;
        emit ReceivableVerified(id, msg.sender);
    }

    /// @notice Lets the named buyer refuse an unverified receivable before any unit is sold.
    /// @dev Needs no role, so a buyer whose role was revoked can still refuse.
    function rejectReceivable(uint256 id) external {
        Receivable storage r = _get(id);
        if (msg.sender != r.buyer) revert NotBuyer();
        _requireUnsold(r);
        if (r.verified) revert AlreadyVerified();

        _close(id, r, Status.Rejected);
        emit ReceivableRejected(id);
    }

    /// @notice Lets the seller withdraw a receivable before any unit is sold, verified or not.
    function cancelReceivable(uint256 id) external {
        Receivable storage r = _get(id);
        if (msg.sender != r.seller) revert NotSeller();
        _requireUnsold(r);

        _close(id, r, Status.Cancelled);
        emit ReceivableCancelled(id);
    }

    /// @notice Returns a receivable. Reverts if the id doesn't exist.
    function getReceivable(uint256 id) external view returns (Receivable memory) {
        return _get(id);
    }

    /// @dev Every transfer passes through here, including batches and approved operators. Mints and
    /// burns have no `from` or `to`, so they pass. Only `invest` will move a seller's units (V3).
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values) internal override {
        if (from != address(0) && to != address(0)) {
            for (uint256 i = 0; i < ids.length; ++i) {
                if (_receivables[ids[i]].seller == from) revert UnitsLocked();
            }
        }
        super._update(from, to, ids, values);
    }

    /// @dev Ends a receivable that sold nothing: burns its units and frees the document for reuse.
    function _close(uint256 id, Receivable storage r, Status status) private {
        r.status = status;
        delete receivableIdByDocHash[r.docHash];
        _burn(r.seller, id, r.totalUnits);
    }

    function _get(uint256 id) private view returns (Receivable storage) {
        if (id == 0 || id > receivableCount) revert UnknownReceivable();
        return _receivables[id];
    }

    function _requireUnsold(Receivable storage r) private view {
        if (r.status != Status.Created && r.status != Status.Listed) revert InvalidStatus(r.status);
        if (r.unitsSold != 0) revert UnitsAlreadySold();
    }

    function _requireRole(address account, bytes32 role) private view {
        if (!access.hasRole(role, account)) revert NotAllowed(account, role);
    }
}
