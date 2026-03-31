# Session Keys: Do We Actually Need Them?
> Honest Justification Analysis for GPS91 Payment Gateway
> Date: 2026-03-31

---

## The Question

We currently have a fully working payment system where:
- User scans fingerprint → Payment executes on blockchain.
- Every. Single. Time.

The question is: **Should we invest engineering effort into Session Keys
to remove that repeated fingerprint scan, or is it unnecessary complexity?**

---

## The Short Answer

**It depends entirely on the use case you are serving.**

Session Keys are NOT universally required. They solve a very specific
problem — and that problem only exists in certain merchant categories.

---

## When Session Keys Are ESSENTIAL (You MUST Build Them)

### Use Case: Recurring / Auto-Deduct Payments
**Examples:** Rapido rides, Uber, Swiggy, subscriptions, toll booths, parking

In these scenarios:
- The user is NOT actively looking at their phone when payment triggers
- The payment happens AFTER a service is consumed (post-ride fare)
- The merchant needs to PULL the payment, not wait for the user to PUSH it
- A fingerprint prompt at ride-end while the user is walking away = failed payment

**Verdict:** Session Keys are MANDATORY here. Without them, auto-pay is impossible.

### Use Case: Micropayments / High-Frequency Transactions
**Examples:** Gaming (in-app purchases), content tipping, IoT machine payments

In these scenarios:
- User makes 20-50 small payments per session
- Each payment is $0.10 - $2.00
- Prompting fingerprint 50 times = unusable product
- Competitor products (Apple Pay, Google Pay) don't prompt for small amounts

**Verdict:** Session Keys are MANDATORY. No user will scan their finger 50 times.

### Use Case: Background Payments
**Examples:** Streaming subscriptions, cloud storage renewal, insurance premiums

In these scenarios:
- Payment happens without user being present
- Monthly/weekly deductions
- User expects "set and forget" behavior

**Verdict:** Session Keys (or a scheduled variant) are MANDATORY.

---

## When Session Keys Are UNNECESSARY (Don't Build Them Yet)

### Use Case: One-Time Checkout Payments
**Examples:** E-commerce, invoice payments, peer-to-peer transfers

In these scenarios:
- User is already on the checkout page, actively engaged
- They EXPECT to authenticate (it feels secure)
- One fingerprint scan per purchase is perfectly acceptable
- Apple Pay, Google Pay, and UPI ALL require authentication for one-time payments
- Adding session keys here adds complexity with zero user benefit

**Verdict:** Session Keys add NO value. Current system is perfect.

### Use Case: High-Value Transactions
**Examples:** Real estate, B2B payments, luxury purchases, salary disbursements

In these scenarios:
- Users WANT to be prompted — it gives confidence
- Skipping authentication for a $10,000 payment feels dangerous
- Regulatory requirements may mandate explicit user consent per transaction
- Session keys would be a liability, not a feature

**Verdict:** Session Keys should be DISABLED for these. Current system is better.

---

## Competitive Analysis: What Do Others Do?

```
┌─────────────────────┬──────────────────────┬────────────────────────┐
│ PRODUCT             │ SMALL PAYMENTS       │ LARGE PAYMENTS         │
├─────────────────────┼──────────────────────┼────────────────────────┤
│ Apple Pay           │ No auth under $50    │ FaceID required        │
│ Google Pay          │ No auth under $50    │ PIN/Biometric required │
│ UPI (India)         │ Always requires PIN  │ Always requires PIN    │
│ Stripe              │ No auth (card saved) │ 3DS required           │
│ MetaMask            │ Always confirm + sign│ Always confirm + sign  │
│ Coinbase Wallet     │ Always confirm       │ Always confirm         │
├─────────────────────┼──────────────────────┼────────────────────────┤
│ GPS91 (Current)     │ Always Passkey       │ Always Passkey         │
│ GPS91 (With Session)│ No auth (auto-pay)   │ Passkey required       │
└─────────────────────┴──────────────────────┴────────────────────────┘
```

**Key Insight:** Every mainstream payment system in the world uses some form
of session/threshold logic. We are currently at the MetaMask level of UX
(always prompt). Session Keys move us to the Apple Pay level of UX.

---

## Risk Analysis: What Could Go Wrong WITH Session Keys?

### Risk 1: Increased Attack Surface
- A new key exists in browser memory that can theoretically be extracted
- **Mitigation:** Session key is useless without our backend co-signature
- **Residual Risk:** Low

### Risk 2: Engineering Complexity
- Session key modules require smart contract upgrades
- New validation logic in the Smart Account
- Browser-side key management
- **Mitigation:** Use battle-tested libraries (ZeroDev, Rhinestone)
- **Residual Risk:** Medium (2-3 weeks of development)

### Risk 3: User Confusion
- "Why didn't it ask for my fingerprint?" could feel insecure
- **Mitigation:** Clear UI messaging ("Auto-pay active • Protected up to $50")
- **Residual Risk:** Low

### Risk 4: Regulatory Concerns
- Some jurisdictions require Strong Customer Authentication (SCA) per payment
- PSD2 in Europe mandates SCA for electronic payments above €30
- **Mitigation:** Make session keys region-aware and configurable per merchant
- **Residual Risk:** Medium (requires legal review for specific markets)

---

## What Could Go Wrong WITHOUT Session Keys?

### Risk 1: Merchant Rejection
- Merchants like Rapido CANNOT integrate if auto-pay is impossible
- They will choose Stripe/Razorpay over us
- **Impact:** Entire merchant categories become inaccessible

### Risk 2: User Abandonment
- Studies show every additional authentication step drops conversion by 10-15%
- For micropayment use cases, 100% of users will leave
- **Impact:** Product becomes unusable for high-frequency scenarios

### Risk 3: Competitive Disadvantage
- Every Web3 wallet competitor (Biconomy, ZeroDev, Privy) already supports
  session keys as a core feature
- Not having them positions us as "less capable"
- **Impact:** Investors and partners may question technical maturity

---

## The Honest Recommendation

### If your FIRST target merchants are e-commerce / invoice payments:
→ **SKIP session keys for now.** Ship what we have. It works perfectly.
→ Build session keys in Phase 2 when you onboard recurring-payment merchants.

### If your FIRST target merchants are ride-sharing / food delivery / gaming:
→ **Session keys are non-negotiable.** Build them immediately.
→ Without them, the product literally cannot serve these use cases.

### If you want to be a GLOBAL payment service (serving ALL merchant types):
→ **Build session keys, but make them OPTIONAL per merchant.**
→ Let merchants choose: "Always authenticate" vs "Auto-pay under $X"
→ This gives you maximum flexibility and market coverage.

---

## Effort Estimate

```
┌────────────────────────────────────────┬───────────┬─────────────┐
│ COMPONENT                              │ EFFORT    │ PRIORITY    │
├────────────────────────────────────────┼───────────┼─────────────┤
│ Browser ephemeral key generation       │ 2 days    │ Phase 1     │
│ Passkey authorization of session key   │ 3 days    │ Phase 1     │
│ Smart Contract validator module        │ 5 days    │ Phase 1     │
│ Frontend session key selection logic   │ 2 days    │ Phase 1     │
│ Spend tracking + time expiry           │ 3 days    │ Phase 2     │
│ Merchant whitelist + config            │ 2 days    │ Phase 2     │
│ Risk/velocity engine                   │ 5 days    │ Phase 3     │
├────────────────────────────────────────┼───────────┼─────────────┤
│ TOTAL                                  │ ~22 days  │             │
│ Phase 1 only (MVP auto-pay)            │ ~12 days  │             │
└────────────────────────────────────────┴───────────┴─────────────┘
```

---

## Final Verdict

Session Keys are **NOT an unnecessary step**. They are the difference between:

- **Without:** A secure but friction-heavy wallet (like MetaMask)
- **With:** A seamless, Apple-Pay-grade payment experience on Web3

However, **timing matters**. If your immediate roadmap is proving the core
payment flow works (which we just did), you can ship today and add session
keys when the first recurring-payment merchant signs up.

The foundation we built (Passkey + ERC-4337 + Backend Co-signing) was
specifically designed to support session keys as a natural extension.
Nothing needs to be rewritten. It's purely additive.

---

*Document Version: 1.0*
*Author: GPS91 Engineering*
*Classification: Internal Strategy Document*
