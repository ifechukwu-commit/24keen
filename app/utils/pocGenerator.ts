export function generateFoundryPoC(signal: any): string {
  const name = signal.category?.replace(/[^a-zA-Z]/g, '') || 'Exploit'

  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";

// Import the vulnerable contract
// import "../src/YourContract.sol";

contract Attacker_${name} {
    address public target;
    bool private attacked;

    constructor(address _target) {
        target = _target;
    }

    // Entry point for the exploit
    function exploit() external {
        // ATTACK CHAIN:
        // ${signal.attackChain || 'See signal details'}

        // TODO: Implement the attack based on the chain above

        // EVIDENCE:
        // ${signal.evidence || 'See vulnerable code'}
    }

    receive() external payable {
        if (!attacked) {
            attacked = true;

            // Re-enter here if this is a reentrancy exploit
        }
    }
}

contract ${name}Test is Test {
    address public target;
    address public attacker;

    function setUp() public {
        // Fork:
        // vm.createSelectFork("mainnet", BLOCK_NUMBER);

        // Deploy or use existing contract address from scope

        attacker = address(
            new Attacker_${name}(target)
        );

        vm.deal(attacker, 10 ether);
        vm.label(attacker, "Attacker");
    }

    function testExploit_${name}() public {
        uint256 balanceBefore = address(attacker).balance;

        vm.startPrank(attacker);

        // Execute the exploit
        Attacker_${name}(payable(attacker)).exploit();

        vm.stopPrank();

        // Assert the attack succeeded
        // assertGt(
        //     address(attacker).balance,
        //     balanceBefore,
        //     "Exploit failed"
        // );

        // HUMAN VERIFICATION:
        // ${signal.humanVerification || 'Verify manually'}
    }
}
`
}