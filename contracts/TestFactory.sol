// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
//import "@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3SwapCallback.sol";




contract MyToken is ERC20 {
    constructor(string memory name, string memory symbol, uint256 totalSupply) ERC20(name, symbol) {
        _mint(msg.sender, totalSupply * 10**18);
    }
}

contract MyFactory {

    uint256 public tokenCount;
    INonfungiblePositionManager public positionManager;
    address public weth;
    IUniswapV3Factory public uniswapFactory;
    ISwapRouter public swapRouter; 
    address public owner;

    struct TokenDetails {
        address tokenAddress;
        uint256 timeStamp;
        uint256 tokenId;
        bool liquidityRemoved;
        uint256 zerofeedays;
        bool isTokenDEAD;
    }

    TokenDetails[] public allTokens;

    mapping(uint256 => uint256) private tokenIndex; // Maps tokenId to index in allTokens array

    
    event TokenDeployed(address indexed tokenAddress);
    event PoolCreated(address indexed token0, address indexed poolAddress);
    event PoolInitialized(address indexed poolAddress, uint160 sqrtPriceX96);
    event TokenApproved(address indexed tokenAddress, address indexed poolAddress);
    event LiquidityAdded(address indexed token, address indexed pool, uint256 tokenAmount, uint256 wethAmount, uint256 timestamp);
    event LiquidityRemoved(address indexed token, uint256 tokenId, uint256 amount0, uint256 amount1);
    event LiquidityAdditionFailed(address indexed token, address indexed pool, uint256 tokenAmount, uint256 wethAmount, string error);
    event FeesCollected(uint256 tokenId, uint256 amount0, uint256 amount1);
    event SwappedToWETH(address indexed token, uint256 amountIn, uint256 amountOut);
    event ZeroFeesDays(uint256 tokenId, bool isTokenDead);
    event ResetFeesDays(uint256 tokenId, bool isTokenDead);

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    constructor(address _positionManager, address _weth, address _uniswapFactory, address _swapRouter) {
        positionManager = INonfungiblePositionManager(_positionManager);
        weth = _weth;
        uniswapFactory = IUniswapV3Factory(_uniswapFactory);
        swapRouter = ISwapRouter(_swapRouter);
        owner = msg.sender;  // Set the deployer as the owner
    }
    


    // Method to get all token addresses
    function getAllTokens() public view returns (address[] memory addresses, uint256[] memory tokenIds, uint256[] memory timestamps, bool[] memory liquidityRemovedStatus, uint256[] memory zerofeesdays, bool[] memory isTokenDead) {
    addresses = new address[](allTokens.length);
    tokenIds = new uint256[](allTokens.length);
    timestamps = new uint256[](allTokens.length);
    liquidityRemovedStatus = new bool[](allTokens.length);
    zerofeesdays = new uint256[](allTokens.length);
    isTokenDead = new bool[](allTokens.length);

    for (uint i = 0; i < allTokens.length; i++) {
        addresses[i] = allTokens[i].tokenAddress;
        tokenIds[i] = allTokens[i].tokenId;
        timestamps[i] = allTokens[i].timeStamp;
        liquidityRemovedStatus[i] = allTokens[i].liquidityRemoved;
        zerofeesdays[i] = allTokens[i].zerofeedays;
        isTokenDead[i] = allTokens[i].isTokenDEAD;
    }

    return (addresses, tokenIds, timestamps, liquidityRemovedStatus, zerofeesdays, isTokenDead);
}

    function deployToken(
        string calldata _name,
        string calldata _symbol,
        uint256 _supply
    ) external returns (address) {
        MyToken token = new MyToken(_name, _symbol, _supply);
        address tokenAddress = address(token);
        
        emit TokenDeployed(tokenAddress);

        return tokenAddress;
    }


    function multicall(bytes[] calldata data) external payable returns (bytes[] memory results) {
        results = new bytes[](data.length);
        for (uint i = 0; i < data.length; i++) {
            (bool success, bytes memory result) = address(this).delegatecall(data[i]);
            require(success, "Transaction failed");
            results[i] = result;
        }
    }


     function createAndInitializePoolIfNecessary(
        address token0,
        address token1,
        uint160 sqrtPriceX96
    ) external returns (address pool) {
        pool = positionManager.createAndInitializePoolIfNecessary(token0, token1, 10000, sqrtPriceX96);
        emit PoolCreated(token0, pool);
    }


    // Function to get the pool address
    function get_Pool(address tokenA, address tokenB, uint24 fee) external view returns (address pool) {
        pool = uniswapFactory.getPool(tokenA, tokenB, fee);
    }


    // Fallback function to receive Ether
    fallback() external payable {
        // Handle received Ether if necessary
    }

    // Receive function to handle incoming Ether
    receive() external payable {
        // Handle received Ether
    }

    function approveToken(address token, address spender, uint256 amount) external {
    require(IERC20(token).approve(spender, amount), "Approval failed");
}

    // Function to approve another contract or address to manage a specific NFT
    function approveNFT(address nftAddress, uint256 tokenId, address spender) external {
        IERC721(nftAddress).approve(spender, tokenId);
    }
    

    function addInitialLiquidity(address _token0, address _token1, address tokenAddress, uint256 _token0Amount, uint256 _token1Amount) external returns (uint256 tokenId) {

    // Approve the position manager to spend tokens
    TransferHelper.safeApprove(_token0, address(positionManager), _token0Amount);
    TransferHelper.safeApprove(_token1, address(positionManager), _token1Amount);

    INonfungiblePositionManager.MintParams memory params =
            INonfungiblePositionManager.MintParams({
                token0: _token0,
                token1: _token1,
                fee: 10000,
                tickLower: -887200,
                tickUpper: 887200,
                amount0Desired: _token0Amount,
                amount1Desired: _token1Amount,
                amount0Min: 0,
                amount1Min: 0,
                recipient: address(this),
                deadline: block.timestamp + 5 minutes
            });

        (tokenId,,,) = positionManager.mint(params);

        // Store the token details in the array
    allTokens.push(TokenDetails({
        tokenAddress: tokenAddress,  // Storing _token0 as an example, store _token1 similarly if needed
        tokenId: tokenId,
        timeStamp: block.timestamp,
        liquidityRemoved: false,
        zerofeedays: 0,
        isTokenDEAD: false
    }));

    // Save the index of the new token details in the mapping
    tokenIndex[tokenId] = allTokens.length - 1;

    emit LiquidityAdded(_token0, address(positionManager), _token0Amount, _token1Amount, block.timestamp);
    return tokenId;
    }


function updateNoFeeDays(uint256 tokenId) external { 


    uint256 index = tokenIndex[tokenId]; // Get the index from mapping
    allTokens[index].zerofeedays++;

    if (allTokens[index].zerofeedays >= 3){

        allTokens[index].isTokenDEAD = true;

    }

    emit ZeroFeesDays(allTokens[index].zerofeedays, allTokens[index].isTokenDEAD );
    
}


function resetNoFeeDays(uint256 tokenId) external { 


    uint256 index = tokenIndex[tokenId]; // Get the index from mapping
    allTokens[index].zerofeedays=0;

    emit ResetFeesDays(allTokens[index].zerofeedays, allTokens[index].isTokenDEAD );
    
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


    function removeLiquidity(uint256 tokenId, uint128 liquidityToRemove, address tokenAddress) external onlyOwner {

        uint256 index = tokenIndex[tokenId]; // Get the index from mapping
        require(!allTokens[index].liquidityRemoved, "Liquidity already removed");

        // Decrease liquidity
        (uint256 amount0, uint256 amount1) = positionManager.decreaseLiquidity(
            INonfungiblePositionManager.DecreaseLiquidityParams({
                tokenId: tokenId,
                liquidity: liquidityToRemove,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp
            })
        );

        // Collect the tokens from the position
        (uint256 collectedAmount0, uint256 collectedAmount1) = positionManager.collect(
            INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );

        allTokens[index].liquidityRemoved = true; // Update the liquidity removed status
        emit LiquidityRemoved(msg.sender, tokenId, collectedAmount0, collectedAmount1);
    }


    function getPosition(uint256 tokenId) external view returns (
    uint96 nonce,
    address operator,
    address token0,
    address token1,
    uint24 fee,
    int24 tickLower,
    int24 tickUpper,
    uint128 liquidity,
    uint256 feeGrowthInside0LastX128,
    uint256 feeGrowthInside1LastX128,
    uint128 tokensOwed0,
    uint128 tokensOwed1
) {
    return positionManager.positions(tokenId);
}


function collectFees(uint256 tokenId) external onlyOwner {
        INonfungiblePositionManager.CollectParams memory params =
            INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            });

        (uint256 amount0, uint256 amount1) = positionManager.collect(params);

        emit FeesCollected(tokenId, amount0, amount1);
    }


}


interface IWETH {
    function deposit() external payable;
    function deposit(uint256 amount) external payable;
    function withdraw(uint256 amount) external;
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function balanceOf(address owner) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}
