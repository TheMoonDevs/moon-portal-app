// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TMDToken is ERC20, Ownable, ERC20Permit {
    uint256 public burnedAmount;
    uint256 public claimedAmount;
    // Private variable to control if tokens can be claimed
    bool private isClaimable;

    constructor()
        Ownable(msg.sender)
        ERC20("TMDToken", "TMD")
        ERC20Permit("TMDToken")
    {
        // By default, the token claim is not allowed
        isClaimable = false;
    }

    // Getter for isClaimable
    function getIsClaimable() public view returns (bool) {
        return isClaimable;
    }

    // Setter for isClaimable - only owner can set it
    function setIsClaimable(bool _isClaimable) public onlyOwner {
        isClaimable = _isClaimable;
    }

    function transferContractOwnership(address newOwner) public onlyOwner {
        transferOwnership(newOwner);
    }

    function burn(uint256 amount) public onlyOwner {
        _burn(_msgSender(), amount);
        burnedAmount += amount;
    }

    function claim(uint256 amount) public {
        require(isClaimable, "Token claims are not allowed at this time");
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
