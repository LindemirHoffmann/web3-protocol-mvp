// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IPriceOracle {
    function getLatestPrice() external view returns (int256);
}

contract Staking is Ownable, ReentrancyGuard {
    IERC20 public immutable stakingToken;
    IPriceOracle public immutable oracle;

    uint256 public baseRewardRatePerSecond;
    uint256 public totalStaked;

    struct StakeInfo {
        uint256 amount;
        uint256 rewards;
        uint256 lastUpdate;
    }

    mapping(address => StakeInfo) public stakes;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);
    event RewardRateUpdated(uint256 newRate);

    constructor(
        address tokenAddress,
        address oracleAddress,
        uint256 rewardRate
    ) Ownable(msg.sender) {
        stakingToken = IERC20(tokenAddress);
        oracle = IPriceOracle(oracleAddress);
        baseRewardRatePerSecond = rewardRate;
    }

    function setBaseRewardRate(uint256 newRate) external onlyOwner {
        baseRewardRatePerSecond = newRate;
        emit RewardRateUpdated(newRate);
    }

    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");

        _updateRewards(msg.sender);

        require(
            stakingToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        stakes[msg.sender].amount += amount;
        totalStaked += amount;

        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        StakeInfo storage user = stakes[msg.sender];

        require(amount > 0, "Amount must be > 0");
        require(user.amount >= amount, "Insufficient staked amount");

        _updateRewards(msg.sender);

        user.amount -= amount;
        totalStaked -= amount;

        require(
            stakingToken.transfer(msg.sender, amount),
            "Transfer failed"
        );

        emit Unstaked(msg.sender, amount);
    }

    function unstake(uint256 amount) external nonReentrant {
        StakeInfo storage user = stakes[msg.sender];

        require(amount > 0, "Amount must be > 0");
        require(user.amount >= amount, "Insufficient staked amount");

        _updateRewards(msg.sender);

        user.amount -= amount;
        totalStaked -= amount;

        require(
            stakingToken.transfer(msg.sender, amount),
            "Transfer failed"
        );

        emit Unstaked(msg.sender, amount);
    }

    function claimReward() external nonReentrant {
        _updateRewards(msg.sender);

        uint256 reward = stakes[msg.sender].rewards;
        require(reward > 0, "No rewards available");

        stakes[msg.sender].rewards = 0;

        require(
            stakingToken.transfer(msg.sender, reward),
            "Reward transfer failed"
        );

        emit RewardClaimed(msg.sender, reward);
    }

    function pendingReward(address userAddress) public view returns (uint256) {
        StakeInfo memory user = stakes[userAddress];

        if (user.amount == 0) {
            return user.rewards;
        }

        uint256 elapsed = block.timestamp - user.lastUpdate;
        uint256 dynamicRate = _getDynamicRewardRate();
        uint256 accrued = (user.amount * dynamicRate * elapsed) / 1e18;

        return user.rewards + accrued;
    }

    function earned(address account) external view returns (uint256) {
        return pendingReward(account);
    }

    function stakedBalance(address account) external view returns (uint256) {
        return stakes[account].amount;
    }

    function getStakeInfo(
        address account
    )
        external
        view
        returns (
            uint256 amount,
            uint256 rewards,
            uint256 lastUpdate
        )
    {
        StakeInfo memory user = stakes[account];
        return (user.amount, pendingReward(account), user.lastUpdate);
    }

    function _updateRewards(address userAddress) internal {
        StakeInfo storage user = stakes[userAddress];

        if (user.amount > 0) {
            uint256 elapsed = block.timestamp - user.lastUpdate;
            uint256 dynamicRate = _getDynamicRewardRate();
            uint256 accrued = (user.amount * dynamicRate * elapsed) / 1e18;
            user.rewards += accrued;
        }

        user.lastUpdate = block.timestamp;
    }

    function _getDynamicRewardRate() internal view returns (uint256) {
        int256 price = oracle.getLatestPrice();
        require(price > 0, "Invalid oracle price");

        uint256 ethPrice = uint256(price);

        if (ethPrice >= 3000e8) {
            return baseRewardRatePerSecond * 2;
        } else if (ethPrice >= 2000e8) {
            return (baseRewardRatePerSecond * 15) / 10;
        }

        return baseRewardRatePerSecond;
    }
}