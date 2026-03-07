# DefiDash Roadmap & TODOs

> PM-generated roadmap from UI Overhaul PR #5

---

## 🎯 Priority Features

### 1. Health Monitoring Alerts
**Priority:** 🟢 High (Low effort, High value)

**Requirements:**
- Monitor health factor across all protocols (Navi, Suilend, Scallop)
- Alert users when health factor drops below threshold (1.5, 1.2, etc.)
- Notification options: in-app toast, browser notification

**Implementation:**
- [ ] Add health factor polling in usePortfolio hook
- [ ] Create AlertBanner component for warnings
- [ ] Add user preference for alert thresholds
- [ ] Browser notification permission flow

---

### 2. Position Boost
**Priority:** 🟡 Medium

**Requirements:**
- Allow users to increase leverage on existing positions
- Reuse current wizard flow with pre-filled values
- Show impact preview before boosting

**Implementation:**
- [ ] Add "Boost" button to PositionCard
- [ ] Pre-fill wizard with current position data
- [ ] SDK method: `boostPosition()` or reuse `buildLeverageTransaction()`

---

### 3. Auto-Liquidation Protection
**Priority:** 🔴 High effort (Killer feature)

**Requirements:**
- Automatically deleverage when health factor approaches danger zone
- Requires keeper infrastructure (off-chain monitoring + execution)

**Implementation:**
- [ ] Design keeper architecture
- [ ] Build monitoring service
- [ ] User opt-in flow
- [ ] Emergency deleverage transaction builder

---

## 🐛 Known Issues

- [ ] FlowX CORS error in console (swap quote API blocked from localhost)
- [ ] Bundle size > 500KB (consider code splitting)

---

## 📅 Changelog

### 2026-03-07 - UI Overhaul (PR #5)
- Added service logo to header
- Protocol display on Strategy page
- Asset-protocol support matrix
- Price caching with 60s TTL
- Portfolio position cards
- Close position UI
- Seamless footer
- Improved wallet UI
- Removed Dev page and chain selector
