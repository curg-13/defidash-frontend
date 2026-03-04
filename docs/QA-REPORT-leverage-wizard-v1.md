# QA Report: Leverage Wizard Flow v1

> **Date**: 2026-03-03  
> **Tester**: PM Agent (browser automation)  
> **Branch**: `feat/leverage-wizard-flow`  
> **Environment**: localhost:5174, Chrome + Slush wallet, Sui Mainnet  
> **Wallet**: 0x2bdc…2fb4

---

## Summary

| Area | Status |
|------|--------|
| Step 1: Asset Selection | ✅ PASS |
| Step 2: Value Input + Route | ⚠️ PARTIAL |
| Step 3: Preview + Execute | ❌ BLOCKED (crash) |
| Portfolio Page | ✅ PASS |
| Wallet Connection | ✅ PASS |

---

## 🐛 BUG #1: MAX button sets $0 for XBTC (Critical)

**Steps to reproduce:**
1. Connect wallet
2. Select XBTC
3. Click MAX button

**Expected:** Input fills with wallet balance value (~$4.61)  
**Actual:** Input sets to `$0`

**Likely cause:** `getTokenBalance()` for XBTC returns a raw BigInt that isn't converting properly to USD value, or the balance calculation returns 0/NaN.

**Impact:** Users can't use MAX to deposit their full XBTC balance.

---

## 🐛 BUG #2: App crashes on route card selection → Step 3 (Critical / Blocker)

**Steps to reproduce:**
1. Select XBTC → Enter $4 → Route cards appear
2. Click either "Max Leverage" or "Best Return" card
3. App crashes → blank black screen → React unmounts

**Error (from console):**
```
Uncaught TypeError: Do not know how to serialize a BigInt
  at StrategyPage.tsx:203 (source-mapped)
  at chunk-DSUIPI7G.js:16007 (React internals)
```

**Root cause:** `StrategyPage.tsx` line 148 has a Debug Info `<details>` block with `JSON.stringify()`. When route is selected and state updates, the state objects contain `BigInt` values (from `LeveragePreview.flashLoanUsdc`). `JSON.stringify` cannot serialize BigInt → crash.

**Fix:**
```typescript
// Option A: Custom serializer
JSON.stringify(debugData, (key, value) =>
  typeof value === 'bigint' ? value.toString() : value
, 2)

// Option B: Remove Debug Info from production, or exclude BigInt fields
```

**Impact:** Step 3 (Preview + Execute) is completely unreachable. Blocker.

---

## ✅ PASS: Step 1 — Asset Selection

- [x] SUI / LBTC / XBTC cards render correctly
- [x] Live prices display after wallet connection (SUI: $0.93, LBTC: $69.8K, XBTC: $69.6K)
- [x] Prices show "--" when wallet not connected (expected behavior)
- [x] Card selection advances to Step 2
- [x] Step indicator updates (1 → ✓, 2 highlighted)
- [x] XBTC icon loads (uses placeholder bitcoin icon)

---

## ⚠️ PARTIAL: Step 2 — Value Input + Route Finding

- [x] USD input field renders with $ prefix
- [x] Helper text shows token equivalent (≈ 0.0001 XBTC)
- [x] Balance display shows USD + token amount
- [x] Manual value entry triggers route finding
- [x] Route cards appear with correct data (Scallop/Suilend)
- [x] "Recommended" badge on Best Return card
- [x] Risk indicators (Low/Medium) display correctly
- [x] Back button works
- [ ] ❌ MAX button broken (BUG #1)
- [ ] ❌ Route card click crashes app (BUG #2)

---

## ❌ BLOCKED: Step 3 — Preview + Execute

Could not test — blocked by BUG #2.

---

## ✅ PASS: Portfolio Page

- [x] Net Value, Net APY, Health Factor display correctly
- [x] Supplies table shows assets with protocol badges
- [x] Borrows section renders
- [x] Existing positions (SPRING_SUI on Suilend, XBTC on Navi) visible

---

## 🎨 UI/UX Observations

1. **Protocol names lowercase**: Route cards show "scallop" / "suilend" — should be capitalized "Scallop" / "Suilend"
2. **No loading state**: When route is being fetched, there's no spinner or loading indicator — cards just appear
3. **$1000 default**: Input starts with $1000 default but balance is only $4.61 — consider no default or matching balance
4. **Liq. Price formatting**: Shows $65290.08 — should use thousands separator ($65,290.08)
5. **Debug Info panel**: Should be removed or hidden in production builds (and it's the cause of BUG #2)

---

## Priority Fix Order

1. **BUG #2** (BigInt serialization crash) — Blocker, must fix first
2. **BUG #1** (MAX button) — Critical UX issue
3. Protocol name capitalization — Easy fix
4. Loading state for route finding — UX improvement
5. Remove Debug Info panel — Cleanup

---

## Test Coverage Needed After Fixes

- [ ] Step 3 preview panel renders all LeveragePreview fields
- [ ] "Open Position" button triggers buildLeverageTransaction
- [ ] Wallet signing flow works
- [ ] Success → redirect to /portfolio
- [ ] Error handling (TX failure, insufficient balance)
- [ ] Test with SUI and LBTC assets (not just XBTC)
- [ ] Test MAX button for all 3 assets
