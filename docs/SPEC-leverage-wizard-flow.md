# SPEC: Leverage Wizard Flow (Guided UX)

> **Author**: PM Agent  
> **Date**: 2025-03-02  
> **Target**: Frontend Dev Agent  
> **Branch**: `feat/leverage-wizard-flow` (off `dev`)  
> **Priority**: High — core UX redesign

---

## 1. Problem

Current StrategyPage is too manual:
- User must pick protocol (Navi/Suilend) manually without knowing which is better
- Hardcoded APY values (`DEFAULT_SUPPLY_APY = 0.08`) — not live data
- No preview from SDK — metrics are calculated with naive local math
- No `findBestLeverageRoute` integration — user can't compare protocols
- No auto-routing to portfolio after execution
- Missing XBTC token support in frontend (SDK supports SUI, LBTC, XBTC)

## 2. Goal

**Wizard-style flow**: User clicks through steps, options auto-populate, minimum friction.  
Think: "3 clicks to open a leveraged position."

---

## 3. New Flow: Step-by-Step

### Step 1: Select Asset

**What user sees:**
- 3 asset cards: **SUI**, **LBTC**, **XBTC**
- Each card shows: icon, name, current price (from `sdk.getTokenPrice()`)
- User taps one → moves to Step 2

**Data source:**
- Supported assets: import `SUPPORTED_COIN_TYPES` from SDK, or hardcode `['SUI', 'LBTC', 'XBTC']`
- Prices: `sdk.getTokenPrice('SUI')` etc. — call on mount, cache with react-query

**UI notes:**
- Horizontal card layout (mobile: vertical stack)
- Selected card gets highlighted border
- Keep the existing dark theme / CSS module pattern

---

### Step 2: Enter Value (USD) + Find Best Route

**What user sees:**
- **USD value input** (e.g. "$1,000") — user thinks in dollars, not token amounts
- Small helper text showing equivalent token amount: "≈ 263.5 SUI" (from `sdk.getTokenPrice()`)
- Optional: "Use token amount instead" toggle for advanced users
- After entering value → **auto-call `sdk.findBestLeverageRoute()`**
- Loading spinner while route calculates (~2-3s)
- Results appear as **two option cards**:

#### Option A: "Max Leverage" Card
```
┌─────────────────────────────┐
│  ⚡ Max Leverage             │
│  Protocol: Scallop           │
│  Multiplier: 6.17x           │
│  Net APY: -2.45%             │
│  Liq. Price: $0.53           │
│  Risk: ████████░░ High       │
└─────────────────────────────┘
```

#### Option B: "Best APY" Card
```
┌─────────────────────────────┐
│  💰 Best Return              │
│  Protocol: Suilend            │
│  Multiplier: 2.36x           │
│  Net APY: +4.10%             │
│  Liq. Price: $0.63           │
│  Risk: ███░░░░░░░ Low        │
└─────────────────────────────┘
```

**User picks one → moves to Step 3**

**Data source:**
```typescript
const route = await sdk.findBestLeverageRoute({
  depositAsset: selectedAsset,   // 'SUI' | 'LBTC' | 'XBTC'
  depositValueUsd: usdValue,     // user enters USD (e.g. 1000)
});

// Option A
route.bestMaxMultiplier.protocol   // protocol enum
route.bestMaxMultiplier.multiplier // max mult
route.bestMaxMultiplier.preview    // full LeveragePreview

// Option B  
route.bestApy.protocol
route.bestApy.multiplier           // safe multiplier
route.bestApy.preview              // full LeveragePreview
```

**UI notes:**
- Both cards side-by-side (mobile: stacked)
- Highlight the "recommended" one (bestApy for most users)
- Show a small "Compare all protocols" expandable with `route.allPreviews`
- If `route.failedProtocols` has entries, show subtle warning icon

---

### Step 3: Preview & Confirm

**What user sees:**
- Full preview panel with all details from `LeveragePreview`:

```
┌─────────────────────────────────────┐
│  📊 Position Preview                │
│                                     │
│  Asset:           SUI               │
│  Protocol:        Suilend           │
│  Deposit:         $1,000.00         │
│  Total Position:  $2,360.00         │
│  Debt:            $1,360.00         │
│  Effective Mult:  2.36x             │
│                                     │
│  ── Risk ──                         │
│  Health Factor:   1.50              │
│  Liq. Price:      $0.63             │
│  Price Buffer:    33.3% drop        │
│                                     │
│  ── Returns ──                      │
│  Supply APY:      2.89%             │
│    └ Reward:      0.00%             │
│  Borrow APY:      3.45%             │
│    └ Rebate:     -2.00%             │
│    └ Net:         1.45%             │
│  Net APY:         +4.10%            │
│  Est. Earnings:   $41.00/yr         │
│                                     │
│  Swap Slippage:   0.02%             │
│  Flash Loan Fee:  $0.00             │
│                                     │
│  [  ◀ Back  ]   [ Open Position ]   │
└─────────────────────────────────────┘
```

**Data source**: The `LeveragePreview` object from Step 2's selected route. No additional SDK calls needed.

**UI notes:**
- "Open Position" button triggers `sdk.buildLeverageTransaction()` → wallet sign
- Show wallet confirmation modal (existing pattern)
- Loading state during TX submission
- On success → auto-navigate to `/portfolio`

---

### Step 4: Post-Execution → Portfolio Redirect

**After successful TX:**
1. Show success toast: "Position opened! Redirecting..."
2. `setTimeout(() => navigate('/portfolio'), 2000)`
3. Portfolio page auto-refreshes positions (invalidate react-query cache)

**On failure:**
- Stay on Step 3
- Show error toast with message
- "Try Again" button resets to Step 3

---

## 4. Technical Implementation Guide

### 4.1 New Files to Create

```
src/pages/StrategyPage.tsx          ← REWRITE (wizard flow)
src/components/AssetSelector.tsx    ← Step 1
src/components/RouteCards.tsx       ← Step 2 (best route options)
src/components/PreviewPanel.tsx     ← Step 3 (position preview)
src/components/WizardStepper.tsx    ← Step indicator (1-2-3)
```

### 4.2 Files to Modify

```
src/hooks/useDefiDash.ts            ← Already has findBestLeverageRoute, ensure it works
src/config/protocols.ts             ← Add XBTC to SUPPORTED_TOKENS, add Scallop protocol
```

### 4.3 Add XBTC + Scallop Support

In `src/config/protocols.ts`:

```typescript
// Add to SUPPORTED_TOKENS:
XBTC: {
  symbol: 'XBTC',
  name: 'XBTC',
  coinType: '0x876a4b7bce8aeaef60464c11f4026903e9afacab79b9b142686158aa86560b50::xbtc::XBTC',
  decimals: 8,
  icon: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png', // placeholder
},

// Add to protocols array:
{
  id: 'scallop',
  name: 'Scallop',
  logo: '',
  siteUrl: 'https://scallop.io',
  categories: ['lending'],
  chains: ['sui'],
},
```

### 4.4 Hook Updates in useDefiDash.ts

The hook already has `findBestLeverageRoute` and `getOpenPositions` from the SDK v0.1.4 migration. Verify they work correctly:

```typescript
// Already in hook — verify these exist:
const findBestLeverageRoute = useCallback(async (params) => {
  const sdk = await getSDK();
  return sdk.findBestLeverageRoute(params);
}, [getSDK]);

const getOpenPositions = useCallback(async () => {
  const sdk = await getSDK();
  return sdk.getOpenPositions();
}, [getSDK]);
```

Also add `getTokenPrice`:
```typescript
const getTokenPrice = useCallback(async (asset: string) => {
  const sdk = await getSDK();
  return sdk.getTokenPrice(asset);
}, [getSDK]);
```

### 4.5 Wizard State Management

Simple `useState` stepper — no need for external state library:

```typescript
type WizardStep = 1 | 2 | 3;

const [step, setStep] = useState<WizardStep>(1);
const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
const [usdValue, setUsdValue] = useState<number | null>(null);
const [routeResult, setRouteResult] = useState<LeverageRouteResult | null>(null);
const [selectedRoute, setSelectedRoute] = useState<'maxLeverage' | 'bestApy' | null>(null);
```

### 4.6 React Query Keys

```typescript
// Asset prices (cache 30s)
useQuery({ queryKey: ['tokenPrice', asset], queryFn: ... , staleTime: 30_000 })

// Best route (no cache — depends on live rates)
useQuery({ queryKey: ['bestRoute', asset, usdValue], queryFn: ..., enabled: !!usdValue && usdValue > 0 })
```

### 4.7 Navigation After Execution

```typescript
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

// On successful TX:
queryClient.invalidateQueries({ queryKey: ['portfolio'] });
navigate('/portfolio');
```

---

## 5. What NOT to Change

- **PortfolioPage.tsx** — keep as-is (already shows positions well)
- **Navigation.tsx** — keep existing routes
- **App.tsx** — no routing changes needed
- **CSS Module pattern** — continue using `.module.css` files
- **LoopingStrategy.tsx** — can be deprecated / removed after wizard is done. Don't reuse it.
- **DevPage.tsx** — keep for debugging

---

## 6. Deleverage (Close Position)

Keep the close/unwind flow **in PortfolioPage**, not in the wizard. User sees their positions in portfolio → clicks "Close" on a position → triggers deleverage.

This means PortfolioPage needs a small addition:
- Add "Close Position" button per protocol row in the portfolio
- On click: call `sdk.buildDeleverageTransaction(tx, { protocol })` → wallet sign
- Show result toast

This is a **separate task** — do NOT include in the wizard PR. Just note it as TODO.

---

## 7. Edge Cases to Handle

| Case | Handling |
|------|----------|
| Wallet not connected | Step 1 shows assets + prices, Step 2 prompts "Connect Wallet" |
| Amount = 0 or empty | Disable "Find Routes" / don't call SDK |
| All protocols fail for asset | Show error: "This asset is not currently supported for leverage" |
| Only 1 protocol works | Show single card instead of two options |
| bestMaxMultiplier === bestApy (same protocol) | Show single card: "Best Overall" |
| TX fails mid-sign | Stay on Step 3, show error, allow retry |
| Amount exceeds wallet balance | Show warning but allow (user might get more before signing) |

---

## 8. Acceptance Criteria

- [ ] Step 1: User can select SUI / LBTC / XBTC with live prices
- [ ] Step 2: Amount input → auto-calls findBestLeverageRoute → shows 2 option cards
- [ ] Step 3: Full preview with all LeveragePreview fields displayed
- [ ] Step 3 → Execute: builds TX, wallet signs, success → redirect to /portfolio
- [ ] XBTC and Scallop added to config
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] No hardcoded APY values — all from SDK
- [ ] Existing portfolio page untouched

---

## 9. Reference: SDK Types

```typescript
interface LeverageRouteResult {
  bestMaxMultiplier: LeverageRoute;  // highest leverage protocol
  bestApy: LeverageRoute;            // best net APY protocol  
  safeMultiplier: number;            // safe comparison multiplier
  allPreviews: Array<{ protocol: LendingProtocol; preview: LeveragePreview }>;
  failedProtocols: Array<{ protocol: LendingProtocol; error: string }>;
}

interface LeverageRoute {
  protocol: LendingProtocol;
  multiplier: number;
  preview: LeveragePreview;
}

interface LeveragePreview {
  initialEquityUsd: number;
  flashLoanUsdc: bigint;
  flashLoanFeeUsd: number;
  totalPositionUsd: number;
  debtUsd: number;
  effectiveMultiplier: number;
  maxMultiplier: number;
  assetLtv: number;
  ltvPercent: number;
  liquidationThreshold: number;
  liquidationPrice: number;
  priceDropBuffer: number;
  supplyApyBreakdown: { base: number; reward: number; total: number };
  borrowApyBreakdown: { gross: number; rebate: number; net: number };
  netApy: number;
  annualNetEarningsUsd: number;
  swapSlippagePct: number;
}

enum LendingProtocol {
  Suilend = 'suilend',
  Navi = 'navi', 
  Scallop = 'scallop',
}
```
