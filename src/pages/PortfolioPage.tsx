import { useCurrentAccount } from '@mysten/dapp-kit';
import styles from './PortfolioPage.module.css';
import appStyles from '../App.module.css';
import { formatNumber, formatPercentValue } from '../utils/format';
import { usePortfolioQuery } from '../hooks/usePortfolio';
import { useHealthAlerts } from '../hooks/useHealthAlerts';
import { PositionCard } from '../components/PositionCard';
import { SkeletonTable } from '../components/SkeletonTable';
import { AlertBanner } from '../components/AlertBanner';

export function PortfolioPage() {
  const account = useCurrentAccount();
  const { portfolios, summary, isLoading, refetch } = usePortfolioQuery();

  const totalCollateral = summary.totalSuppliedUsd;
  const totalBorrow = summary.totalBorrowedUsd;
  const netValue = totalCollateral - totalBorrow;
  const netAprPct = summary.netAprPct !== undefined ? summary.netAprPct : 0;
  const calculatedHealthFactor = summary.healthFactor;

  // Health monitoring alerts
  const {
    alertLevel,
    config,
    notificationPermission,
    updateThresholds,
    toggleBrowserNotifications,
  } = useHealthAlerts(calculatedHealthFactor);

  // Risk percentage for health bar
  const riskPercentage =
    calculatedHealthFactor > 0 && calculatedHealthFactor !== Infinity
      ? Math.min(Math.max((1 / calculatedHealthFactor) * 100, 0), 100)
      : 0;

  // Filter out empty portfolios
  const activePortfolios = portfolios.filter(
    (p) => p.positions && p.positions.some((pos) => pos.amount > 0)
  );

  if (!account) {
    return (
      <main className={appStyles.content}>
        <section className={styles.container}>
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🔗</span>
            <h2>Connect Your Wallet</h2>
            <p>Connect your wallet to view your DeFi positions across all supported protocols.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={appStyles.content}>
      <section className={styles.container}>
        {/* Health Alert Banner */}
        {account && !isLoading && (
          <AlertBanner
            alertLevel={alertLevel}
            healthFactor={calculatedHealthFactor}
            thresholds={config.thresholds}
            browserNotifications={config.browserNotifications}
            notificationPermission={notificationPermission}
            onToggleNotifications={toggleBrowserNotifications}
            onUpdateThresholds={updateThresholds}
          />
        )}

        {/* Overview Section */}
        <div className={styles.overviewSection}>
          <h1 className={styles.pageTitle}>Portfolio</h1>

          <div className={styles.overviewGrid}>
            <div className={styles.overviewCard}>
              <span className={styles.overviewLabel}>Net Worth</span>
              <span className={styles.overviewValue}>${formatNumber(netValue)}</span>
              <div className={styles.overviewBreakdown}>
                <span className={styles.breakdownItem}>
                  Collateral: ${formatNumber(totalCollateral)}
                </span>
                <span className={styles.breakdownItem}>Debt: -${formatNumber(totalBorrow)}</span>
              </div>
            </div>

            <div className={styles.overviewCard}>
              <span className={styles.overviewLabel}>Net APY</span>
              <span
                className={`${styles.overviewValue} ${netAprPct >= 0 ? styles.positive : styles.negative}`}
              >
                {formatPercentValue(netAprPct)}
              </span>
              <span className={styles.overviewSubtext}>
                Est. $
                {formatNumber(
                  portfolios.reduce((sum, p) => sum + (p.totalAnnualNetEarningsUsd || 0), 0)
                )}{' '}
                /year
              </span>
            </div>

            <div className={styles.overviewCard}>
              <span className={styles.overviewLabel}>Health Factor</span>
              <span className={styles.overviewValue}>
                {calculatedHealthFactor === Infinity ? '∞' : calculatedHealthFactor.toFixed(2)}
              </span>
              <div className={styles.healthBar}>
                <div className={styles.healthIndicator} style={{ left: `${riskPercentage}%` }} />
              </div>
              <div className={styles.healthLabels}>
                <span>Safe</span>
                <span>Risk</span>
              </div>
            </div>
          </div>
        </div>

        {/* Positions Section */}
        <div className={styles.positionsSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Active Positions</h2>
            <span className={styles.positionCount}>
              {activePortfolios.length} protocol{activePortfolios.length !== 1 ? 's' : ''}
            </span>
          </div>

          {isLoading && (
            <div className={styles.loadingState}>
              <SkeletonTable rows={3} columns={4} />
            </div>
          )}

          {!isLoading && activePortfolios.length === 0 && (
            <div className={styles.emptyPositions}>
              <span className={styles.emptyIcon}>📊</span>
              <h3>No Active Positions</h3>
              <p>Create your first leveraged position to start earning.</p>
              <a href="/strategy" className={styles.ctaButton}>
                Create Position →
              </a>
            </div>
          )}

          {!isLoading && activePortfolios.length > 0 && (
            <div className={styles.positionCards}>
              {activePortfolios.map((portfolio) => (
                <PositionCard key={portfolio.protocol} portfolio={portfolio} onRefresh={refetch} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
