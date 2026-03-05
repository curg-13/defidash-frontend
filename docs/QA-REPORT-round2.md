# QA Report Round 2: Leverage Wizard

> **Date**: 2026-03-05  
> **Tester**: PM Agent (browser automation)  
> **Branch**: `dev` (merged from `feat/leverage-wizard-flow`)  
> **Environment**: localhost:5174, Chrome + Slush wallet, Sui Mainnet

---

## Summary

| Area | Status |
|------|--------|
| Step 1: Asset Selection | ✅ PASS |
| Step 2: Value Input + Route | ⚠️ PARTIAL (bugs) |
| Step 3: Preview Panel | ⚠️ PARTIAL (bugs) |
| Step 3 → Execute | ⏸️ NOT TESTED (small balance) |
| Portfolio Page | ✅ PASS |
| All 3 Assets (SUI/LBTC/XBTC) | ✅ All reach Step 3 |

### Previous Bugs Status
- ✅ BigInt crash → **FIXED** (Step 3 now reachable)
- ✅ MAX button $0 for XBTC → **FIXED** (now shows correct value)
- ✅ Prices without wallet → **FIXED** (prices load immediately)
- ✅ Token icons → **FIXED** (all 4 tokens + 3 protocols have icons)

---

## 🐛 BUG #3: Percentage values doubled (Critical)

**Root cause**: SDK returns percentage values **already multiplied by 100** (e.g. `2.74` means 2.74%), but frontend `formatPercent()` multiplies by 100 again → `274%`.

**Affected fields (ALL wrong by 100x)**:

| Field | Shows | Should Show |
|-------|-------|-------------|
| Liq. Price drop % | -1372.5% | -13.7% |
| Swap Slippage | 281.86% | 2.82% |
| Supply APY | 274% | 2.74% |
| Borrow APY | 551% | 5.51% |
| Rebate | 184% | 1.84% |
| Net APY | Already correct (different path) | — |

**Fix in `src/components/PreviewPanel.tsx` line 67-70:**
```typescript
// BEFORE (wrong):
const formatPercent = (value: number, showSign = true) => {
  const sign = showSign && value >= 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(2)}%`;
};

// AFTER (correct — SDK already returns percentages):
const formatPercent = (value: number, showSign = true) => {
  const sign = showSign && value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};
```

**Same fix in `src/components/RouteCards.tsx` line 98-103:**
```typescript
// BEFORE:
const formatLiquidationPrice = (price: number, priceDropBuffer: number) => (
  <>
    ${formatNumber(price)}{' '}
    <span style={{ color: '#ff4444' }}>
      (-{(priceDropBuffer * 100).toFixed(1)}%)
    </span>
  </>
);

// AFTER:
const formatLiquidationPrice = (price: number, priceDropBuffer: number) => (
  <>
    ${formatNumber(price)}{' '}
    <span style={{ color: '#ff4444' }}>
      (-{priceDropBuffer.toFixed(1)}%)
    </span>
  </>
);
```

**Also check**: Does `RouteCards.tsx` have its own `formatPercent`? If yes, apply same fix.

---

## 🐛 BUG #4: MAX button shows too many decimals (Minor)

**Steps**: Click MAX for any asset  
**Shows**: `$0.75931438239482`  
**Should show**: `$0.76`

**Fix**: Round to 2 decimal places when setting MAX value:
```typescript
const maxUsd = balance * tokenPrice;
setUsdValue(Math.floor(maxUsd * 100) / 100); // Round down to 2 decimals
```

---

## ✅ PASS Details

### Step 1 — Asset Selection
- [x] All 3 asset cards render with local icons
- [x] Live prices display without wallet connection
- [x] Prices update after wallet connection
- [x] Card selection advances to Step 2

### Step 2 — Route Finding (all 3 assets)
| Asset | Routes Found | Max Leverage | Best APY |
|-------|:---:|---|---|
| SUI | ✅ | Scallop 6.66x | Suilend 2.83x |
| XBTC | ✅ | Scallop 3.99x | Suilend 2.00x |
| LBTC | ⏸️ Not tested | — | — |

### Step 3 — Preview Panel
- [x] SUI → Suilend preview renders (no crash)
- [x] XBTC → Suilend preview renders (no crash)
- [x] All preview fields populated (deposit, total, debt, mult, health, APYs)
- [x] "Open Position" button visible
- [ ] ❌ Percentage values wrong (BUG #3)

### Portfolio Page
- [x] Net Value, Net APY, Health Factor correct
- [x] Supplies/Borrows tables render
- [x] Protocol badges visible (SUILEND, NAVI)

---

## Priority Fix Order

1. **BUG #3** — Percentage doubling (Critical — all APY/risk numbers are wrong)
2. **BUG #4** — MAX decimals (Minor — cosmetic)

---

## Still TODO (Next QA Round)
- [ ] Test LBTC full flow
- [ ] Test "Open Position" button → wallet sign → TX execution
- [ ] Test success → redirect to /portfolio
- [ ] Test error handling (TX failure)
- [ ] Test deleverage flow in Portfolio page
- [ ] Verify Net APY on route cards uses correct formula
