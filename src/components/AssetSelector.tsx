import { useQuery } from '@tanstack/react-query';
import { useDefiDash } from '../hooks/useDefiDash';
import { SUPPORTED_TOKENS } from '../config/protocols';
import styles from './AssetSelector.module.css';

interface AssetSelectorProps {
  selectedAsset: string | null;
  onAssetSelect: (asset: string) => void;
}

const SUPPORTED_ASSETS = ['SUI', 'LBTC', 'XBTC'] as const;

export function AssetSelector({ selectedAsset, onAssetSelect }: AssetSelectorProps) {
  const { getTokenPrice, isConnected } = useDefiDash();

  const { data: prices = {} } = useQuery({
    queryKey: ['tokenPrices'],
    queryFn: async () => {
      const pricePromises = SUPPORTED_ASSETS.map(async (asset) => {
        try {
          const price = await getTokenPrice(asset);
          return [asset, price] as const;
        } catch (error) {
          console.warn(`Failed to fetch price for ${asset}:`, error);
          return [asset, 0] as const;
        }
      });
      
      const priceResults = await Promise.all(pricePromises);
      return Object.fromEntries(priceResults);
    },
    enabled: true,
    staleTime: 30_000, // 30 seconds
  });

  const formatPrice = (price: number) => {
    if (price === 0) return '--';
    return price >= 1 
      ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `$${price.toFixed(4)}`;
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Select Asset to Leverage</h3>
      <p className={styles.description}>
        Choose the asset you want to deposit and leverage up using borrowing protocols.
      </p>
      
      <div className={styles.assetGrid}>
        {SUPPORTED_ASSETS.map((asset) => {
          const tokenInfo = SUPPORTED_TOKENS[asset];
          const price = prices[asset] || 0;
          const isSelected = selectedAsset === asset;
          
          return (
            <button
              key={asset}
              type="button"
              onClick={() => onAssetSelect(asset)}
              className={`${styles.assetCard} ${isSelected ? styles.assetCardSelected : ''}`}
            >
              <div className={styles.assetHeader}>
                {tokenInfo?.icon && (
                  <img
                    src={tokenInfo.icon}
                    alt={asset}
                    className={styles.assetIcon}
                    width={40}
                    height={40}
                  />
                )}
                <div className={styles.assetInfo}>
                  <div className={styles.assetSymbol}>{asset}</div>
                  <div className={styles.assetName}>{tokenInfo?.name || asset}</div>
                </div>
              </div>
              <div className={styles.assetPrice}>
                {formatPrice(price)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}