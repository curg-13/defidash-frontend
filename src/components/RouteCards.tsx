import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDefiDash } from '../hooks/useDefiDash';
import { SUPPORTED_TOKENS } from '../config/protocols';
import type { LeverageRouteResult, LeverageRoute } from 'defi-dash-sdk';
import styles from './RouteCards.module.css';

interface RouteCardsProps {
  selectedAsset: string;
  amount: string;
  onAmountChange: (amount: string) => void;
  selectedRoute: 'maxLeverage' | 'bestApy' | null;
  onRouteSelect: (route: 'maxLeverage' | 'bestApy', routeData: LeverageRoute) => void;
}

export function RouteCards({ selectedAsset, amount, onAmountChange, selectedRoute, onRouteSelect }: RouteCardsProps) {
  const { findBestLeverageRoute, getTokenBalance, isConnected } = useDefiDash();
  const [maxButtonClicked, setMaxButtonClicked] = useState(false);

  const tokenInfo = SUPPORTED_TOKENS[selectedAsset as keyof typeof SUPPORTED_TOKENS];

  // Get wallet balance for the selected asset
  const { data: balance = '0' } = useQuery({
    queryKey: ['tokenBalance', selectedAsset],
    queryFn: () => getTokenBalance(tokenInfo?.coinType || ''),
    enabled: isConnected && !!tokenInfo?.coinType,
  });

  // Find best routes when amount is entered
  const { data: routeResult, isLoading: isLoadingRoutes, error: routeError } = useQuery({
    queryKey: ['bestRoute', selectedAsset, amount],
    queryFn: (): Promise<LeverageRouteResult> => 
      findBestLeverageRoute({
        depositAsset: selectedAsset,
        depositAmount: amount,
      }),
    enabled: !!amount && parseFloat(amount) > 0,
    staleTime: 0, // No cache - always fetch fresh rates
  });

  const formatBalance = (bal: string) => {
    const balanceNum = parseFloat(bal) / Math.pow(10, tokenInfo?.decimals || 9);
    return balanceNum.toFixed(4);
  };

  const handleMaxClick = () => {
    const balanceNum = parseFloat(balance) / Math.pow(10, tokenInfo?.decimals || 9);
    // Leave a small buffer for gas fees
    const maxAmount = Math.max(0, balanceNum - 0.01).toString();
    onAmountChange(maxAmount);
    setMaxButtonClicked(true);
  };

  const formatMultiplier = (mult: number) => `${mult.toFixed(2)}x`;
  const formatApy = (apy: number) => {
    const sign = apy >= 0 ? '+' : '';
    return `${sign}${(apy * 100).toFixed(2)}%`;
  };
  
  const formatPrice = (price: number) => `$${price.toFixed(2)}`;

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
  const isSameProtocol = routeResult && 
    routeResult.bestMaxMultiplier.protocol === routeResult.bestApy.protocol;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Enter Amount & Find Best Route</h3>
      <p className={styles.description}>
        Enter the amount of {selectedAsset} you want to leverage, and we'll find the best protocols for you.
      </p>

      {/* Amount Input */}
      <div className={styles.amountSection}>
        <div className={styles.amountLabel}>
          <span>Deposit Amount</span>
          <span className={styles.balance}>
            Balance: {formatBalance(balance)} {selectedAsset}
          </span>
        </div>
        <div className={styles.amountInput}>
          <input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            className={styles.input}
            step="0.01"
          />
          <div className={styles.inputSuffix}>
            <button type="button" onClick={handleMaxClick} className={styles.maxButton}>
              MAX
            </button>
            <span className={styles.assetSymbol}>{selectedAsset}</span>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoadingRoutes && amount && parseFloat(amount) > 0 && (
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
                    Protocol: {routeResult.bestApy.protocol}
                  </div>
                </div>
                <div className={styles.routeMetrics}>
                  <div className={styles.metric}>
                    <span>Multiplier:</span>
                    <span>{formatMultiplier(routeResult.bestApy.multiplier)}</span>
                  </div>
                  <div className={styles.metric}>
                    <span>Net APY:</span>
                    <span className={routeResult.bestApy.preview.netApy >= 0 ? styles.positive : styles.negative}>
                      {formatApy(routeResult.bestApy.preview.netApy)}
                    </span>
                  </div>
                  <div className={styles.metric}>
                    <span>Liq. Price:</span>
                    <span>{formatPrice(routeResult.bestApy.preview.liquidationPrice)}</span>
                  </div>
                  <div className={styles.riskRow}>
                    <span>Risk:</span>
                    <div className={styles.riskIndicator}>
                      {renderRiskBars(getRiskLevel(routeResult.bestApy.multiplier).bars)}
                      <span className={styles.riskLabel}>{getRiskLevel(routeResult.bestApy.multiplier).level}</span>
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
                    Protocol: {routeResult.bestMaxMultiplier.protocol}
                  </div>
                </div>
                <div className={styles.routeMetrics}>
                  <div className={styles.metric}>
                    <span>Multiplier:</span>
                    <span>{formatMultiplier(routeResult.bestMaxMultiplier.multiplier)}</span>
                  </div>
                  <div className={styles.metric}>
                    <span>Net APY:</span>
                    <span className={routeResult.bestMaxMultiplier.preview.netApy >= 0 ? styles.positive : styles.negative}>
                      {formatApy(routeResult.bestMaxMultiplier.preview.netApy)}
                    </span>
                  </div>
                  <div className={styles.metric}>
                    <span>Liq. Price:</span>
                    <span>{formatPrice(routeResult.bestMaxMultiplier.preview.liquidationPrice)}</span>
                  </div>
                  <div className={styles.riskRow}>
                    <span>Risk:</span>
                    <div className={styles.riskIndicator}>
                      {renderRiskBars(getRiskLevel(routeResult.bestMaxMultiplier.multiplier).bars)}
                      <span className={styles.riskLabel}>{getRiskLevel(routeResult.bestMaxMultiplier.multiplier).level}</span>
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
                    Protocol: {routeResult.bestApy.protocol}
                  </div>
                </div>
                <div className={styles.routeMetrics}>
                  <div className={styles.metric}>
                    <span>Multiplier:</span>
                    <span>{formatMultiplier(routeResult.bestApy.multiplier)}</span>
                  </div>
                  <div className={styles.metric}>
                    <span>Net APY:</span>
                    <span className={routeResult.bestApy.preview.netApy >= 0 ? styles.positive : styles.negative}>
                      {formatApy(routeResult.bestApy.preview.netApy)}
                    </span>
                  </div>
                  <div className={styles.metric}>
                    <span>Liq. Price:</span>
                    <span>{formatPrice(routeResult.bestApy.preview.liquidationPrice)}</span>
                  </div>
                  <div className={styles.riskRow}>
                    <span>Risk:</span>
                    <div className={styles.riskIndicator}>
                      {renderRiskBars(getRiskLevel(routeResult.bestApy.multiplier).bars)}
                      <span className={styles.riskLabel}>{getRiskLevel(routeResult.bestApy.multiplier).level}</span>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Failed Protocols Warning */}
          {routeResult.failedProtocols.length > 0 && (
            <div className={styles.warningBox}>
              <p>⚠️ Some protocols are currently unavailable:</p>
              <ul>
                {routeResult.failedProtocols.map((failed: { protocol: string; error: string }) => (
                  <li key={failed.protocol}>{failed.protocol}: {failed.error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}