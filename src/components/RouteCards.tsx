import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDefiDash, LendingProtocol } from '../hooks/useDefiDash';
import { SUPPORTED_TOKENS, ASSET_PROTOCOL_SUPPORT, protocolsById } from '../config/protocols';
import type { LeverageRouteResult, LeverageRoute, LeveragePreview } from 'defi-dash-sdk';
import styles from './RouteCards.module.css';

type RouteType = 'maxLeverage' | 'bestApy' | 'custom';

interface RouteCardsProps {
  selectedAsset: string;
  usdValue: string;
  onUsdValueChange: (usdValue: string) => void;
  selectedRoute: RouteType | null;
  onRouteSelect: (route: RouteType, routeData: LeverageRoute) => void;
}

// Map protocol ID to LendingProtocol enum
const PROTOCOL_ID_TO_ENUM: Record<string, LendingProtocol> = {
  navi: LendingProtocol.Navi,
  suilend: LendingProtocol.Suilend,
  scallop: LendingProtocol.Scallop,
};

export function RouteCards({
  selectedAsset,
  usdValue,
  onUsdValueChange,
  selectedRoute,
  onRouteSelect,
}: RouteCardsProps) {
  const { findBestLeverageRoute, getTokenBalance, getTokenPrice, previewLeverage, isConnected } =
    useDefiDash();

  // Custom route state
  const [customProtocol, setCustomProtocol] = useState<string | null>(null);
  const [customMultiplier, setCustomMultiplier] = useState<number>(2.0);
  const [showCustomCard, setShowCustomCard] = useState(false);

  const tokenInfo = SUPPORTED_TOKENS[selectedAsset as keyof typeof SUPPORTED_TOKENS];

  // Get protocols supported for this asset
  const supportedProtocols = useMemo(() => {
    const protocolIds = ASSET_PROTOCOL_SUPPORT[selectedAsset] || [];
    return protocolIds
      .map((id) => ({
        id,
        name: protocolsById[id]?.name || id,
        logo: protocolsById[id]?.logo,
      }))
      .filter((p) => PROTOCOL_ID_TO_ENUM[p.id]); // Only include protocols we can map
  }, [selectedAsset]);

  // Initialize custom protocol when supported protocols change
  useMemo(() => {
    if (supportedProtocols.length > 0 && !customProtocol) {
      setCustomProtocol(supportedProtocols[0].id);
    }
  }, [supportedProtocols, customProtocol]);

  // Get wallet balance for the selected asset
  const { data: balance = '0' } = useQuery({
    queryKey: ['tokenBalance', selectedAsset],
    queryFn: () => getTokenBalance(tokenInfo?.coinType || ''),
    enabled: isConnected && !!tokenInfo?.coinType,
  });

  // Get current token price
  const { data: tokenPrice = 0 } = useQuery({
    queryKey: ['tokenPrice', selectedAsset],
    queryFn: () => getTokenPrice(selectedAsset),
    enabled: isConnected,
    staleTime: 30_000, // 30 seconds
  });

  // Find best routes when USD value is entered
  const {
    data: routeResult,
    isLoading: isLoadingRoutes,
    error: routeError,
  } = useQuery({
    queryKey: ['bestRoute', selectedAsset, usdValue],
    queryFn: (): Promise<LeverageRouteResult> =>
      findBestLeverageRoute({
        depositAsset: selectedAsset,
        depositValueUsd: parseFloat(usdValue),
      }),
    enabled: !!usdValue && parseFloat(usdValue) > 0,
    staleTime: 0, // No cache - always fetch fresh rates
  });

  // Calculate deposit amount for custom preview
  const customDepositAmount = useMemo(() => {
    if (!usdValue || !tokenPrice || tokenPrice === 0) return '0';
    const tokenAmount = parseFloat(usdValue) / tokenPrice;
    return tokenAmount.toString();
  }, [usdValue, tokenPrice]);

  // Get max multiplier from the best route for the selected protocol
  // TODO: SDK doesn't provide per-protocol max multiplier directly.
  // Using the preview's maxMultiplier once we have a preview.
  // PM will coordinate with SDK team for proper max multiplier API.
  const getMaxMultiplierForProtocol = (protocolId: string): number => {
    // Try to get from route result's allPreviews
    if (routeResult?.allPreviews) {
      const protocolEnum = PROTOCOL_ID_TO_ENUM[protocolId];
      const preview = routeResult.allPreviews.find((p) => p.protocol === protocolEnum);
      if (preview) {
        return preview.preview.maxMultiplier;
      }
    }
    // Fallback: use bestMaxMultiplier if same protocol
    if (routeResult?.bestMaxMultiplier) {
      const protocolEnum = PROTOCOL_ID_TO_ENUM[protocolId];
      if (routeResult.bestMaxMultiplier.protocol === protocolEnum) {
        return routeResult.bestMaxMultiplier.preview.maxMultiplier;
      }
    }
    // Default fallback
    return 5.0;
  };

  // Custom preview query
  const {
    data: customPreview,
    isLoading: isLoadingCustomPreview,
    error: customPreviewError,
  } = useQuery({
    queryKey: [
      'customPreview',
      selectedAsset,
      customDepositAmount,
      customProtocol,
      customMultiplier,
    ],
    queryFn: async (): Promise<LeveragePreview> => {
      if (!customProtocol) throw new Error('No protocol selected');
      const protocolEnum = PROTOCOL_ID_TO_ENUM[customProtocol];
      if (!protocolEnum) throw new Error('Invalid protocol');

      return previewLeverage({
        protocol: protocolEnum,
        depositAsset: selectedAsset,
        depositAmount: customDepositAmount,
        multiplier: customMultiplier,
      });
    },
    enabled:
      showCustomCard &&
      !!customProtocol &&
      !!customDepositAmount &&
      parseFloat(customDepositAmount) > 0 &&
      customMultiplier >= 1.1,
    staleTime: 0,
    retry: false,
  });

  // Get current max multiplier for the selected custom protocol
  const currentMaxMultiplier = customProtocol ? getMaxMultiplierForProtocol(customProtocol) : 5.0;

  // Validation: check if multiplier exceeds max
  const isMultiplierExceeded = customMultiplier > currentMaxMultiplier;

  const formatBalance = (bal: string) => {
    const balanceNum = parseFloat(bal) / Math.pow(10, tokenInfo?.decimals || 9);
    return balanceNum.toFixed(4);
  };

  const formatBalanceUsd = (bal: string) => {
    const balanceNum = parseFloat(bal) / Math.pow(10, tokenInfo?.decimals || 9);
    const balanceUsd = balanceNum * tokenPrice;
    return balanceUsd.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getTokenEquivalent = (usd: string) => {
    if (!usd || !tokenPrice || tokenPrice === 0) return '0';
    const usdNum = parseFloat(usd);
    const tokenAmount = usdNum / tokenPrice;
    return tokenAmount.toFixed(4);
  };

  const handleMaxClick = () => {
    // Ensure we have valid balance and price
    if (!balance || balance === '0' || !tokenPrice || tokenPrice <= 0) {
      console.warn('MAX button: Invalid balance or token price', { balance, tokenPrice });
      return;
    }

    const balanceNum = parseFloat(balance) / Math.pow(10, tokenInfo?.decimals || 9);
    // Leave a small buffer for gas fees (proportional to balance)
    const gasBufferPercentage = 0.05; // 5% buffer
    const maxTokenAmount = Math.max(0, balanceNum * (1 - gasBufferPercentage));
    const maxUsdValue = maxTokenAmount * tokenPrice;

    // Ensure we have a valid USD value
    if (maxUsdValue <= 0 || isNaN(maxUsdValue)) {
      console.warn('MAX button: Invalid USD value calculated', {
        maxTokenAmount,
        tokenPrice,
        maxUsdValue,
      });
      return;
    }

    // Round to 2 decimal places
    const roundedMaxUsd = Math.floor(maxUsdValue * 100) / 100;
    onUsdValueChange(roundedMaxUsd.toString());
  };

  const formatMultiplier = (mult: number) => `${mult.toFixed(2)}x`;
  // SDK returns APYs as decimals (0.0274 = 2.74%) → need × 100
  const formatApy = (apy: number) => {
    const sign = apy >= 0 ? '+' : '';
    return `${sign}${(apy * 100).toFixed(2)}%`;
  };

  const formatPrice = (price: number) =>
    `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatLiquidationPrice = (price: number, priceDropBuffer: number) => (
    <>
      {formatPrice(price)}{' '}
      <span style={{ color: '#ff4444', fontWeight: 500 }}>(-{priceDropBuffer.toFixed(1)}%)</span>
    </>
  );

  const formatProtocolName = (protocol: string) =>
    protocol.charAt(0).toUpperCase() + protocol.slice(1).toLowerCase();

  const getRiskLevel = (mult: number) => {
    if (mult >= 5) return { level: 'High', bars: 8 };
    if (mult >= 3) return { level: 'Medium', bars: 5 };
    return { level: 'Low', bars: 3 };
  };

  const renderRiskBars = (activeBars: number, totalBars = 10) => (
    <div className={styles.riskBars}>
      {Array.from({ length: totalBars }, (_, i) => (
        <div
          key={i}
          className={`${styles.riskBar} ${i < activeBars ? styles.riskBarActive : ''}`}
        />
      ))}
    </div>
  );

  // Check if both routes are the same protocol
  const isSameProtocol =
    routeResult && routeResult.bestMaxMultiplier.protocol === routeResult.bestApy.protocol;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Enter Value & Find Best Route</h3>
      <p className={styles.description}>
        Enter the USD value you want to leverage, and we&apos;ll find the best protocols for you.
      </p>

      {/* USD Value Input */}
      <div className={styles.amountSection}>
        <div className={styles.amountLabel}>
          <span>Deposit Value (USD)</span>
          <span className={styles.balance}>
            Balance: ${formatBalanceUsd(balance)} (≈ {formatBalance(balance)} {selectedAsset})
          </span>
        </div>
        <div className={styles.amountInput}>
          <span className={styles.dollarSign}>$</span>
          <input
            type="number"
            placeholder="1000"
            value={usdValue}
            onChange={(e) => onUsdValueChange(e.target.value)}
            className={styles.input}
            step="1"
            min="0"
          />
          <div className={styles.inputSuffix}>
            <button type="button" onClick={handleMaxClick} className={styles.maxButton}>
              MAX
            </button>
          </div>
        </div>
        {usdValue && parseFloat(usdValue) > 0 && tokenPrice > 0 && (
          <div className={styles.helperText}>
            ≈ {getTokenEquivalent(usdValue)} {selectedAsset}
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoadingRoutes && usdValue && parseFloat(usdValue) > 0 && (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Finding best leverage routes...</p>
        </div>
      )}

      {/* Error State */}
      {routeError && (
        <div className={styles.errorState}>
          <p>Failed to find routes. Please try again.</p>
        </div>
      )}

      {/* Route Options */}
      {routeResult && !isLoadingRoutes && (
        <div className={styles.routeSection}>
          {isSameProtocol ? (
            // Single card when both routes are the same
            <div className={styles.singleRouteContainer}>
              <button
                type="button"
                onClick={() => onRouteSelect('bestApy', routeResult.bestApy)}
                className={`${styles.routeCard} ${selectedRoute === 'bestApy' ? styles.routeCardSelected : ''}`}
              >
                <div className={styles.routeHeader}>
                  <div className={styles.routeTitle}>
                    <span className={styles.routeIcon}>⚡</span>
                    Best Overall
                  </div>
                  <div className={styles.routeProtocol}>
                    Protocol: {formatProtocolName(routeResult.bestApy.protocol)}
                  </div>
                </div>
                <div className={styles.routeMetrics}>
                  <div className={styles.metric}>
                    <span>Multiplier:</span>
                    <span>{formatMultiplier(routeResult.bestApy.multiplier)}</span>
                  </div>
                  <div className={styles.metric}>
                    <span>Net APY:</span>
                    <span
                      className={
                        routeResult.bestApy.preview.netApy >= 0 ? styles.positive : styles.negative
                      }
                    >
                      {formatApy(routeResult.bestApy.preview.netApy)}
                    </span>
                  </div>
                  <div className={styles.metric}>
                    <span>Liq. Price:</span>
                    <span>
                      {formatLiquidationPrice(
                        routeResult.bestApy.preview.liquidationPrice,
                        routeResult.bestApy.preview.priceDropBuffer
                      )}
                    </span>
                  </div>
                  <div className={styles.riskRow}>
                    <span>Risk:</span>
                    <div className={styles.riskIndicator}>
                      {renderRiskBars(getRiskLevel(routeResult.bestApy.multiplier).bars)}
                      <span className={styles.riskLabel}>
                        {getRiskLevel(routeResult.bestApy.multiplier).level}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          ) : (
            // Two cards when routes are different
            <div className={styles.routeOptions}>
              {/* Max Leverage Option */}
              <button
                type="button"
                onClick={() => onRouteSelect('maxLeverage', routeResult.bestMaxMultiplier)}
                className={`${styles.routeCard} ${selectedRoute === 'maxLeverage' ? styles.routeCardSelected : ''}`}
              >
                <div className={styles.routeHeader}>
                  <div className={styles.routeTitle}>
                    <span className={styles.routeIcon}>⚡</span>
                    Max Leverage
                  </div>
                  <div className={styles.routeProtocol}>
                    Protocol: {formatProtocolName(routeResult.bestMaxMultiplier.protocol)}
                  </div>
                </div>
                <div className={styles.routeMetrics}>
                  <div className={styles.metric}>
                    <span>Multiplier:</span>
                    <span>{formatMultiplier(routeResult.bestMaxMultiplier.multiplier)}</span>
                  </div>
                  <div className={styles.metric}>
                    <span>Net APY:</span>
                    <span
                      className={
                        routeResult.bestMaxMultiplier.preview.netApy >= 0
                          ? styles.positive
                          : styles.negative
                      }
                    >
                      {formatApy(routeResult.bestMaxMultiplier.preview.netApy)}
                    </span>
                  </div>
                  <div className={styles.metric}>
                    <span>Liq. Price:</span>
                    <span>
                      {formatLiquidationPrice(
                        routeResult.bestMaxMultiplier.preview.liquidationPrice,
                        routeResult.bestMaxMultiplier.preview.priceDropBuffer
                      )}
                    </span>
                  </div>
                  <div className={styles.riskRow}>
                    <span>Risk:</span>
                    <div className={styles.riskIndicator}>
                      {renderRiskBars(getRiskLevel(routeResult.bestMaxMultiplier.multiplier).bars)}
                      <span className={styles.riskLabel}>
                        {getRiskLevel(routeResult.bestMaxMultiplier.multiplier).level}
                      </span>
                    </div>
                  </div>
                </div>
              </button>

              {/* Best APY Option */}
              <button
                type="button"
                onClick={() => onRouteSelect('bestApy', routeResult.bestApy)}
                className={`${styles.routeCard} ${selectedRoute === 'bestApy' ? styles.routeCardSelected : ''} ${styles.recommended}`}
              >
                <div className={styles.recommendedBadge}>Recommended</div>
                <div className={styles.routeHeader}>
                  <div className={styles.routeTitle}>
                    <span className={styles.routeIcon}>💰</span>
                    Best Return
                  </div>
                  <div className={styles.routeProtocol}>
                    Protocol: {formatProtocolName(routeResult.bestApy.protocol)}
                  </div>
                </div>
                <div className={styles.routeMetrics}>
                  <div className={styles.metric}>
                    <span>Multiplier:</span>
                    <span>{formatMultiplier(routeResult.bestApy.multiplier)}</span>
                  </div>
                  <div className={styles.metric}>
                    <span>Net APY:</span>
                    <span
                      className={
                        routeResult.bestApy.preview.netApy >= 0 ? styles.positive : styles.negative
                      }
                    >
                      {formatApy(routeResult.bestApy.preview.netApy)}
                    </span>
                  </div>
                  <div className={styles.metric}>
                    <span>Liq. Price:</span>
                    <span>
                      {formatLiquidationPrice(
                        routeResult.bestApy.preview.liquidationPrice,
                        routeResult.bestApy.preview.priceDropBuffer
                      )}
                    </span>
                  </div>
                  <div className={styles.riskRow}>
                    <span>Risk:</span>
                    <div className={styles.riskIndicator}>
                      {renderRiskBars(getRiskLevel(routeResult.bestApy.multiplier).bars)}
                      <span className={styles.riskLabel}>
                        {getRiskLevel(routeResult.bestApy.multiplier).level}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Custom Setup Toggle */}
          <div className={styles.customToggle}>
            <button
              type="button"
              onClick={() => setShowCustomCard(!showCustomCard)}
              className={styles.customToggleButton}
            >
              <span className={styles.customToggleIcon}>{showCustomCard ? '▼' : '▶'}</span>
              <span>⚙️ Custom Setup</span>
            </button>
          </div>

          {/* Custom Setup Card */}
          {showCustomCard && (
            <div
              className={`${styles.customCard} ${selectedRoute === 'custom' ? styles.customCardSelected : ''}`}
            >
              <div className={styles.customCardHeader}>
                <span className={styles.routeIcon}>⚙️</span>
                <span className={styles.customCardTitle}>Custom Setup</span>
              </div>

              <div className={styles.customCardContent}>
                {/* Protocol Dropdown */}
                <div className={styles.customField}>
                  <label htmlFor="custom-protocol" className={styles.customLabel}>
                    Protocol
                  </label>
                  <select
                    id="custom-protocol"
                    value={customProtocol || ''}
                    onChange={(e) => {
                      setCustomProtocol(e.target.value);
                      // Reset multiplier if it exceeds new protocol's max
                      const newMax = getMaxMultiplierForProtocol(e.target.value);
                      if (customMultiplier > newMax) {
                        setCustomMultiplier(Math.min(customMultiplier, newMax));
                      }
                    }}
                    className={styles.customSelect}
                  >
                    {supportedProtocols.map((protocol) => (
                      <option key={protocol.id} value={protocol.id}>
                        {protocol.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Multiplier Slider */}
                <div className={styles.customField}>
                  <label htmlFor="custom-multiplier" className={styles.customLabel}>
                    Multiplier: <strong>{customMultiplier.toFixed(1)}x</strong>
                  </label>
                  <input
                    id="custom-multiplier"
                    type="range"
                    min="1.1"
                    max={Math.max(currentMaxMultiplier, 1.1)}
                    step="0.1"
                    value={customMultiplier}
                    onChange={(e) => setCustomMultiplier(parseFloat(e.target.value))}
                    className={styles.customSlider}
                  />
                  <div className={styles.customSliderLabels}>
                    <span>1.1x</span>
                    <span className={styles.maxLabel}>Max: {currentMaxMultiplier.toFixed(1)}x</span>
                  </div>
                </div>

                {/* Validation Error */}
                {isMultiplierExceeded && (
                  <div className={styles.validationError}>
                    ⚠️ Multiplier exceeds maximum ({currentMaxMultiplier.toFixed(1)}x) for this
                    protocol
                  </div>
                )}

                {/* Custom Preview Loading */}
                {isLoadingCustomPreview && (
                  <div className={styles.customPreviewLoading}>
                    <div className={styles.spinnerSmall} />
                    <span>Calculating preview...</span>
                  </div>
                )}

                {/* Custom Preview Error */}
                {customPreviewError && !isLoadingCustomPreview && (
                  <div className={styles.customPreviewError}>
                    Failed to calculate preview. Try a lower multiplier.
                  </div>
                )}

                {/* Custom Preview Results */}
                {customPreview && !isLoadingCustomPreview && !isMultiplierExceeded && (
                  <div className={styles.customPreviewResults}>
                    <div className={styles.customPreviewRow}>
                      <span>Max available:</span>
                      <span>{customPreview.maxMultiplier.toFixed(1)}x</span>
                    </div>
                    <div className={styles.customPreviewRow}>
                      <span>LTV:</span>
                      <span>{customPreview.ltvPercent.toFixed(1)}%</span>
                    </div>
                    <div className={styles.customPreviewRow}>
                      <span>Net APY:</span>
                      <span
                        className={customPreview.netApy >= 0 ? styles.positive : styles.negative}
                      >
                        {formatApy(customPreview.netApy)}
                      </span>
                    </div>
                    <div className={styles.customPreviewRow}>
                      <span>Liq. Price:</span>
                      <span>
                        {formatLiquidationPrice(
                          customPreview.liquidationPrice,
                          customPreview.priceDropBuffer
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Select Custom Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (customPreview && customProtocol && !isMultiplierExceeded) {
                      const customRoute: LeverageRoute = {
                        protocol: PROTOCOL_ID_TO_ENUM[customProtocol],
                        multiplier: customMultiplier,
                        preview: customPreview,
                      };
                      onRouteSelect('custom', customRoute);
                    }
                  }}
                  disabled={!customPreview || isMultiplierExceeded || isLoadingCustomPreview}
                  className={styles.selectCustomButton}
                >
                  {selectedRoute === 'custom' ? '✓ Selected' : 'Select Custom Route'}
                </button>
              </div>
            </div>
          )}

          {/* Failed Protocols Warning */}
          {routeResult.failedProtocols.length > 0 && (
            <div className={styles.warningBox}>
              <p>⚠️ Some protocols are currently unavailable:</p>
              <ul>
                {routeResult.failedProtocols.map((failed: { protocol: string; error: string }) => (
                  <li key={failed.protocol}>
                    {failed.protocol}: {failed.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
