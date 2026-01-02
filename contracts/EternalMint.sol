// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EternalMint is ERC721, ERC721URIStorage, Ownable {
    
    uint256 private _nextTokenId; // Contador manual

    IERC20 public immutable burnToken;
    address public accessNFT; // Changed to generic address to support casting
    uint256 public mintPrice;

    event MintedEternal(address indexed minter, uint256 indexed tokenId);
    event PriceUpdated(uint256 newPrice);
    event AccessNFTUpdated(address indexed newAccessNFT);

    constructor(address _burnTokenAddress, uint256 _initialMintPrice) 
        ERC721("EternalMint", "ETRNL") 
        Ownable(msg.sender) 
    {
        require(_burnTokenAddress != address(0), "Invalid token address");
        burnToken = IERC20(_burnTokenAddress);
        mintPrice = _initialMintPrice;
        _nextTokenId = 1; 
    }

    function setAccessNFT(address _accessNFT) external onlyOwner {
        accessNFT = _accessNFT;
        emit AccessNFTUpdated(_accessNFT);
    }

    function burnAndMint(string calldata tokenURIContent) external {
        require(bytes(tokenURIContent).length > 0, "Data cannot be empty");
        
        bool isFree = false;
        if (accessNFT != address(0)) {
            // Check ERC-1155 Balance (ID 1)
            try IERC1155(accessNFT).balanceOf(msg.sender, 1) returns (uint256 balance) {
                if (balance > 0) isFree = true;
            } catch { isFree = false; }
        }

        if (!isFree && mintPrice > 0) {
            bool success = burnToken.transferFrom(msg.sender, address(0x000000000000000000000000000000000000dEaD), mintPrice);
            require(success, "Token burn failed");
        }

        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURIContent);

        emit MintedEternal(msg.sender, tokenId);
    }

    function setMintPrice(uint256 _newPrice) external onlyOwner {
        mintPrice = _newPrice;
        emit PriceUpdated(_newPrice);
    }

    // Overrides
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
