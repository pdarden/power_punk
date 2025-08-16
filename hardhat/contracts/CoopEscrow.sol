// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title CoopEscrow
/// @notice Minimal, trust-minimized escrow for a single project (PYUSD or any ERC-20).
/// - Parameters are locked at deploy (token, beneficiary, goal, deadline).
/// - Only creator can finalize and specify final amount to beneficiary.
/// - Final amount must be >= goal amount to finalize successfully.
/// - Remaining funds are distributed back to contributors proportionally.
/// - If goal not met, contributors can claim full refunds.
contract CoopEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // -------- Events --------
    event Initialized(
        address indexed creator,
        address indexed token,
        address indexed beneficiary,
        uint256 goal,
        uint64 deadline,
        uint256 minContribution
    );
    event Contributed(
        address indexed contributor,
        uint256 amount,
        uint256 totalAfter
    );
    event Finalized(bool success, uint256 finalAmount, uint256 totalRaised);
    event Refunded(address indexed user, uint256 amount);

    // -------- Errors --------
    error InvalidParams();
    error AlreadyClosed();
    error PastDeadline();
    error NotCreator();
    error NotClosed();
    error SuccessNoRefund();
    error NoDeposit();
    error BelowMinimum();
    error ExceedsTotal();
    error BelowGoal();

    // -------- Immutable configuration (set at deploy) --------
    IERC20 public immutable token; // e.g., PYUSD ERC-20
    address public immutable creator; // deployer for reference
    address public immutable beneficiary; // where funds go if success
    uint256 public immutable goal; // token units (handle decimals in UI)
    uint64 public immutable deadline; // unix seconds (project end)
    uint256 public immutable minContribution; // minimum contribution amount (0 = no minimum)

    // -------- State --------
    bool public closed; // set true in finalize()
    bool public success; // true if finalized with beneficiary amount >= goal
    uint256 public total; // aggregate contributed
    uint256 public finalAmount; // amount sent to beneficiary (set during finalization)
    uint256 public refundPool; // remaining amount available for proportional refunds
    mapping(address => uint256) public deposits; // contributor -> original amount
    mapping(address => bool) public refundClaimed; // contributor -> has claimed refund

    constructor(
        address _token,
        address _beneficiary,
        uint256 _goal,
        uint64 _deadline,
        uint256 _minContribution,
        uint256 _creatorContribution
    ) payable {
        if (_token == address(0) || _beneficiary == address(0))
            revert InvalidParams();
        if (_goal == 0 || _deadline <= block.timestamp) revert InvalidParams();
        if (
            _minContribution > 0 &&
            _creatorContribution > 0 &&
            _creatorContribution < _minContribution
        ) revert InvalidParams();

        token = IERC20(_token);
        beneficiary = _beneficiary;
        goal = _goal;
        deadline = _deadline;
        minContribution = _minContribution;
        creator = msg.sender;

        // Handle creator contribution if provided
        if (_creatorContribution > 0) {
            token.safeTransferFrom(
                msg.sender,
                address(this),
                _creatorContribution
            );
            deposits[msg.sender] = _creatorContribution;
            total = _creatorContribution;
            emit Contributed(msg.sender, _creatorContribution, total);
        }

        emit Initialized(
            msg.sender,
            _token,
            _beneficiary,
            _goal,
            _deadline,
            _minContribution
        );
    }

    /// @notice Contribute tokens (e.g., PYUSD). Requires prior approve().
    function contribute(uint256 amount) external nonReentrant {
        if (closed) revert AlreadyClosed();
        if (block.timestamp > deadline) revert PastDeadline();
        if (amount == 0) revert InvalidParams();
        if (minContribution > 0 && amount < minContribution)
            revert BelowMinimum();

        token.safeTransferFrom(msg.sender, address(this), amount);
        deposits[msg.sender] += amount;
        total += amount;

        emit Contributed(msg.sender, amount, total);
    }

    /// @notice Only creator can finalize and specify the final amount to send to beneficiary.
    /// @param _finalAmount Amount to send to beneficiary (must be >= goal and <= total raised)
    function finalize(uint256 _finalAmount) external nonReentrant {
        if (msg.sender != creator) revert NotCreator();
        if (closed) revert AlreadyClosed();
        if (_finalAmount > total) revert ExceedsTotal();
        if (_finalAmount < goal) revert BelowGoal();

        closed = true;
        finalAmount = _finalAmount;
        success = true; // Always true since _finalAmount >= goal

        token.safeTransfer(beneficiary, _finalAmount);

        // Calculate refund pool (remaining funds for contributors)
        refundPool = total - _finalAmount;

        emit Finalized(success, _finalAmount, total);
    }

    /// @notice Contributors can claim their proportional refund after successful finalization.
    /// Refund = (user_contribution / total_raised) * refund_pool
    function claimRefund() external nonReentrant {
        if (!closed) revert NotClosed();
        if (!success) revert(); // Use old refund logic for failed projects
        if (refundClaimed[msg.sender]) revert NoDeposit();

        uint256 userDeposit = deposits[msg.sender];
        if (userDeposit == 0) revert NoDeposit();

        refundClaimed[msg.sender] = true;

        // Calculate proportional refund from excess funds
        uint256 refundAmount = 0;
        if (refundPool > 0 && total > 0) {
            refundAmount = (userDeposit * refundPool) / total;
        }

        if (refundAmount > 0) {
            token.safeTransfer(msg.sender, refundAmount);
            emit Refunded(msg.sender, refundAmount);
        }
    }

    /// @notice Contributors can reclaim their full deposits if project was not successfully finalized.
    function refund() external nonReentrant {
        if (!closed) revert NotClosed();
        if (success) revert SuccessNoRefund();

        uint256 amt = deposits[msg.sender];
        if (amt == 0) revert NoDeposit();

        deposits[msg.sender] = 0;
        token.safeTransfer(msg.sender, amt);
        emit Refunded(msg.sender, amt);
    }

    // -------- Convenience views (nice for the Phoenix UI) --------

    function depositedOf(address user) external view returns (uint256) {
        return deposits[user];
    }

    function isOpen() external view returns (bool) {
        return !closed && block.timestamp <= deadline;
    }

    function canFinalize() external view returns (bool) {
        return !closed && msg.sender == creator && total >= goal;
    }

    function getMinContribution() external view returns (uint256) {
        return minContribution;
    }

    /// @notice Calculate the refund amount for a specific user after successful finalization
    function calculateRefund(address user) external view returns (uint256) {
        if (!closed || !success || refundClaimed[user] || deposits[user] == 0) {
            return 0;
        }

        if (refundPool == 0 || total == 0) {
            return 0;
        }

        return (deposits[user] * refundPool) / total;
    }

    /// @notice Get refund status for a user
    function getRefundStatus(
        address user
    )
        external
        view
        returns (bool hasClaimed, uint256 refundAmount, uint256 originalDeposit)
    {
        originalDeposit = deposits[user];

        if (success) {
            // Successful project - proportional refund from excess
            hasClaimed = refundClaimed[user];
            refundAmount = hasClaimed ? 0 : this.calculateRefund(user);
        } else {
            // Failed project - full refund available
            hasClaimed = (originalDeposit == 0); // If deposit is 0, already refunded
            refundAmount = hasClaimed ? 0 : originalDeposit;
        }
    }

    // Reject accidental ETH
    receive() external payable {
        revert();
    }

    fallback() external payable {
        revert();
    }
}
