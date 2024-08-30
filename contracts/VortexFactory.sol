// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "contracts/Staking.sol";
import "contracts/MyToken.sol";

contract MyFactory {

    uint256 public tokenCount = 0;
    uint256 public activeTokenCount = 0;
    uint256 public totalFees = 0;
    address public weth;
    address public deadAddress = 0x000000000000000000000000000000000000dEaD;
    INonfungiblePositionManager public positionManager;
    IUniswapV3Factory public uniswapFactory;
    ISwapRouter public swapRouter;
    ILocker public locker;
    address public owner;
    address payable public stakingAddress;
    address public lockerAddress;
    address nftAddress;
    uint256 totalWethCollected;
    address teamWallet;
    uint256 rewardAmount;
    address treasuryAddress;
    uint256 wethProvided = 0.00001 ether;
    uint256 public lockTime1 = 6; // 7 days
    uint256 public lockTime2 = 6; // 30 days

    // Struct where each token's details are saved
    struct TokenDetails {
        address tokenAddress;
        address poolAddress;
        address tokenCreator;
        uint256 timeStamp;
        uint256 tokenId;
        bool liquidityRemoved;
        uint256 zerofeedays;
        bool isInactive;
        uint256 feeFromSwap;
        uint256 lockId;
        bool isLocked;
        uint256 unlockTime;
        bool isDEAD;
        bool maxWalletEnabled;
    }

    TokenDetails[] public allTokens;

    mapping(uint256 => uint256) private tokenIndex; // Maps tokenId to index in allTokens array

    // Declaring Events
    event TokenDeployed(address indexed tokenAddress);
    event PoolCreated(address indexed token0, address indexed poolAddress);
    event PoolInitialized(address indexed poolAddress, uint160 sqrtPriceX96);
    event TokenApproved(address indexed tokenAddress, address indexed poolAddress);
    event LiquidityAdded(uint256 tokenId);
    event LiquidityRemoved(address indexed token, uint256 tokenId, uint256 amount0, uint256 amount1);
    event LiquidityAdditionFailed(address indexed token, address indexed pool, uint256 tokenAmount, uint256 wethAmount, string error);
    event FeesCollected(uint256 tokenId, uint256 amount0, uint256 amount1);
    event SwappedToWETH(address indexed token, uint256 amountIn, uint256 amountOut);
    event ZeroFeesDays(uint256 tokenId, bool isTokenDead);
    event ResetFeesDays(uint256 tokenId, bool isTokenDead);
    event TokensSwapped(uint256 amount);
    event VortexEvent(uint256 rewardAmount);
    
    // Functions with this modifier can only be called by the contract owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    // Functions with this modifier can only be called by the owner or the factory contract
    modifier onlyAuth() {
        require(msg.sender == owner || msg.sender == address(this), "Caller is not authorized");
        _;
    }

    constructor(address _positionManager, address _weth, address _uniswapFactory, address _swapRouter, address _lockerAddress, address _teamWallet) {
        positionManager = INonfungiblePositionManager(_positionManager);
        uniswapFactory = IUniswapV3Factory(_uniswapFactory);
        swapRouter = ISwapRouter(_swapRouter);
        locker = ILocker(_lockerAddress);
        nftAddress = _positionManager;
        weth = _weth;
        owner = msg.sender;  // Set the deployer as the owner
        lockerAddress = _lockerAddress;
        teamWallet = _teamWallet;
    }



    // Returns token details
    function getAllTokens() public view onlyOwner returns (address[] memory addresses, address[] memory tokenCreators, address[] memory poolAddresses, uint256[] memory tokenIds, uint256[] memory timestamps, bool[] memory liquidityRemovedStatus, uint256[] memory zerofeesdays, bool[] memory inactive, uint256[] memory feefromswap, uint256[] memory lockIds, bool[] memory isTokenLocked, uint256[] memory unlockTimes, bool[] memory isDead, bool[] memory maxWallet) {
    addresses = new address[](allTokens.length);
    poolAddresses = new address[](allTokens.length); 
    tokenCreators = new address[](allTokens.length); 
    tokenIds = new uint256[](allTokens.length);
    timestamps = new uint256[](allTokens.length);
    liquidityRemovedStatus = new bool[](allTokens.length);
    zerofeesdays = new uint256[](allTokens.length);
    inactive = new bool[](allTokens.length);
    feefromswap = new uint256[](allTokens.length);
    lockIds = new uint256[](allTokens.length);
    isTokenLocked = new bool[](allTokens.length);
    unlockTimes = new uint256[](allTokens.length);
    isDead = new bool[](allTokens.length);
    maxWallet = new bool[](allTokens.length);

    for (uint i = 0; i < allTokens.length; i++) {
        addresses[i] = allTokens[i].tokenAddress;
        poolAddresses[i] = allTokens[i].poolAddress;
        tokenCreators[i] = allTokens[i].tokenCreator;
        tokenIds[i] = allTokens[i].tokenId;
        timestamps[i] = allTokens[i].timeStamp;
        liquidityRemovedStatus[i] = allTokens[i].liquidityRemoved;
        zerofeesdays[i] = allTokens[i].zerofeedays;
        inactive[i] = allTokens[i].isInactive;
        feefromswap[i] = allTokens[i].feeFromSwap;
        lockIds[i] = allTokens[i].lockId;
        isTokenLocked[i] = allTokens[i].isLocked;
        unlockTimes[i] = allTokens[i].unlockTime;
        isDead[i] = allTokens[i].isDEAD;
        maxWallet[i] = allTokens[i].maxWalletEnabled;
    }
    return (addresses, poolAddresses, tokenCreators, tokenIds, timestamps, liquidityRemovedStatus, zerofeesdays, inactive, feefromswap, lockIds, isTokenLocked, unlockTimes, isDead, maxWallet);
}


    // Deploys a token with a given name, symbol and total supply
    function deployToken( string calldata _name, string calldata _symbol, uint256 _supply) external returns (address) {

        // The token is minted to the factory contract
        MyToken token = new MyToken(_name, _symbol, _supply, address(this)); 
        address tokenAddress = address(token);
        
        emit TokenDeployed(tokenAddress);
        
        return tokenAddress;
    }

    // Calls UniV3 function to create and initialize a pool of a given token 
     function createAndInitializePoolIfNecessary(
        address token0,
        address token1,
        uint160 sqrtPriceX96
    ) internal returns (address pool) {
        pool = positionManager.createAndInitializePoolIfNecessary(token0, token1, 10000, sqrtPriceX96);
        emit PoolCreated(token0, pool);
        return pool;
    }


    // Function to get the pool address for a pool that's already been created and initialized
    function get_Pool(address tokenA, address tokenB, uint24 fee) external view returns (address pool) {
        pool = uniswapFactory.getPool(tokenA, tokenB, fee);
    }


    // Fallback function to receive Ether
    fallback() external payable {
        
    }

    // Receive function to handle incoming Ether
    receive() external payable {
        
    }

    // Function to approve another contract or address to manage a specific token
    function approveToken(address token, address spender, uint256 amount) internal onlyAuth {
    require(IERC20(token).approve(spender, amount), "Approval failed");
}

    // Function to approve another contract or address to manage a specific NFT
    function approveNFT(uint256 tokenId, address spender) internal onlyAuth {
        IERC721(nftAddress).approve(spender, tokenId);
    }

    // Set Staking and Treasury addresses in the factory
    function setStakingAndTreasuryAddress(address payable _stakingAddress, address _treasuryAddress) external onlyOwner {
        stakingAddress = _stakingAddress;
        treasuryAddress = _treasuryAddress;
        
    }

    // Set locker address in the factory
    function setLockerAddress(address payable _lockerAddress) external onlyOwner {
        lockerAddress = _lockerAddress;        
    }
    
    // Swaps a specific amount of eth for tokens
    function swapETHforTokens (uint256 amountIn, address tokenAddress) public payable returns (uint256 amountOut) {

        // Approve the swap router to spend tokens
        approveToken(weth, address(swapRouter), amountIn);

        // Swap Parameters
        ISwapRouter.ExactInputSingleParams memory params =
            ISwapRouter.ExactInputSingleParams({
                tokenIn: weth,
                tokenOut: tokenAddress,
                fee: 10000,
                recipient: msg.sender,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        // The call to `exactInputSingle` executes the swap.
        amountOut = swapRouter.exactInputSingle{ value: msg.value }(params);
        emit TokensSwapped(amountOut);

        return amountOut;
    }


    // Swaps a specific amount of tokens for eth
    function swapTokensForWETH(uint256 amountIn, address tokenAddress) internal onlyOwner returns (uint256 amountOut) {
        
        require(amountIn > 0, "Amount must be greater than zero");

        // Approve the swap router to spend tokens
        approveToken(tokenAddress, address(swapRouter), amountIn);

        ISwapRouter.ExactInputSingleParams memory params =
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenAddress,
                tokenOut: weth,
                fee: 10000,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        // The call to `exactInputSingle` executes the swap.
        amountOut = swapRouter.exactInputSingle(params); 
        
        emit TokensSwapped(amountOut);
        return amountOut;
    }

    // Function to transfer WETH from the deployer to the factory contract
    function transferWETHToFactory(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than zero");

        // Check if the msg.sender has enough WETH balance
        uint256 senderBalance = IERC20(weth).balanceOf(msg.sender);
        require(senderBalance >= amount, "Insufficient WETH balance");

        // Approve the factory contract to spend WETH
        require(IERC20(weth).approve(address(this), amount), "Approval failed");

        // Transfer WETH from the owner to the factory contract
        require(IERC20(weth).transferFrom(msg.sender, address(this), amount), "Transfer failed");
    }


    // Function that adds the initial liquidity to each token 
    function addLiquidityLockSwap(address tokenAddress, uint256 amountToBuy) external payable returns (uint256 tokenId) {

     // Check if the factory contract has enough WETH
    uint256 wethBalance = IERC20(weth).balanceOf(address(this));
    uint256 tokenBalance = IERC20(tokenAddress).balanceOf(address(this));

    require(wethBalance >= wethProvided, "Not enough WETH in the factory contract");

    address token0;
    address token1;
    uint256 token0amount;
    uint256 token1amount;

    if (tokenAddress < weth) {
        token0 = tokenAddress;
        token1 = weth;
        token0amount = tokenBalance;
        token1amount = wethProvided;
    } else {
        token0 = weth;
        token1 = tokenAddress;
        token0amount = wethProvided;
        token1amount = tokenBalance;
    }

    // Calculate sqrtPriceX96 considering both tokens have 18 decimals 
    uint256 priceRatio = (token1amount * 1e18) / token0amount;
    uint256 sqrtPriceRatio = sqrt(priceRatio);
    uint160 sqrtPrice_X96 = uint160((sqrtPriceRatio * 2**96) / 1e9);

    // Create and Initialize Pool
    address poolAddress = createAndInitializePoolIfNecessary(token0, token1, sqrtPrice_X96);

    // Approve the position manager to spend tokens
    TransferHelper.safeApprove(token0, address(positionManager), token0amount);
    TransferHelper.safeApprove(token1, address(positionManager), token1amount);

    // Adding initial liquidity
    INonfungiblePositionManager.MintParams memory params =
            INonfungiblePositionManager.MintParams({
                token0: token0,
                token1: token1,
                fee: 10000,
                tickLower: -887200,
                tickUpper: 887200,
                amount0Desired: token0amount,
                amount1Desired: token1amount,
                amount0Min: 0,
                amount1Min: 0,
                recipient: address(this),
                deadline: block.timestamp + 5 minutes
            });
        
        (tokenId,,,) = positionManager.mint(params);

        // Approve the locker contract to manage the liquidity NFT
        IERC721(address(positionManager)).approve(lockerAddress, tokenId);

        uint256 duration = lockTime1; // Define the initial lock duration which equals the time the platform lends this liquidity

        // Lock the liquidity NFT
        uint256 lockID = ILocker(lockerAddress).lockLiquidity(address(positionManager), tokenId, duration, address(this));

    // Store the token details in the array
    allTokens.push(TokenDetails({
        tokenAddress: tokenAddress, 
        poolAddress: poolAddress,
        tokenCreator: msg.sender,  
        tokenId: tokenId,
        timeStamp: block.timestamp,
        liquidityRemoved: false,
        zerofeedays: 0,
        isInactive: false,
        feeFromSwap: 0,
        lockId: lockID,
        isLocked: true,
        unlockTime: block.timestamp + lockTime1,
        isDEAD: false,
        maxWalletEnabled: true
    }));

    // Save the index of the new token details in the mapping
    tokenIndex[tokenId] = allTokens.length - 1;

    // Save the token count
    tokenCount++;
    activeTokenCount++;

    // Set max wallet to 5%
    enableMaxWalletLimit(tokenAddress, tokenId);

    uint256 fee = 0;

    // If the user chooses to buy tokens when launching
    if(amountToBuy > 0){

        // Calculate 3% tax
        uint256 taxAmount = (amountToBuy * 3) / 100;

        // Update the amount to swap after tax
        uint256 amountToSwap = amountToBuy - taxAmount;

        // Transfer the tax to the specific wallet
        payable(teamWallet).transfer(taxAmount);

        approveToken(weth, address(swapRouter), amountToSwap);
        ISwapRouter.ExactInputSingleParams memory swapParams =
                    ISwapRouter.ExactInputSingleParams({
                tokenIn: weth,
                tokenOut: tokenAddress,
                fee: 10000,
                recipient: msg.sender,
                amountIn: amountToSwap,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });
        uint256 amountOut = swapRouter.exactInputSingle{ value: amountToSwap }(swapParams);
        emit TokensSwapped(amountOut);
        fee = amountToBuy * 1 / 100;
    }


    return tokenId;
    }


// Counts how many consecutive days with no volume (we will collect fees once per day)
function updateNoFeeDays(uint256 tokenId) internal { 

    uint256 index = tokenIndex[tokenId]; // Get the index from mapping

    if( allTokens[index].zerofeedays >= 1){ // When the count reaches 15 consecutive days the token is marked as innactive
        allTokens[index].isInactive = true;
    }

    emit ZeroFeesDays(tokenId, allTokens[index].isInactive);

    allTokens[index].zerofeedays++;
}

// If the token has volume, reset the count
function resetNoFeeDays(uint256 tokenId) internal { 

    uint256 index = tokenIndex[tokenId]; // Get the index from mapping
    allTokens[index].zerofeedays=0;

    emit ResetFeesDays(allTokens[index].zerofeedays, allTokens[index].isInactive );
    
}

    // Collect fees for all tokens that are locked
    function collectFromLockerAndSwap(uint256 tokenId, address tokenAddress) external onlyOwner {
        
        uint256 totalWethCollectedLocal = 0;
        rewardAmount = 0;
        uint256 index = tokenIndex[tokenId]; 

            // Collect fees from the locker
            (uint256 amount0, uint256 amount1) = ILocker(lockerAddress).collectFees(tokenId, address(this));
            emit FeesCollected(tokenId, amount0, amount1);

            // Determine token0 and token1
            address token0;
            address token1;

            if (tokenAddress < weth) {
                token0 = tokenAddress;
                token1 = weth;
                if (amount0 > 0) {
                    uint256 ethReceived = swapTokensForWETH(amount0, tokenAddress);
                    rewardAmount = ethReceived + amount1;
                    totalWethCollectedLocal += rewardAmount;

                    if (amount0 <= allTokens[index].feeFromSwap){
                    updateNoFeeDays(tokenId);}
                    else {
                    resetNoFeeDays(tokenId);}

                    // Save the fee generated by the factory swap
                    allTokens[index].feeFromSwap = amount0 * 1 / 100;
                    
                } else {
                    rewardAmount += amount1;
                    totalWethCollectedLocal += rewardAmount;
                    if(amount1 > 0){
                        resetNoFeeDays(tokenId);
                        } else {
                        updateNoFeeDays(tokenId);
                        }
                }
                    
            } else {
                token0 = weth;
                token1 = tokenAddress;
                if (amount1 > 0) {
                    uint256 ethReceived = swapTokensForWETH(amount1, tokenAddress);
                    rewardAmount = ethReceived + amount0;
                    totalWethCollectedLocal += rewardAmount;

                    if (amount1 <= allTokens[index].feeFromSwap){
                    updateNoFeeDays(tokenId);}
                    else {
                    resetNoFeeDays(tokenId);}

                    // Save the fee generated by the factory swap
                    allTokens[index].feeFromSwap = amount1 * 1 / 100;
                    
                } else{
                        rewardAmount += amount0;
                        totalWethCollectedLocal += rewardAmount;
                        if(amount0 > 0){
                        resetNoFeeDays(tokenId);
                        } else {
                        updateNoFeeDays(tokenId);
                        }
                }

            }

            emit VortexEvent(totalWethCollectedLocal);
            
           if (totalWethCollectedLocal > 0){

            uint256 devAmount = (totalWethCollectedLocal * 20) / 100;
            IWETH(weth).withdraw(devAmount);
        
            uint256 restAmount = (totalWethCollectedLocal * 80) / 100;
            address devAddress = allTokens[index].tokenCreator;
            // send a part of the fees to the token creator
            (bool sentToCreator, ) = devAddress.call{value: devAmount}("");
            require(sentToCreator, "Failed to send ETH to team wallet");
            distributeFees(restAmount);

           }
        
        totalWethCollected += totalWethCollectedLocal;
    }


    // Events to emit after successful payouts
    event RewardsSent(address indexed stakingAddress, uint256 amount);
    event TreasuryFunded(address indexed treasuryAddress, uint256 amount);
    event TeamFunded(address indexed teamWallet, uint256 amount);

    // Function to distribute the fees 
    function distributeFees(uint256 totalFeesCollected) internal {

    require(IERC20(weth).balanceOf(address(this)) >= totalFeesCollected, "Insuficient balance on the factory");

    // Unwrap WETH to ETH
    IWETH(weth).withdraw(totalFeesCollected);

    // Calculate distribution amounts
    uint256 stakersAmount = totalFeesCollected / 8 * 3;
    uint256 treasuryAmount = totalFeesCollected / 8 * 3;
    uint256 teamAmount = totalFeesCollected / 8 * 2;
    

    // Send to staking contract by calling addRewards function
    SimpleStaking(stakingAddress).addRewards{value: stakersAmount}();

    // Send to the treasury 
    (bool sentToTreasury, ) = treasuryAddress.call{value: treasuryAmount}("");
    require(sentToTreasury, "Failed to send ETH to treasury contract");

    // Send to the team 
    (bool sentToTeam, ) = teamWallet.call{value: teamAmount}("");
    require(sentToTeam, "Failed to send ETH to team wallet");

}

// Relock liquidity for 1 month
function relock(uint256 _tokenId, uint256 _lockID) external onlyAuth returns(uint256 lockID){

    uint256 index = tokenIndex[_tokenId];

    // Unlock first
    ILocker(lockerAddress).unlockLiquidity( _lockID, address(this));

    // Approve the locker to manage the NFT
    approveNFT(_tokenId, lockerAddress);

    uint256 _duration = lockTime2;
    
    lockID = ILocker(lockerAddress).lockLiquidity(address(positionManager), _tokenId, _duration, address(this));

    allTokens[index].lockId = lockID;
    allTokens[index].isLocked = true;
    allTokens[index].unlockTime = block.timestamp + lockTime2;
    
    return lockID;
}


// Save the lockID in the token struct
function storeLockID(uint256 tokenId, uint256 _lockId, bool locked, uint256 unlockDate) internal {

    uint256 index = tokenIndex[tokenId]; // Get the index from mapping
    allTokens[index].lockId = _lockId;
    allTokens[index].isLocked = locked;
    allTokens[index].unlockTime = unlockDate;

}


// Babylonian method for calculating the square root
function sqrt(uint256 y) internal pure returns (uint256 z) {
    if (y > 3) {
        z = y;
        uint256 x = y / 2 + 1;
        while (x < z) {
            z = x;
            x = (y / x + x) / 2;
        }
    } else if (y != 0) {
        z = 1;
    }
}


    // Function to remove liquidity
    function removeLiquidity(uint256 tokenId, uint128 liquidityToRemove) internal onlyOwner returns (uint256 collectedAmount0, uint256 collectedAmount1) {

        uint256 index = tokenIndex[tokenId]; 
        //require(!allTokens[index].liquidityRemoved, "Liquidity already removed");

        // Decrease liquidity
        positionManager.decreaseLiquidity(
            INonfungiblePositionManager.DecreaseLiquidityParams({
                tokenId: tokenId,
                liquidity: liquidityToRemove,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp
            }));

        // Collect the tokens from the position
        (collectedAmount0, collectedAmount1) = positionManager.collect(
            INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            }));

        allTokens[index].liquidityRemoved = true; // Update the liquidity removed status
        emit LiquidityRemoved(msg.sender, tokenId, collectedAmount0, collectedAmount1);

        tryToSendFunds();
        return (collectedAmount0, collectedAmount1);
         
    }

    // Function to remove the provided initial liquidity (one week after launch)
    function removeInitialLiquidity(uint256 tokenId, uint256 lockId) external onlyAuth {

        // If 7 days have passed since launch unlock the liquidity
        ILocker lockerContract = ILocker(lockerAddress);
        lockerContract.unlockLiquidity(lockId, address(this));

        // Provided amount of initial liquidity
        uint256 wethAmountToRemove = wethProvided; 

        // Store the lockId 
        storeLockID(tokenId, lockId, false, 0);

        // Fetch the position details
        (,, address token0, address token1, uint24 fee, , , uint128 liquidity, , , ,) = positionManager.positions(tokenId);

        // Determine the correct pool address
        address poolAddress = uniswapFactory.getPool(token0, token1, fee);

        // Fetch pool state (price, liquidity, etc.)
        IUniswapV3Pool poolContract = IUniswapV3Pool(poolAddress);
        (uint160 sqrtPriceX96,,,,,,) = poolContract.slot0();
        uint256 price = (uint256(sqrtPriceX96) ** 2 * 10 ** 18) / (2 ** 192);

        // Calculate the corresponding amount of tokens to remove
        uint256 tokensToRemove = (wethAmountToRemove * 10 ** 18) / price;

        // Calculate the liquidity to remove (SQRT)
        uint128 liquidityToRemove = uint128(sqrt(wethAmountToRemove * tokensToRemove));

        // Ensure liquidity to remove is not greater than the available liquidity
        uint128 liquidityToRemoveSafe = liquidityToRemove > liquidity ? liquidity : liquidityToRemove;

        // Remove liquidity
        (uint256 amount0, uint256 amount1) = removeLiquidity(tokenId, liquidityToRemoveSafe);

        // only swap if there is enough liquidity
        if(liquidity > liquidityToRemoveSafe){

        if(token0 == weth ){
            //swapTokensForWETH(amount1, token1);
            IERC20(token1).transfer(deadAddress, amount1);

        }

        else if(token1 == weth){
            //swapTokensForWETH(amount0, token0);
            IERC20(token0).transfer(deadAddress, amount0);
        } 

        }
        // Approve the locker to manage the NFT
        approveNFT(tokenId, lockerAddress);

        // Lock the liquidity again (now for 1 month)
        uint256 duration = lockTime2;
        uint256 newLockId = locker.lockLiquidity(address(positionManager), tokenId, duration, address(this));
        uint256 unlockDate = block.timestamp + lockTime2;

        // Store the lockId for each token
        storeLockID(tokenId, newLockId, true, unlockDate);

    }

    // Remove remaining liquidity when a token dies (no trading volume for 15 consecutive days)
    function removeDeadLiquidity(uint256 tokenId, uint256 lockId) external onlyOwner {

        // Unlock the liquidity
        ILocker lockercontract = ILocker(lockerAddress);
        lockercontract.unlockLiquidity(lockId, address(this));

        // Fetch the position details
        (, , address token0, address token1, , , , uint128 liquidity, , , ,) = positionManager.positions(tokenId);

        // Remove all remaining liquidity
        (uint256 amount0, uint256 amount1) = removeLiquidity(tokenId, liquidity);

            if(token0 == weth){

                // Approve the factory contract to spend WETH
                require(IERC20(token1).approve(address(this), amount1), "Approval failed");

                IERC20(token1).transferFrom(address(this), deadAddress, amount1);

            } else {

                // Approve the factory contract to spend WETH
                require(IERC20(token0).approve(address(this), amount0), "Approval failed");

                IERC20(token0).transferFrom(address(this), deadAddress, amount0);
            }

        uint256 index = tokenIndex[tokenId];
        activeTokenCount--;
        allTokens[index].isDEAD = true;

    }


    // Function to enable the max wallet limit at 5%
    function enableMaxWalletLimit(address tokenAddress, uint256 tokenId) internal {
        
        uint256 index = tokenIndex[tokenId];
        address pool_Address = allTokens[index].poolAddress;
        MyToken(tokenAddress).enableMaxWalletLimit(pool_Address);

    }

    // Function to get the platform metrics
    function getMetrics() external view returns(uint256 alltokens, uint256 allactivetokens, uint256 fees) {

        uint numberOfTokensLaunched = tokenCount;
        uint activeTokens = activeTokenCount;
        uint _fees = totalWethCollected;

        return (numberOfTokensLaunched, activeTokens, _fees);
    }


    // Function to collect fees
    function collectFees(uint256 token_Id) internal onlyAuth returns (uint256 amount0, uint256 amount1){
        INonfungiblePositionManager.CollectParams memory params =
            INonfungiblePositionManager.CollectParams({
                tokenId: token_Id,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            });

        (amount0, amount1) = positionManager.collect(params);

        emit FeesCollected(token_Id, amount0, amount1);

        return (amount0, amount1);
        
    }

    
    function callAddRewards (uint256 amount ) external payable onlyOwner {

        require(msg.value > 0, "No rewards to add");
        approveToken(weth, stakingAddress, amount);

        SimpleStaking(stakingAddress).addRewards{value: amount}();
        
    }


    uint256 public pendingFunds; 
    event FundsRequested(uint256 amountNeeded);
    event FundsSent(uint256 amount);

    //function called by the staking pool to ask factory for funds to process pending unstaking
    function notifyFundsNeeded(uint256 amount) external {
        require(msg.sender == stakingAddress, "Only staking contract can notify.");
        pendingFunds += amount;
        emit FundsRequested(amount);
        tryToSendFunds();
    }

    // if the factory has funds not being lended, sent to unstakers
    function tryToSendFunds() public {
        uint256 availableWETH = IERC20(weth).balanceOf(address(this));
            if (availableWETH >= pendingFunds && pendingFunds > 0) {
                IERC20(weth).transfer(stakingAddress, pendingFunds);
                ISimpleStaking(stakingAddress).notifyFundsReceived(pendingFunds);
                emit FundsSent(pendingFunds);
                pendingFunds = 0;
            }
    }

    //if factory has funds, and is requested by the staking pool 
    function provideFundsIfNeeded(address _stakingContract, uint256 amountRequested) public {
        uint256 availableWETH = IWETH(weth).balanceOf(address(this));
            if (availableWETH >= amountRequested) {
                IWETH(weth).transfer(_stakingContract, amountRequested);
                ISimpleStaking(payable(_stakingContract)).notifyFundsReceived(amountRequested);
            }
    }

}


interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface ISimpleStaking {
    function notifyFundsReceived(uint256 amount) external;
}

interface ILocker {
    function lockLiquidity(address _nftAddress, uint256 _tokenId, uint256 _duration, address factory) external returns (uint256 lockId);
    function unlockLiquidity(uint256 _lockId, address factory) external;
    function collectFees(uint256 tokenId, address factory) external returns(uint256 amount0, uint256 amount1);
}
