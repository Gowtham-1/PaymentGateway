# Session Key Architecture — Smart Wallet Auto-Pay System
> Technical Design Document for GPS91 Payment Gateway
> Date: 2026-03-31

---

## 1. The Problem We Are Solving

Right now, every single payment requires the user to physically scan their fingerprint.
This is secure, but creates friction for repeated, low-value, or pre-approved payments.

**Goal:** Allow the user to authenticate ONCE with their Passkey, and then the wallet
automatically approves qualifying transactions without additional biometric prompts —
until certain safety conditions are violated.

---

## 2. What Is a Session Key?

A **Session Key** is a temporary, disposable cryptographic key pair generated in the
user's browser at the moment they scan their fingerprint.

Think of it like this:

```
┌─────────────────────────────────────────────────────────┐
│  PASSKEY (Permanent)                                    │
│  ├── Lives in device Secure Enclave (FaceID/TouchID)    │
│  ├── Cannot be exported or copied                       │
│  ├── Is the ROOT owner of the Smart Wallet              │
│  └── Signs the "master authorization"                   │
│                                                         │
│  SESSION KEY (Temporary)                                │
│  ├── Generated in browser JavaScript (ephemeral)        │
│  ├── Authorized BY the Passkey                          │
│  ├── Has strict rules attached (limits, expiry, scope)  │
│  ├── Can sign transactions WITHOUT triggering biometric │
│  └── Self-destructs when rules are violated             │
└─────────────────────────────────────────────────────────┘
```

**Analogy:**
- The Passkey is like your **Master Hotel Key Card** — it opens every door.
- The Session Key is like a **Pool Wristband** — it only lets you into the pool,
  only until 6 PM, and only if you're a checked-in guest.

---

## 3. How Session Keys Work (Step by Step)

### Phase 1: User Authenticates (Fingerprint Scan)

```
User opens app
    → Taps "Pay with Smart Wallet"
    → Device triggers biometric prompt (FaceID / Fingerprint)
    → Passkey in Secure Enclave signs an authorization message
```

At this moment, the Passkey doesn't just sign the payment.
Instead, it signs a **Session Key Authorization Payload**:

```json
{
  "sessionPublicKey": "0xABC123...",
  "validAfter": 1711900000,
  "validUntil": 1711903600,
  "permissions": {
    "allowedMerchants": ["0xRapidoAddress", "0xSwiggyAddress"],
    "maxPerTransaction": "50000000",
    "maxTotalSpend": "200000000",
    "allowedTokens": ["0xUSDC", "0x0000...ETH"],
    "allowedContract": "0xF346...PaymentGateway"
  }
}
```

The Smart Wallet stores this on-chain (or validates it in the UserOp signature).

### Phase 2: Session Key Takes Over (No More Fingerprints)

Now, for the NEXT payment that comes in:

```
Merchant sends payment request ($12 for a Rapido ride)
    → Widget receives the request
    → Widget checks: "Do I have a valid Session Key?"
    → YES: Session Key is valid, merchant is whitelisted, amount is under limit
    → Session Key signs the UserOperation directly
    → No biometric popup. No friction. Instant payment.
```

### Phase 3: Session Key Gets Invalidated

The Session Key STOPS working when ANY of these conditions trigger:

```
┌────────────────────────────────────┬────────────────────────────┐
│ CONDITION                          │ WHAT HAPPENS               │
├────────────────────────────────────┼────────────────────────────┤
│ Time expired (e.g., 1 hour)        │ Session Key rejected       │
│ Total spend exceeded ($200)        │ Session Key rejected       │
│ Single tx too large ($50+)         │ Session Key rejected       │
│ Unknown merchant address           │ Session Key rejected       │
│ User explicitly logs out           │ Session Key destroyed      │
│ New device / IP detected           │ Session Key rejected       │
│ Suspicious velocity (5 txs/min)    │ Session Key rejected       │
└────────────────────────────────────┴────────────────────────────┘

When rejected → User must scan fingerprint again → New Session Key issued.
```

---

## 4. Where Session Keys Live in Our Architecture

### 4.1 Smart Contract Layer (On-Chain Enforcement)

Our `gateway.sol` needs a **Session Key Validator Module**.

```
PaymentGateway.sol (existing)
    │
    ├── processERC20Payment()     ← already built
    ├── processNativePayment()    ← already built
    ├── backendSigner verification ← already built
    │
    └── NEW: SessionKeyValidator
        ├── registerSessionKey(publicKey, rules, passkeySignature)
        ├── validateSessionKey(publicKey, merchant, amount)
        ├── revokeSessionKey(publicKey)
        └── isSessionValid(publicKey) → bool
```

The on-chain validator ensures that even if a malicious actor intercepts
the session key, they CANNOT exceed the rules baked into the blockchain.

### 4.2 Smart Account Module (ERC-4337 Level)

In the ERC-4337 ecosystem, session keys are implemented as **Validation Modules**
on the Smart Account itself (not just on our gateway).

```
Safe Smart Account (User's Wallet)
    │
    ├── Owner Module: Passkey (WebAuthn) ← already configured
    │
    └── NEW: Session Key Module
        ├── Installed when user first authenticates
        ├── Stores active session key + permission rules
        ├── validateUserOp() checks:
        │   1. Is this signed by a valid session key?
        │   2. Are permissions satisfied?
        │   3. Has session expired?
        │   4. Is spend within budget?
        └── If all pass → UserOp is valid (no passkey needed)
```

### 4.3 Frontend Layer (Browser)

```
Browser (PayInvoice.tsx / Widget)
    │
    ├── On first auth:
    │   ├── Generate ephemeral keypair (session key)
    │   ├── Ask Passkey to sign authorization
    │   ├── Store session private key in sessionStorage
    │   └── Register session public key on Smart Account
    │
    ├── On subsequent payments:
    │   ├── Check: is session key still in sessionStorage?
    │   ├── Check: are permission rules still valid? (time, spend)
    │   ├── If valid → sign UserOp with session key (no biometric)
    │   └── If invalid → trigger Passkey again → new session key
    │
    └── On logout / tab close:
        └── sessionStorage auto-clears → session key destroyed
```

---

## 5. The Two Approaches We Can Take

### Approach A: On-Chain Session Keys (Maximum Security)

```
Security:    ★★★★★
Complexity:  ★★★★☆
Gas Cost:    Higher (rules enforced on-chain)
```

- Session key rules are stored ON the blockchain inside the Smart Account.
- Even if someone steals the session key from the browser, the blockchain
  itself rejects any transaction that violates the rules.
- Used by: Biconomy, ZeroDev, Rhinestone

**Best for:** High-value payments, enterprise merchants, regulatory compliance.

### Approach B: Off-Chain Session Keys with Backend Validation (Practical)

```
Security:    ★★★★☆
Complexity:  ★★★☆☆
Gas Cost:    Lower (rules enforced by backend + gateway contract)
```

- Session key lives only in the browser.
- Our `gateway-backend` validates the session rules before co-signing.
- The backend REFUSES to generate its signature if session rules are violated.
- The smart contract still requires backend signature → so unauthorized
  payments are impossible even with a stolen session key.

**Best for:** Micropayments, ride-sharing, food delivery, gaming.

### Recommended: Hybrid (Approach A + B)

- **Backend validates rules in real-time** (fast, flexible, updatable).
- **Smart Contract enforces hard limits** (trustless safety net).
- If the backend is compromised, the on-chain limits still protect the user.
- If the on-chain module is bypassed, the backend refuses to co-sign.

---

## 6. Session Key Lifecycle (Visual)

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│   [User opens app]                                               │
│        │                                                         │
│        ▼                                                         │
│   [Merchant requests $12 payment]                                │
│        │                                                         │
│        ▼                                                         │
│   ┌─────────────────────────┐                                    │
│   │ Does session key exist? │                                    │
│   └────────┬────────────────┘                                    │
│            │                                                     │
│     NO ◄───┴───► YES                                             │
│      │              │                                            │
│      ▼              ▼                                            │
│   [Scan          ┌──────────────────────┐                        │
│   Fingerprint]   │ Is session valid?    │                        │
│      │           │ • Not expired?       │                        │
│      │           │ • Spend under limit? │                        │
│      │           │ • Merchant allowed?  │                        │
│      │           └────────┬─────────────┘                        │
│      │                    │                                      │
│      │             NO ◄───┴───► YES                              │
│      │              │              │                             │
│      │              ▼              ▼                             │
│      │           [Scan         [Session Key                     │
│      │           Fingerprint]   signs UserOp]                   │
│      │              │              │                             │
│      ▼              ▼              │                             │
│   [Passkey signs session auth]     │                             │
│      │                             │                             │
│      ▼                             │                             │
│   [New Session Key generated]      │                             │
│      │                             │                             │
│      ▼                             ▼                             │
│   [Session Key signs UserOp] ◄─────┘                             │
│      │                                                           │
│      ▼                                                           │
│   [Backend validates + co-signs]                                 │
│      │                                                           │
│      ▼                                                           │
│   [Bundler submits to blockchain]                                │
│      │                                                           │
│      ▼                                                           │
│   [Payment executed on Hoodi]                                    │
│      │                                                           │
│      ▼                                                           │
│   [Merchant receives callback ✅]                                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 7. What We Already Have vs. What We Need to Build

```
┌──────────────────────────────────────┬──────────┬──────────────────────┐
│ COMPONENT                            │ STATUS   │ NOTES                │
├──────────────────────────────────────┼──────────┼──────────────────────┤
│ Passkey Authentication (WebAuthn)     │ ✅ DONE  │ FaceID/Fingerprint   │
│ Smart Wallet Creation (ERC-4337)     │ ✅ DONE  │ Safe + Pimlico       │
│ Payment Gateway Contract             │ ✅ DONE  │ Deployed on Hoodi    │
│ Backend Signature Verification       │ ✅ DONE  │ ECDSA co-signing     │
│ Reentrancy + Replay Protection       │ ✅ DONE  │ On-chain guards      │
│ Non-Custodial Fund Routing           │ ✅ DONE  │ Direct to merchant   │
│ Cloudflare Tunnel Deployment         │ ✅ DONE  │ Live on public URLs  │
│ Docker Containerization              │ ✅ DONE  │ Full stack            │
├──────────────────────────────────────┼──────────┼──────────────────────┤
│ Session Key Generation (Browser)     │ 🔲 TODO  │ Ephemeral keypair    │
│ Session Key Authorization (Passkey)  │ 🔲 TODO  │ Passkey signs scope  │
│ Session Key Validator (Smart Contract)│ 🔲 TODO │ On-chain rule engine │
│ Session Key Storage (sessionStorage) │ 🔲 TODO  │ Browser-side         │
│ Spend Tracking (per-session)         │ 🔲 TODO  │ Cumulative counter   │
│ Time-Based Expiry Logic              │ 🔲 TODO  │ validUntil timestamp │
│ Merchant Whitelist Enforcement       │ 🔲 TODO  │ On-chain mapping     │
│ Auto-Pay Widget (Embeddable)         │ 🔲 TODO  │ SDK for 3rd parties  │
│ Risk/Velocity Engine                 │ 🔲 TODO  │ Backend middleware   │
│ Public Merchant API / SDK            │ 🔲 TODO  │ REST + JS SDK        │
└──────────────────────────────────────┴──────────┴──────────────────────┘
```

---

## 8. Implementation Priority (Recommended Order)

### Phase 1: Core Session Keys (Enables Auto-Pay)
1. Browser-side ephemeral key generation
2. Passkey authorization of session key
3. Smart Contract session key validator module
4. Frontend logic: "use session key if valid, else prompt passkey"

### Phase 2: Rule Engine (Enables Safety)
5. Time-based expiry (validAfter / validUntil)
6. Per-transaction spend cap
7. Total session spend cap
8. Merchant whitelist

### Phase 3: Merchant SDK (Enables Global Adoption)
9. Public REST API for payment intent creation
10. Embeddable JavaScript widget (like Stripe.js)
11. Merchant dashboard for analytics
12. Webhook callbacks for payment status

### Phase 4: Advanced Security (Enterprise Grade)
13. Velocity-based risk detection
14. Device fingerprinting
15. ZK-based session proofs
16. Multi-device passkey sync

---

## 9. Key Design Decisions

### Q: Where should the session key private key be stored?
**A:** `sessionStorage` (not `localStorage`).
- `sessionStorage` auto-clears when the tab closes → natural session termination.
- `localStorage` persists forever → security risk if device is shared.

### Q: What if the user clears their browser mid-session?
**A:** Session key is destroyed. Next payment triggers a fresh Passkey scan.
No funds are at risk because the session key alone cannot bypass on-chain rules.

### Q: What if an attacker steals the session key from browser memory?
**A:** The session key is useless without BOTH:
1. The backend co-signature (attacker doesn't have the server private key)
2. The on-chain permission rules (attacker can't exceed spend limits)

### Q: Can merchants set their own session rules?
**A:** Yes. When a merchant registers via the SDK, they can define:
- Max auto-pay amount
- Session duration
- Required re-auth threshold
These get encoded into the session key authorization payload.

---

## 10. Summary

The Session Key system transforms our payment gateway from a
"scan fingerprint every time" system into a "scan once, pay seamlessly" system.

The beauty of our architecture is that we already have the hardest parts built:
- The Passkey root of trust
- The ERC-4337 smart wallet infrastructure
- The backend co-signing mechanism
- The on-chain gateway contract

Session Keys are the BRIDGE between these components that unlocks the
frictionless auto-pay experience described in the Rapido use case.

---

*Document Version: 1.0*
*Author: GPS91 Engineering*
*Network: Hoodi Testnet (Chain ID: 560048)*
*Gateway Contract: 0xF3464f9Add507619Fa49d52Fb035cD2D5EA2AB7E*
