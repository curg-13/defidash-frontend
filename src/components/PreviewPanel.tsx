import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Transaction } from '@mysten/sui/transactions';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useDefiDash } from '../hooks/useDefiDash';
import type { LeverageRoute } from 'defi-dash-sdk';
import styles from './PreviewPanel.module.css';

interface PreviewPanelProps {
  selectedAsset: string;
  usdValue: string;
  routeData: LeverageRoute;
  onBack: () => void;
}

export function PreviewPanel({ selectedAsset, usdValue, routeData, onBack }: PreviewPanelProps) {
  const navigate = useNavigate();
  const account = useCurrentAccount();
  const queryClient = useQueryClient();
  const { getSDK } = useDefiDash();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const { preview, protocol, multiplier } = routeData;

  const executeLeverage = useMutation({
    mutationFn: async () => {
      if (!account?.address) throw new Error('Wallet not connected');

      const sdk = await getSDK();

      const tx = new Transaction();
      tx.setSender(account.address);
      tx.setGasBudget(200_000_000);

      await sdk.buildLeverageTransaction(tx, {
        protocol,
        depositAsset: selectedAsset,
        depositValueUsd: parseFloat(usdValue),
        multiplier,
      });

      return signAndExecute({ transaction: tx as any });
    },
    onSuccess: (result) => {
      console.log('[PreviewPanel] Transaction Success:', result.digest);
      setShowSuccessToast(true);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['tokenBalance'] });

      // Navigate to portfolio after 2 seconds
      setTimeout(() => {
        navigate('/portfolio');
      }, 2000);
    },
    onError: (error) => {
      console.error('[PreviewPanel] Transaction Failed:', error);
    },
  });

  const formatCurrency = (value: number) =>
    `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // SDK returns APYs as decimals (0.0274 = 2.74%) → need × 100
  const formatPercent = (value: number, showSign = true) => {
    const sign = showSign && value >= 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(2)}%`;
  };

  // SDK returns these already as percentages (13.7 = 13.7%) → NO × 100
  const formatPctDirect = (value: number) => `${value.toFixed(2)}%`;

  const formatLiquidationPrice = (price: number, priceDropBuffer: number) => (
    <>
      {formatCurrency(price)}{' '}
      <span style={{ color: '#ff4444', fontWeight: 500 }}>(-{priceDropBuffer.toFixed(1)}%)</span>
    </>
  );

  const formatMultiplier = (mult: number) => `${mult.toFixed(2)}x`;

  const getHealthColor = (healthFactor: number) => {
    if (healthFactor >= 2) return '#4caf50';
    if (healthFactor >= 1.5) return '#ffc107';
    return '#ff6b6b';
  };

  const getPriceBuffer = () => {
    // Use the price drop buffer directly from preview since we don't have token amount
    return preview.priceDropBuffer * 100; // Convert to percentage
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Position Preview</h3>
      <p className={styles.description}>
        Review your leverage position details before executing the transaction.
      </p>

      <div className={styles.previewCard}>
        <div className={styles.cardHeader}>
          <div className={styles.cardIcon}>📊</div>
          <div className={styles.cardTitle}>Position Preview</div>
        </div>

        <div className={styles.previewContent}>
          {/* Basic Info */}
          <div className={styles.section}>
            <div className={styles.row}>
              <span className={styles.label}>Asset:</span>
              <span className={styles.value}>{selectedAsset}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Protocol:</span>
              <span className={styles.value} style={{ textTransform: 'capitalize' }}>
                {protocol}
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Deposit:</span>
              <span className={styles.value}>{formatCurrency(preview.initialEquityUsd)}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Total Position:</span>
              <span className={styles.value}>{formatCurrency(preview.totalPositionUsd)}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Debt:</span>
              <span className={styles.value}>{formatCurrency(preview.debtUsd)}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Effective Mult:</span>
              <span className={styles.value}>{formatMultiplier(preview.effectiveMultiplier)}</span>
            </div>
          </div>

          <div className={styles.divider} />

          {/* Risk Section */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>— Risk —</div>
            <div className={styles.row}>
              <span className={styles.label}>Health Factor:</span>
              <span
                className={styles.value}
                style={{
                  color: getHealthColor(1 / (preview.ltvPercent / 100)),
                }}
              >
                {(1 / (preview.ltvPercent / 100)).toFixed(2)}
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Liq. Price:</span>
              <span className={styles.value}>
                {formatLiquidationPrice(preview.liquidationPrice, preview.priceDropBuffer)}
              </span>
            </div>
          </div>

          <div className={styles.divider} />

          {/* Returns Section */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>— Returns —</div>
            <div className={styles.row}>
              <span className={styles.label}>Supply APY:</span>
              <span className={styles.value}>
                {formatPercent(preview.supplyApyBreakdown.total, false)}
              </span>
            </div>
            <div className={styles.subRow}>
              <span className={styles.subLabel}>└ Reward:</span>
              <span className={styles.subValue}>
                {formatPercent(preview.supplyApyBreakdown.reward, false)}
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Borrow APY:</span>
              <span className={styles.value}>
                {formatPercent(preview.borrowApyBreakdown.gross, false)}
              </span>
            </div>
            <div className={styles.subRow}>
              <span className={styles.subLabel}>└ Rebate:</span>
              <span className={styles.subValue}>
                {formatPercent(preview.borrowApyBreakdown.rebate)}
              </span>
            </div>
            <div className={styles.subRow}>
              <span className={styles.subLabel}>└ Net:</span>
              <span className={styles.subValue}>
                {formatPercent(preview.borrowApyBreakdown.net, false)}
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Net APY:</span>
              <span
                className={`${styles.value} ${preview.netApy >= 0 ? styles.positive : styles.negative}`}
              >
                {formatPercent(preview.netApy)}
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Est. Earnings:</span>
              <span className={styles.value}>
                {formatCurrency(preview.annualNetEarningsUsd)}/yr
              </span>
            </div>
          </div>

          <div className={styles.divider} />

          {/* Fees Section */}
          <div className={styles.section}>
            <div className={styles.row}>
              <span className={styles.label}>Swap Slippage:</span>
              <span className={styles.value}>{formatPctDirect(preview.swapSlippagePct)}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Flash Loan Fee:</span>
              <span className={styles.value}>{formatCurrency(preview.flashLoanFeeUsd)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <button
            type="button"
            onClick={onBack}
            className={styles.backButton}
            disabled={executeLeverage.isPending}
          >
            ◀ Back
          </button>
          <button
            type="button"
            onClick={() => executeLeverage.mutate()}
            disabled={executeLeverage.isPending || !account}
            className={styles.executeButton}
          >
            {executeLeverage.isPending ? 'Executing...' : 'Open Position'}
          </button>
        </div>

        {/* Error Display */}
        {executeLeverage.error && (
          <div className={styles.errorBox}>
            {(executeLeverage.error as Error).message || 'Transaction failed'}
          </div>
        )}
      </div>

      {/* Success Toast */}
      {showSuccessToast && (
        <div className={styles.successToast}>✅ Position opened! Redirecting to portfolio...</div>
      )}
    </div>
  );
}
