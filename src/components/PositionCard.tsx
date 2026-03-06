import { useState } from 'react';
import { formatNumber, formatPercent } from '../utils/format';
import { protocolsById } from '../config/protocols';
import { ClosePositionModal } from './ClosePositionModal';
import styles from './PositionCard.module.css';

interface Position {
  symbol: string;
  amount: number;
  valueUsd: number;
  apy: number;
  side: 'supply' | 'borrow';
  coinType: string;
  estimatedLiquidationPrice?: number;
  rewards?: { symbol: string; amount: number }[];
}

interface ProtocolPortfolio {
  protocol: string;
  positions: Position[];
  totalCollateralUsd: number;
  totalDebtUsd: number;
  healthFactor: number;
  totalAnnualNetEarningsUsd?: number;
}

interface PositionCardProps {
  portfolio: ProtocolPortfolio;
  onRefresh?: () => void;
}

export function PositionCard({ portfolio, onRefresh }: PositionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  const protocolInfo = protocolsById[portfolio.protocol];
  const netValue = portfolio.totalCollateralUsd - portfolio.totalDebtUsd;
  const supplyPositions = portfolio.positions.filter((p) => p.side === 'supply' && p.amount > 0);
  const borrowPositions = portfolio.positions.filter((p) => p.side === 'borrow' && p.amount > 0);

  // Calculate leverage ratio
  const leverageRatio = portfolio.totalDebtUsd > 0 ? portfolio.totalCollateralUsd / netValue : 1;

  // Health factor color
  const getHealthColor = (hf: number) => {
    if (hf === Infinity || hf > 2) return '#4ade80';
    if (hf > 1.5) return '#fbbf24';
    return '#ff6b6b';
  };

  // Net APY (annual earnings / net value)
  const netApy =
    portfolio.totalAnnualNetEarningsUsd && netValue > 0
      ? (portfolio.totalAnnualNetEarningsUsd / netValue) * 100
      : 0;

  return (
    <>
      <div className={styles.card}>
        {/* Card Header */}
        <div
          className={styles.cardHeader}
          onClick={() => setIsExpanded(!isExpanded)}
          onKeyDown={(e) => e.key === 'Enter' && setIsExpanded(!isExpanded)}
          role="button"
          tabIndex={0}
        >
          <div className={styles.protocolInfo}>
            {protocolInfo && (
              <img
                src={protocolInfo.logo}
                alt={protocolInfo.name}
                className={styles.protocolLogo}
              />
            )}
            <div className={styles.protocolMeta}>
              <span className={styles.protocolName}>
                {protocolInfo?.name || portfolio.protocol}
              </span>
              <span className={styles.leverageBadge}>{leverageRatio.toFixed(1)}x</span>
            </div>
          </div>

          <div className={styles.headerStats}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Net Value</span>
              <span className={styles.statValue}>${formatNumber(netValue)}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Net APY</span>
              <span
                className={`${styles.statValue} ${netApy >= 0 ? styles.positive : styles.negative}`}
              >
                {netApy >= 0 ? '+' : ''}
                {netApy.toFixed(2)}%
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Health</span>
              <span
                className={styles.statValue}
                style={{ color: getHealthColor(portfolio.healthFactor) }}
              >
                {portfolio.healthFactor === Infinity ? '∞' : portfolio.healthFactor.toFixed(2)}
              </span>
            </div>
          </div>

          <span className={`${styles.expandIcon} ${isExpanded ? styles.expanded : ''}`}>▾</span>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className={styles.cardBody}>
            {/* Collateral Section */}
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>
                Collateral
                <span className={styles.sectionValue}>
                  ${formatNumber(portfolio.totalCollateralUsd)}
                </span>
              </h4>
              <div className={styles.positionList}>
                {supplyPositions.map((pos, idx) => (
                  <div key={idx} className={styles.positionRow}>
                    <div className={styles.positionAsset}>
                      <span className={styles.positionSymbol}>{pos.symbol}</span>
                      <span className={styles.positionAmount}>{formatNumber(pos.amount)}</span>
                    </div>
                    <div className={styles.positionStats}>
                      <span className={styles.positionValue}>${formatNumber(pos.valueUsd)}</span>
                      <span className={styles.positionApy}>{formatPercent(pos.apy)}</span>
                    </div>
                    {pos.estimatedLiquidationPrice && (
                      <div className={styles.liqPrice}>
                        Liq: ${formatNumber(pos.estimatedLiquidationPrice, 2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Debt Section */}
            {borrowPositions.length > 0 && (
              <div className={styles.section}>
                <h4 className={styles.sectionTitle}>
                  Debt
                  <span className={styles.sectionValueNegative}>
                    -${formatNumber(portfolio.totalDebtUsd)}
                  </span>
                </h4>
                <div className={styles.positionList}>
                  {borrowPositions.map((pos, idx) => (
                    <div key={idx} className={styles.positionRow}>
                      <div className={styles.positionAsset}>
                        <span className={styles.positionSymbol}>{pos.symbol}</span>
                        <span className={styles.positionAmount}>{formatNumber(pos.amount)}</span>
                      </div>
                      <div className={styles.positionStats}>
                        <span className={styles.positionValueNegative}>
                          -${formatNumber(pos.valueUsd)}
                        </span>
                        <span className={styles.positionApyNegative}>
                          -{formatPercent(pos.apy)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className={styles.cardActions}>
              <button className={styles.closeButton} onClick={() => setIsCloseModalOpen(true)}>
                Close Position
              </button>
            </div>
          </div>
        )}
      </div>

      <ClosePositionModal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        portfolio={portfolio}
        onSuccess={onRefresh}
      />
    </>
  );
}
