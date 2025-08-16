// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title GrassrootsCrowdfunding
 * @dev A crowdfunding contract for climate and community solutions
 * @notice Supports funding goals with reward mechanisms for contributors
 * 
 * Funding Categories: Solar microgrids, batteries, parks, HVAC systems, 
 * tree planting, electrification equipment, bitcoin mining kits, GPU infrastructure
 */
contract GrassrootsCrowdfunding is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    /// @notice USDC token contract address (Base network)
    IERC20 public immutable usdcToken;
    
    /// @notice Project funding goal in USDC (6 decimals)
    uint256 public immutable fundingGoal;
    
    /// @notice Cost per unit in USDC
    uint256 public immutable unitCost;
    
    /// @notice Cost savings per unit when goal exceeded (optional)
    uint256 public immutable costSavingsPerUnit;
    
    /// @notice Project deadline timestamp
    uint256 public immutable deadline;
    
    /// @notice Total amount raised
    uint256 public totalRaised;
    
    /// @notice Whether the project has been finalized
    bool public isFinalized;
    
    /// @notice Whether refunds have been processed
    bool public refundsProcessed;

    // ============ Structs ============

    struct Contributor {
        uint256 amount;           // Total contribution amount
        address referrer;         // Optional referrer address
        bool hasContributed;      // Whether this address has contributed
        bool rewardClaimed;       // Whether reward has been claimed
    }

    // ============ Mappings ============

    /// @notice Mapping of contributor address to their contribution details
    mapping(address => Contributor) public contributors;
    
    /// @notice Array of all contributor addresses for iteration
    address[] public contributorList;
    
    /// @notice Count of referrals made by each address
    mapping(address => uint256) public referralCounts;

    // ============ Events ============

    /// @notice Emitted when the project is created
    event ProjectCreated(
        address indexed owner,
        uint256 fundingGoal,
        uint256 unitCost,
        uint256 costSavingsPerUnit,
        uint256 deadline
    );
    
    /// @notice Emitted when a contribution is made
    event ContributionMade(
        address indexed contributor,
        uint256 amount,
        address indexed referrer,
        uint256 totalRaised
    );
    
    /// @notice Emitted when contributors are set via off-chain calculation
    event ContributorsSet(
        address[] contributors,
        uint256[] amounts
    );
    
    /// @notice Emitted when project is successfully funded
    event ProjectFunded(
        uint256 totalRaised,
        uint256 ownerPayout,
        uint256 totalRewards
    );
    
    /// @notice Emitted when rewards are distributed
    event RewardsDistributed(
        address[] recipients,
        uint256[] amounts
    );
    
    /// @notice Emitted when refunds are processed
    event RefundsProcessed(
        uint256 totalRefunded,
        uint256 contributorCount
    );
    
    /// @notice Emitted when individual refund is claimed
    event RefundClaimed(
        address indexed contributor,
        uint256 amount
    );

    // ============ Errors ============

    error ProjectExpired();
    error ProjectNotExpired();
    error FundingGoalReached();
    error FundingGoalNotReached();
    error AlreadyFinalized();
    error RefundsAlreadyProcessed();
    error NoContribution();
    error RewardAlreadyClaimed();
    error InvalidArrayLength();
    error ZeroAmount();
    error TransferFailed();

    // ============ Constructor ============

    /**
     * @dev Initialize the crowdfunding project
     * @param _usdcToken USDC token contract address
     * @param _fundingGoal Target funding amount in USDC
     * @param _unitCost Cost per unit in USDC
     * @param _costSavingsPerUnit Cost savings per unit (for reward calculation)
     * @param _deadline Project deadline timestamp
     * @param _initialContribution Optional initial contribution from owner
     */
    constructor(
        address _usdcToken,
        uint256 _fundingGoal,
        uint256 _unitCost,
        uint256 _costSavingsPerUnit,
        uint256 _deadline,
        uint256 _initialContribution
    ) {
        require(_usdcToken != address(0), "Invalid USDC address");
        require(_fundingGoal > 0, "Funding goal must be positive");
        require(_unitCost > 0, "Unit cost must be positive");
        require(_deadline > block.timestamp, "Deadline must be in future");

        usdcToken = IERC20(_usdcToken);
        fundingGoal = _fundingGoal;
        unitCost = _unitCost;
        costSavingsPerUnit = _costSavingsPerUnit;
        deadline = _deadline;

        // Handle initial contribution from owner
        if (_initialContribution > 0) {
            usdcToken.safeTransferFrom(msg.sender, address(this), _initialContribution);
            _addContribution(msg.sender, _initialContribution, address(0));
        }

        emit ProjectCreated(
            msg.sender,
            _fundingGoal,
            _unitCost,
            _costSavingsPerUnit,
            _deadline
        );
    }

    // ============ External Functions ============

    /**
     * @notice Contribute USDC to the project
     * @param _amount Amount of USDC to contribute
     * @param _referrer Optional referrer address
     */
    function contribute(uint256 _amount, address _referrer) external nonReentrant {
        if (block.timestamp >= deadline) revert ProjectExpired();
        if (totalRaised >= fundingGoal) revert FundingGoalReached();
        if (_amount == 0) revert ZeroAmount();

        // Transfer USDC from contributor to contract
        usdcToken.safeTransferFrom(msg.sender, address(this), _amount);

        // Add contribution
        _addContribution(msg.sender, _amount, _referrer);
    }

    /**
     * @notice Set contributors and amounts (for off-chain calculations)
     * @dev Only owner can call this function
     * @param _contributors Array of contributor addresses
     * @param _amounts Array of contribution amounts
     */
    function setContributors(
        address[] calldata _contributors,
        uint256[] calldata _amounts
    ) external onlyOwner {
        if (_contributors.length != _amounts.length) revert InvalidArrayLength();
        if (isFinalized) revert AlreadyFinalized();

        for (uint256 i = 0; i < _contributors.length; i++) {
            if (_amounts[i] > 0) {
                _addContribution(_contributors[i], _amounts[i], address(0));
            }
        }

        emit ContributorsSet(_contributors, _amounts);
    }

    /**
     * @notice Calculate rewards for all contributors
     * @return contributorAddresses Array of contributor addresses
     * @return rewardAmounts Array of corresponding reward amounts
     */
    function calculateRewards() 
        external 
        view 
        returns (address[] memory contributorAddresses, uint256[] memory rewardAmounts) 
    {
        if (totalRaised <= fundingGoal) {
            // No rewards if goal not exceeded
            return (new address[](0), new uint256[](0));
        }

        uint256 contributorCount = contributorList.length;
        contributorAddresses = new address[](contributorCount);
        rewardAmounts = new uint256[](contributorCount);

        // Calculate total rewards pool
        uint256 excessFunding = totalRaised - fundingGoal;
        uint256 savingsRewards = (excessFunding * costSavingsPerUnit) / 2;
        
        // Calculate total referrals
        uint256 totalReferrals = 0;
        for (uint256 i = 0; i < contributorCount; i++) {
            totalReferrals += referralCounts[contributorList[i]];
        }
        
        uint256 referralRewards = (totalReferrals * unitCost * 5) / 10000; // 0.0005 * unitCost
        uint256 totalRewardsPool = savingsRewards + referralRewards;

        // Distribute rewards proportionally
        for (uint256 i = 0; i < contributorCount; i++) {
            address contributor = contributorList[i];
            contributorAddresses[i] = contributor;
            
            if (totalRaised > 0) {
                // Base reward proportional to contribution
                uint256 baseReward = (savingsRewards * contributors[contributor].amount) / totalRaised;
                
                // Referral bonus
                uint256 referralBonus = 0;
                if (totalReferrals > 0) {
                    referralBonus = (referralRewards * referralCounts[contributor]) / totalReferrals;
                }
                
                rewardAmounts[i] = baseReward + referralBonus;
            }
        }

        return (contributorAddresses, rewardAmounts);
    }

    /**
     * @notice Execute payout to owner and distribute rewards to contributors
     * @dev Can only be called after deadline if funding goal is met or exceeded
     */
    function payout() external nonReentrant {
        if (block.timestamp < deadline) revert ProjectNotExpired();
        if (totalRaised < fundingGoal) revert FundingGoalNotReached();
        if (isFinalized) revert AlreadyFinalized();

        isFinalized = true;

        if (totalRaised == fundingGoal) {
            // Exact goal: all funds to owner
            usdcToken.safeTransfer(owner(), totalRaised);
            emit ProjectFunded(totalRaised, totalRaised, 0);
        } else {
            // Goal exceeded: calculate and distribute rewards
            (address[] memory contributorAddresses, uint256[] memory rewardAmounts) = this.calculateRewards();
            
            uint256 totalRewards = 0;
            for (uint256 i = 0; i < rewardAmounts.length; i++) {
                totalRewards += rewardAmounts[i];
            }

            // Transfer rewards to contributors
            for (uint256 i = 0; i < contributorAddresses.length; i++) {
                if (rewardAmounts[i] > 0) {
                    usdcToken.safeTransfer(contributorAddresses[i], rewardAmounts[i]);
                    contributors[contributorAddresses[i]].rewardClaimed = true;
                }
            }

            // Transfer remaining funds to owner
            uint256 ownerPayout = totalRaised - totalRewards;
            if (ownerPayout > 0) {
                usdcToken.safeTransfer(owner(), ownerPayout);
            }

            emit ProjectFunded(totalRaised, ownerPayout, totalRewards);
            emit RewardsDistributed(contributorAddresses, rewardAmounts);
        }
    }

    /**
     * @notice Refund all contributors if funding goal not met
     * @dev Can only be called after deadline if funding goal not reached
     */
    function refundAll() external nonReentrant {
        if (block.timestamp < deadline) revert ProjectNotExpired();
        if (totalRaised >= fundingGoal) revert FundingGoalReached();
        if (refundsProcessed) revert RefundsAlreadyProcessed();

        refundsProcessed = true;
        uint256 totalRefunded = 0;
        uint256 contributorCount = contributorList.length;

        // Refund all contributors including owner
        for (uint256 i = 0; i < contributorCount; i++) {
            address contributor = contributorList[i];
            uint256 refundAmount = contributors[contributor].amount;
            
            if (refundAmount > 0) {
                usdcToken.safeTransfer(contributor, refundAmount);
                totalRefunded += refundAmount;
            }
        }

        emit RefundsProcessed(totalRefunded, contributorCount);
    }

    // ============ External Reward & Refund Functions ============

    /**
     * @notice Claim individual reward for contributors (if rewards pool exists, not yet claimed)
     * @dev Contributors can call this after project is finalized & rewards exist
     */
    function claimReward() external nonReentrant {
        if (!isFinalized) revert AlreadyFinalized();
        if (totalRaised <= fundingGoal) revert FundingGoalNotReached();
        Contributor storage c = contributors[msg.sender];
        if (!c.hasContributed) revert NoContribution();
        if (c.rewardClaimed) revert RewardAlreadyClaimed();
        // Must re-calculate rewards to get accurate value
        (address[] memory contributorAddresses, uint256[] memory rewardAmounts) = this.calculateRewards();
        uint256 idx = contributorList.length;
        for (uint256 i = 0; i < contributorList.length; i++) {
            if (contributorAddresses[i] == msg.sender) {
                idx = i;
                break;
            }
        }
        require(idx < contributorList.length, "Reward not found");
        uint256 reward = rewardAmounts[idx];
        require(reward > 0, "No reward available");
        c.rewardClaimed = true;
        usdcToken.safeTransfer(msg.sender, reward);
        emit RewardsDistributed(contributorAddresses, rewardAmounts);
    }

    /**
     * @notice Claim refund for a contributor (if refund period is reached and not processed in bulk)
     */
    function claimRefund() external nonReentrant {
        if (block.timestamp < deadline) revert ProjectNotExpired();
        if (totalRaised >= fundingGoal) revert FundingGoalReached();
        if (refundsProcessed) revert RefundsAlreadyProcessed();
        Contributor storage c = contributors[msg.sender];
        uint256 refundAmount = c.amount;
        if (refundAmount == 0) revert NoContribution();
        c.amount = 0;
        usdcToken.safeTransfer(msg.sender, refundAmount);
        emit RefundClaimed(msg.sender, refundAmount);
    }

    /**
     * @notice Owner can withdraw stray ERC20 tokens accidentally sent (except USDC used for crowdfunding)
     */
    function withdrawERC20(address token, uint256 amount) external onlyOwner {
        require(token != address(usdcToken), "Cannot withdraw project funds");
        IERC20(token).safeTransfer(owner(), amount);
    }

    // ============ View Functions ============

    /**
     * @notice Get contributor details
     * @param _contributor Address of the contributor
     * @return amount Total contribution amount
     * @return referrer Referrer address
     * @return hasContributed Whether has contributed
     * @return rewardClaimed Whether reward has been claimed
     */
    function getContributor(address _contributor) 
        external 
        view 
        returns (
            uint256 amount,
            address referrer,
            bool hasContributed,
            bool rewardClaimed
        ) 
    {
        Contributor memory c = contributors[_contributor];
        return (c.amount, c.referrer, c.hasContributed, c.rewardClaimed);
    }

    /**
     * @notice Get total number of contributors
     * @return Number of unique contributors
     */
    function getContributorCount() external view returns (uint256) {
        return contributorList.length;
    }

    /**
     * @notice Get all contributor addresses
     * @return Array of contributor addresses
     */
    function getAllContributors() external view returns (address[] memory) {
        return contributorList;
    }

    /**
     * @notice Check if project has reached its deadline
     * @return True if past deadline
     */
    function isExpired() external view returns (bool) {
        return block.timestamp >= deadline;
    }

    /**
     * @notice Check if funding goal has been reached
     * @return True if goal reached or exceeded
     */
    function isGoalReached() external view returns (bool) {
        return totalRaised >= fundingGoal;
    }

    /**
     * @notice Get project status summary
     * @return _totalRaised Current total raised
     * @return _fundingGoal Target funding goal
     * @return _deadline Project deadline
     * @return _isExpired Whether project is expired
     * @return _isGoalReached Whether goal is reached
     * @return _isFinalized Whether project is finalized
     */
    function getProjectStatus() 
        external 
        view 
        returns (
            uint256 _totalRaised,
            uint256 _fundingGoal,
            uint256 _deadline,
            bool _isExpired,
            bool _isGoalReached,
            bool _isFinalized
        ) 
    {
        return (
            totalRaised,
            fundingGoal,
            deadline,
            block.timestamp >= deadline,
            totalRaised >= fundingGoal,
            isFinalized
        );
    }

    // ============ Internal Functions ============

    /**
     * @dev Internal function to add a contribution
     * @param _contributor Address of the contributor
     * @param _amount Amount contributed
     * @param _referrer Optional referrer address
     */
    function _addContribution(
        address _contributor,
        uint256 _amount,
        address _referrer
    ) internal {
        // Update total raised
        totalRaised += _amount;

        // Update contributor data
        if (!contributors[_contributor].hasContributed) {
            contributors[_contributor].hasContributed = true;
            contributorList.push(_contributor);
        }
        
        contributors[_contributor].amount += _amount;
        
        // Set referrer only if not already set and not self-referral
        if (_referrer != address(0) && 
            _referrer != _contributor && 
            contributors[_contributor].referrer == address(0)) {
            contributors[_contributor].referrer = _referrer;
            referralCounts[_referrer]++;
        }

        emit ContributionMade(_contributor, _amount, _referrer, totalRaised);
    }
}