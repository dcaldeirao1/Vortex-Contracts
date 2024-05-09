// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

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


        // Add initial liquidity to the pool
        //addInitialLiquidity(_token, poolAddress);

        return poolAddress;
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


    function addInitialLiquidity(address _token, address _pool) external {

    // Transfer tokens to position manager
    TransferHelper.safeTransfer(_token, address(positionManager), tokenAmount);
    TransferHelper.safeTransfer(weth, address(positionManager), wethAmount);

    emit TokenApproved(_token, _pool);

    IWETH(weth).deposit{value: wethAmount}();
    IWETH(weth).approve(address(positionManager), wethAmount);
    
    // Log the parameters before attempting to mint
    emit LiquidityAdded(_token, _pool, tokenAmount, wethAmount);

    positionManager.mint(
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
            recipient: _pool, // Use the provided pool address
            deadline: block.timestamp + 300
        })
    );
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
