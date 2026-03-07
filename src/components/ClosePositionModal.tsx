import { useState } from 'react';
import { Modal } from './Modal';
import { useDefiDash, LendingProtocol } from '../hooks/useDefiDash';
import { formatNumber, formatPercent } from '../utils/format';
import { protocolsById } from '../config/protocols';
import styles from './ClosePositionModal.module.css';

interface Position {
  symbol: string;
  amount: number;
  valueUsd: number;
  apy: number;
  side: 'supply' | 'borrow';
}

interface ProtocolPortfolio {
  protocol: string;
  positions: Position[];
  totalCollateralUsd: number;
  totalDebtUsd: number;
  healthFactor: number;
}

interface ClosePositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolio: ProtocolPortfolio;
  onSuccess?: () => void;
}

export function ClosePositionModal({
  isOpen,
  onClose,
  portfolio,
  onSuccess,
}: ClosePositionModalProps) {
  const { closeLeverage } = useDefiDash();
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const protocolInfo = protocolsById[portfolio.protocol];
  const supplyPositions = portfolio.positions.filter((p) => p.side === 'supply');
  const borrowPositions = portfolio.positions.filter((p) => p.side === 'borrow');
  const netValue = portfolio.totalCollateralUsd - portfolio.totalDebtUsd;

  const handleClose = async () => {
    setIsClosing(true);
    setError(null);

    try {
      const protocolEnum =
        portfolio.protocol === 'navi'
          ? LendingProtocol.Navi
          : portfolio.protocol === 'suilend'
            ? LendingProtocol.Suilend
            : LendingProtocol.Scallop;

      await closeLeverage(protocolEnum);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close position');
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Close Position">
      <div className={styles.container}>
        {/* Protocol Header */}
        <div className={styles.protocolHeader}>
          {protocolInfo && (
            <img src={protocolInfo.logo} alt={protocolInfo.name} className={styles.protocolLogo} />
          )}
          <span className={styles.protocolName}>{protocolInfo?.name || portfolio.protocol}</span>
        </div>

        {/* Position Summary */}
        <div className={styles.summaryGrid}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Collateral</span>
            <span className={styles.summaryValue}>
              ${formatNumber(portfolio.totalCollateralUsd)}
            </span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Debt</span>
            <span className={styles.summaryValueNegative}>
              ${formatNumber(portfolio.totalDebtUsd)}
            </span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Net Value</span>
            <span className={styles.summaryValueHighlight}>${formatNumber(netValue)}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Health Factor</span>
            <span className={styles.summaryValue}>
              {portfolio.healthFactor === Infinity ? '∞' : portfolio.healthFactor.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Position Details */}
        <div className={styles.positionDetails}>
          <h4 className={styles.sectionTitle}>Supplied Assets</h4>
          <div className={styles.assetList}>
            {supplyPositions.map((pos, idx) => (
              <div key={idx} className={styles.assetRow}>
                <span className={styles.assetSymbol}>{pos.symbol}</span>
                <span className={styles.assetAmount}>{formatNumber(pos.amount)}</span>
                <span className={styles.assetValue}>${formatNumber(pos.valueUsd)}</span>
                <span className={styles.assetApy}>{formatPercent(pos.apy)}</span>
              </div>
            ))}
          </div>

          {borrowPositions.length > 0 && (
            <>
              <h4 className={styles.sectionTitle}>Borrowed Assets</h4>
              <div className={styles.assetList}>
                {borrowPositions.map((pos, idx) => (
                  <div key={idx} className={styles.assetRow}>
                    <span className={styles.assetSymbol}>{pos.symbol}</span>
                    <span className={styles.assetAmount}>{formatNumber(pos.amount)}</span>
                    <span className={styles.assetValueNegative}>
                      -${formatNumber(pos.valueUsd)}
                    </span>
                    <span className={styles.assetApyNegative}>-{formatPercent(pos.apy)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Estimated Output */}
        <div className={styles.estimatedOutput}>
          <span className={styles.outputLabel}>Estimated Return</span>
          <span className={styles.outputValue}>~${formatNumber(netValue * 0.995)}</span>
          <span className={styles.outputNote}>After swap fees (~0.5%)</span>
        </div>

        {/* Error */}
        {error && <div className={styles.error}>⚠️ {error}</div>}

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={onClose} disabled={isClosing}>
            Cancel
          </button>
          <button className={styles.closeButton} onClick={handleClose} disabled={isClosing}>
            {isClosing ? 'Closing...' : 'Close Position'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
