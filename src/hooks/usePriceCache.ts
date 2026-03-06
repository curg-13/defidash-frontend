import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDefiDash } from './useDefiDash';

const PRICE_CACHE_TTL = 60_000; // 60 seconds

interface PriceData {
  price: number;
  timestamp: number;
}

// Hook for fetching a single token price with caching
export function useTokenPrice(asset: string) {
  const { getTokenPrice } = useDefiDash();

  return useQuery({
    queryKey: ['tokenPrice', asset],
    queryFn: async (): Promise<PriceData> => {
      const price = await getTokenPrice(asset);
      return {
        price,
        timestamp: Date.now(),
      };
    },
    staleTime: PRICE_CACHE_TTL,
    gcTime: PRICE_CACHE_TTL * 2,
    refetchOnWindowFocus: false,
  });
}

// Hook for fetching multiple token prices with caching
export function useTokenPrices(assets: readonly string[]) {
  const { getTokenPrice } = useDefiDash();

  return useQuery({
    queryKey: ['tokenPrices', assets.join(',')],
    queryFn: async () => {
      const results: Record<string, PriceData> = {};

      await Promise.all(
        assets.map(async (asset) => {
          try {
            const price = await getTokenPrice(asset);
            results[asset] = {
              price,
              timestamp: Date.now(),
            };
          } catch (error) {
            console.warn(`Failed to fetch price for ${asset}:`, error);
            results[asset] = {
              price: 0,
              timestamp: Date.now(),
            };
          }
        })
      );

      return results;
    },
    staleTime: PRICE_CACHE_TTL,
    gcTime: PRICE_CACHE_TTL * 2,
    refetchOnWindowFocus: false,
  });
}

// Utility hook for cache management
export function usePriceCacheUtils() {
  const queryClient = useQueryClient();

  const invalidatePrice = (asset: string) => {
    queryClient.invalidateQueries({ queryKey: ['tokenPrice', asset] });
  };

  const invalidateAllPrices = () => {
    queryClient.invalidateQueries({ queryKey: ['tokenPrices'] });
  };

  const getCacheAge = (timestamp: number): string => {
    const age = Date.now() - timestamp;
    if (age < 1000) return 'just now';
    if (age < 60_000) return `${Math.floor(age / 1000)}s ago`;
    return `${Math.floor(age / 60_000)}m ago`;
  };

  return {
    invalidatePrice,
    invalidateAllPrices,
    getCacheAge,
    CACHE_TTL: PRICE_CACHE_TTL,
  };
}
