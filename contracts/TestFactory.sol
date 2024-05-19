// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";




contract MyToken is ERC20 {
    constructor(string memory name, string memory symbol, uint256 totalSupply) ERC20(name, symbol) {
        _mint(msg.sender, totalSupply * 10**18);
    }
}

contract MyFactory {
    address[] public tokens;
    uint256 public tokenCount;
    INonfungiblePositionManager public positionManager;
    address public weth;
    IUniswapV3Factory public uniswapFactory;
    
    event TokenDeployed(address indexed tokenAddress);
    
    event PoolCreated(address indexed tokenAddress, address indexed poolAddress);

    event PoolInitialized(address indexed poolAddress, uint160 sqrtPriceX96);
    

    event TokenApproved(address indexed tokenAddress, address indexed poolAddress);

    event LiquidityAdded(address indexed token, address indexed pool, uint256 tokenAmount, uint256 wethAmount);
    event LiquidityAdditionFailed(address indexed token, address indexed pool, uint256 tokenAmount, uint256 wethAmount, string error);


    constructor(address _positionManager, address _weth, address _uniswapFactory) {
        positionManager = INonfungiblePositionManager(_positionManager);
        weth = _weth;
        uniswapFactory = IUniswapV3Factory(_uniswapFactory);
    }

    function deployToken(
        string calldata _name,
        string calldata _symbol,
        uint256 _supply
    ) external returns (address) {
        MyToken token = new MyToken(_name, _symbol, _supply);
        address tokenAddress = address(token);
        
        tokens.push(tokenAddress);
        tokenCount++;
        emit TokenDeployed(tokenAddress);

        return tokenAddress;
    }

    function createPoolForToken(address _token) external returns (address poolAddress) {
    //require(tokenExists(_token), "Token does not exist");

    poolAddress = uniswapFactory.getPool(_token, weth, 3000);
    if (poolAddress == address(0)) {
        poolAddress = uniswapFactory.createPool(_token, weth, 3000);
        emit PoolCreated(_token, poolAddress);
    }

        return poolAddress;
    }


    function initializePool(address poolAddress, uint160 sqrtPriceX96) external {
        IUniswapV3Pool(poolAddress).initialize(sqrtPriceX96);
        emit PoolInitialized(poolAddress, sqrtPriceX96);
    }


    function tokenExists(address _token) internal view returns (bool) {
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == _token) {
                return true;
            }
        }
        return false;
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

    function calculateSqrtPriceX96(uint256 price) public pure returns (uint160) {
        // Calculate the square root of the price and multiply by 2^96
        // In Solidity, the sqrt can be calculated using Babylonian method
        uint256 sqrtPrice = sqrt(price);
        return uint160(sqrtPrice * 2**96 / 1e18);
    }

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

    

    function addInitialLiquidity(address _token, address _pool, address factory_addy) external {


    uint256 tokenAmount = 30000 * 10**18;
    uint256 wethAmount = 1 * 10**18; 
    uint256 wethAmountInWei = 0.1 * 10**18; // Assuming you want to add 0.1 ETH to liquidity

    emit TokenApproved(_token, _pool);

    require(IERC20(_token).balanceOf(address(this)) >= tokenAmount, "Not enough token balance");
    require(IERC20(weth).balanceOf(address(this)) >= wethAmount, "Not enough WETH balance");

    // Approve the position manager to pull the token and WETH from this contract
    //IERC20(_token).approve(address(positionManager), tokenAmount);
    //IERC20(weth).approve(address(positionManager), wethAmount);

    // Transfer tokens to position manager
    //TransferHelper.safeTransferFrom(_token, factory_addy, address(positionManager), tokenAmount);
    //TransferHelper.safeTransferFrom(weth, factory_addy, address(positionManager), wethAmount);

    // Approve the position manager to spend tokens
    TransferHelper.safeApprove(_token, address(positionManager), tokenAmount);
    TransferHelper.safeApprove(weth, address(positionManager), wethAmount);

    
    // Log the parameters before attempting to mint
    emit LiquidityAdded(_token, _pool, tokenAmount, wethAmount);

    try positionManager.mint(
            INonfungiblePositionManager.MintParams({
                token0: _token,
                token1: weth,
                fee: 3000,
                tickLower: -887220,
                tickUpper: 887220,
                amount0Desired: tokenAmount,
                amount1Desired: wethAmount,
                amount0Min: 0,
                amount1Min: 0,
                recipient: factory_addy,
                deadline: block.timestamp + 5 minutes
            })
        ) returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1) {
            emit LiquidityAdded(_token, address(positionManager), tokenAmount, wethAmount);
        } catch Error(string memory reason) {
            emit LiquidityAdditionFailed(_token, address(positionManager), tokenAmount, wethAmount, reason);
        } catch (bytes memory lowLevelData) {
            emit LiquidityAdditionFailed(_token, address(positionManager), tokenAmount, wethAmount, "Low-level error");
        }
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
