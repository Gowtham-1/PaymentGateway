// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract PaymentGateway is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // The authorized backend signer wallet
    address public backendSigner;

    // Track processed payments to prevent replay attacks on already-completed invoices
    mapping(bytes32 => bool) public processedPayments;

    // Emitted when an ERC20 payment is successfully processed
    event PaymentReceivedERC20(
        string indexed paymentId,
        address indexed from,
        address indexed merchant,
        address token,
        uint256 amount
    );
    
    // Emitted when a Native token (ETH/BNB) payment is successfully processed
    event PaymentReceivedNative(
        string indexed paymentId,
        address indexed from,
        address indexed merchant,
        uint256 amount
    );

    constructor(address _backendSigner) {
        require(_backendSigner != address(0), "Gateway: Invalid backend signer");
        backendSigner = _backendSigner;
    }

    /**
     * @dev Process an ERC20 payment for a specific cart/paymentId.
     * Routes funds directly to the merchant. Reentrancy and replay guarded.
     * Confined to Smart Contract Wallets only.
     */
    function processERC20Payment(
        string calldata paymentId,
        address token,
        address merchant,
        uint256 amount,
        bytes calldata signature
    ) external nonReentrant {
        // Enforce that the Caller is a Smart Contract (Smart Wallet) and not a normal EOA
        require(msg.sender.code.length > 0, "Gateway: Only Smart Wallets allowed");
        require(merchant != address(0), "Gateway: Invalid merchant address");
        require(amount > 0, "Gateway: Amount must be greater than zero");

        // --- BACKEND SIGNATURE VERIFICATION ---
        // Payload: paymentId (string), token, merchant, amount
        bytes32 messageHash = keccak256(abi.encodePacked(paymentId, token, merchant, amount));
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        require(
            ECDSA.recover(ethSignedMessageHash, signature) == backendSigner,
            "Gateway: Invalid backend signature"
        );

        // Compute hash of the plaintext paymentId to fit in mapping storage efficiently (Replay Protection)
        bytes32 paymentHash = keccak256(bytes(paymentId));
        require(!processedPayments[paymentHash], "Gateway: Payment ID already processed (Replay Attack blocked)");
        
        // Follows the proper Checks-Effects-Interactions pattern
        processedPayments[paymentHash] = true;

        // Use SafeERC20 to protect against non-standard token implementations (e.g. USDT)
        IERC20(token).safeTransferFrom(msg.sender, merchant, amount);

        emit PaymentReceivedERC20(paymentId, msg.sender, merchant, token, amount);
    }

    /**
     * @dev Process a Native cryptocurrency payment for a specific cart/paymentId.
     * Forwarded directly to the merchant. Reentrancy and replay guarded.
     * Confined to Smart Contract Wallets only.
     */
    function processNativePayment(
        string calldata paymentId,
        address merchant,
        bytes calldata signature
    ) external payable nonReentrant {
        // Enforce that the Caller is a Smart Contract (Smart Wallet) and not a normal EOA
        require(msg.sender.code.length > 0, "Gateway: Only Smart Wallets allowed");
        require(merchant != address(0), "Gateway: Invalid merchant address");
        require(msg.value > 0, "Gateway: Need native tokens to process");

        // --- BACKEND SIGNATURE VERIFICATION ---
        // Payload: paymentId (string), token (address(0) for native), merchant, amount (msg.value)
        bytes32 messageHash = keccak256(abi.encodePacked(paymentId, address(0), merchant, msg.value));
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        require(
            ECDSA.recover(ethSignedMessageHash, signature) == backendSigner,
            "Gateway: Invalid backend signature"
        );

        // Compute hash of the plaintext paymentId to fit in mapping storage efficiently (Replay Protection)
        bytes32 paymentHash = keccak256(bytes(paymentId));
        require(!processedPayments[paymentHash], "Gateway: Payment ID already processed (Replay Attack blocked)");
        
        // Follows the proper Checks-Effects-Interactions pattern
        processedPayments[paymentHash] = true;

        // Safely forward ETH to the merchant (Non-Reentrant modifier naturally prevents recursion here)
        (bool success, ) = merchant.call{value: msg.value}("");
        require(success, "Gateway: Native token transfer failed");

        emit PaymentReceivedNative(paymentId, msg.sender, merchant, msg.value);
    }
}
