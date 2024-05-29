// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TMDToken is ERC20, Ownable, ERC20Permit {
    uint256 public burnedAmount;
    uint256 public claimedAmount;

    constructor()
        Ownable(msg.sender)
        ERC20("TMDToken", "TMD")
        ERC20Permit("TMDToken")
    {}

    function transferContractOwnership(address newOwner) public onlyOwner {
        transferOwnership(newOwner);
    }

    function burn(uint256 amount) public onlyOwner {
        _burn(_msgSender(), amount);
        burnedAmount += amount;
    }

    function claim(uint256 amount) public {
        require(
            balanceOf(_msgSender()) >= amount,
            "Not enough tokens to claim"
        );
        _burn(_msgSender(), amount);
        claimedAmount += amount;
    }

    function reward(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
