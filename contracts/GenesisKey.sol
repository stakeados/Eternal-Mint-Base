// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title GenesisKey
 * @author EternalMint
 * @notice The limited edition Access Key for the EternalMint ecosystem.
 * @dev ERC1155 token that requires burning $Stakeados to mint. 
 *      Supply capped at 500 (450 Public / 50 Reserve).
 */
contract GenesisKey is ERC1155, Ownable {
    using Strings for uint256;

    // Constants
    uint256 public constant GENESIS_KEY_ID = 1;
    uint256 public constant MAX_SUPPLY = 500;
    uint256 public constant RESERVED_SUPPLY = 50;
    
    // Immutable variables
    IERC20 public immutable burnToken;
    uint256 public immutable mintPrice;

    // State variables
    uint256 public totalSupply;
    uint256 public mintedPublic;
    uint256 public mintedReserved;
    
    // Metadata URI (On-Chain Base64)
    string private _contractURI;

    // Events
    event KeyMinted(address indexed to, uint256 quantity);
    event KeyGifted(address indexed to, uint256 quantity);

    constructor(
        address _burnToken, 
        uint256 _priceInWei, // 100000 * 1e18
        address _initialOwner
    ) ERC1155("") Ownable(_initialOwner) {
        burnToken = IERC20(_burnToken);
        mintPrice = _priceInWei;
    }

    /**
     * @notice Mints a Genesis Key by burning tokens.
     * @dev User must approve the contract to spend/burn their tokens first.
     */
    function mint() external {
        require(totalSupply + 1 <= MAX_SUPPLY, "Max supply reached");
        require(mintedPublic + 1 <= MAX_SUPPLY - RESERVED_SUPPLY, "Public allocation sold out");
        
        // Burn tokens
        bool success = burnToken.transferFrom(msg.sender, address(0x000000000000000000000000000000000000dEaD), mintPrice);
        require(success, "Token burn failed");

        // Mint Key
        _mint(msg.sender, GENESIS_KEY_ID, 1, "");
        
        totalSupply++;
        mintedPublic++;
        
        emit KeyMinted(msg.sender, 1);
    }

    /**
     * @notice Admin function to gift keys from the reserved supply.
     */
    function adminGift(address to, uint256 quantity) external onlyOwner {
        require(totalSupply + quantity <= MAX_SUPPLY, "Exceeds max supply");
        require(mintedReserved + quantity <= RESERVED_SUPPLY, "Exceeds reserved supply");
        
        _mint(to, GENESIS_KEY_ID, quantity, "");
        
        totalSupply += quantity;
        mintedReserved += quantity;
        
        emit KeyGifted(to, quantity);
    }

    /**
     * @notice Sets the URI for the metadata (On-Chain Base64).
     * @dev Use this to upload the huge base64 string after deployment transparently.
     */
    function setURI(string memory newuri) external onlyOwner {
        _setURI(newuri);
        _contractURI = newuri;
    }

    /**
     * @notice Override uri to strictly return the single metadata string for ID 1.
     */
    function uri(uint256 /* id */) public view override returns (string memory) {
        return _contractURI;
    }

    function contractURI() public view returns (string memory) {
        return _contractURI;
    }
}
