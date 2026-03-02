/**
 * useDefiDash Hook
 *
 * Clean SDK integration for browser wallet using defi-dash-sdk
 */
import { useCallback, useRef } from 'react';
import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Transaction } from '@mysten/sui/transactions';
import * as DefiDashSDKLib from 'defi-dash-sdk';
import type {
  DefiDashSDK as DefiDashSDKType,
  LendingProtocol as LendingProtocolType,
  BrowserLeverageParams,
  BrowserDeleverageParams,
  FindBestRouteParams,
  LeverageRoute,
  LeveragePreview,
} from 'defi-dash-sdk';

// Extract values
const { DefiDashSDK, LendingProtocol } = DefiDashSDKLib;

// Define local types matching the library
type DefiDashSDK = DefiDashSDKType;
type LendingProtocol = LendingProtocolType;

export { LendingProtocol };

export interface LeverageParams {
  protocol: LendingProtocol;
  depositAsset: string;
  depositAmount: string;
  multiplier: number;
}

export function useDefiDash() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const sdkRef = useRef<DefiDashSDK | null>(null);
  const readOnlySDKRef = useRef<DefiDashSDK | null>(null);

  // Initialize SDK (lazy) - Updated for v0.1.4
  const getSDK = useCallback(async () => {
    if (!account?.address) throw new Error('Wallet not connected');

    if (!sdkRef.current) {
      sdkRef.current = await DefiDashSDK.create(suiClient as any, account.address);
    }
    return sdkRef.current;
  }, [account, suiClient]);

  // Initialize read-only SDK for price fetching without wallet connection
  const getReadOnlySDK = useCallback(async () => {
    if (!readOnlySDKRef.current) {
      // Use zero address for read-only operations
      const readOnlyAddress = '0x0000000000000000000000000000000000000000000000000000000000000000';
      readOnlySDKRef.current = await DefiDashSDK.create(suiClient as any, readOnlyAddress);
    }
    return readOnlySDKRef.current;
  }, [suiClient]);

  // Open Leverage Position
  const openLeverage = useCallback(
    async (params: LeverageParams) => {
      const sdk = await getSDK();

      const tx = new Transaction();
      tx.setSender(account!.address);
      tx.setGasBudget(200_000_000);

      await sdk.buildLeverageTransaction(tx, params);

      return signAndExecute({ transaction: tx as any });
    },
    [account, getSDK, signAndExecute]
  );

  // Close Position (Deleverage)
  const closeLeverage = useCallback(
    async (protocol: LendingProtocol) => {
      const sdk = await getSDK();

      const tx = new Transaction();
      tx.setSender(account!.address);
      tx.setGasBudget(200_000_000);

      const deleverageParams: BrowserDeleverageParams = { protocol };
      await sdk.buildDeleverageTransaction(tx, deleverageParams);

      return signAndExecute({ transaction: tx as any });
    },
    [account, getSDK, signAndExecute]
  );

  // Get Current Position
  const getPosition = useCallback(
    async (protocol: LendingProtocol) => {
      const sdk = await getSDK();
      return sdk.getPosition(protocol);
    },
    [getSDK]
  );

  // Dry Run (Simulation)
  const dryRunLeverage = useCallback(
    async (params: LeverageParams) => {
      const sdk = await getSDK();

      const tx = new Transaction();
      tx.setSender(account!.address);
      tx.setGasBudget(200_000_000);

      await sdk.buildLeverageTransaction(tx, params);

      const result = await suiClient.dryRunTransactionBlock({
        transactionBlock: await tx.build({ client: suiClient as any }),
      });

      return {
        success: result.effects.status.status === 'success',
        error: result.effects.status.error,
        effects: result.effects,
      };
    },
    [account, getSDK, suiClient]
  );

  const getPortfolio = useCallback(async () => {
    const sdk = await getSDK();
    return sdk.getAggregatedPortfolio();
  }, [getSDK]);

  // TODO: removed in SDK v0.1.4 — needs alternative implementation
  // const getMarkets = useCallback(async () => {
  //   const sdk = await getSDK();
  //   return sdk.getAggregatedMarkets();
  // }, [getSDK]);

  const previewLeverage = useCallback(
    async (params: { protocol: LendingProtocol; depositAsset: string; depositAmount: string; multiplier: number }) => {
      const sdk = await getSDK();
      return sdk.previewLeverage(params);
    },
    [getSDK]
  );

  const getBalances = useCallback(async () => {
    // Use native suiClient directly
    if (!account?.address) return [];
    return suiClient.getAllBalances({ owner: account.address });
  }, [account, suiClient]);

  const getTokenBalance = useCallback(
    async (coinType: string) => {
      // Use native suiClient directly for simple balance checks
      if (!account?.address) return '0';
      const balance = await suiClient.getBalance({
        owner: account.address,
        coinType,
      });
      return balance.totalBalance;
    },
    [account, suiClient]
  );

  // TODO: removed in SDK v0.1.4 — needs alternative implementation
  // const getMaxBorrowable = useCallback(
  //   async (protocol: LendingProtocol, coinType: string) => {
  //     const sdk = await getSDK();
  //     if (!account?.address) return '0';
  //     return sdk.getMaxBorrowable(protocol, coinType);
  //   },
  //   [account, getSDK]
  // );

  // TODO: removed in SDK v0.1.4 — needs alternative implementation
  // const getMaxWithdrawable = useCallback(
  //   async (protocol: LendingProtocol, coinType: string) => {
  //     const sdk = await getSDK();
  //     if (!account?.address) return '0';
  //     return sdk.getMaxWithdrawable(protocol, coinType);
  //   },
  //   [account, getSDK]
  // );

  // New methods in SDK v0.1.4
  const findBestLeverageRoute = useCallback(
    async (params: FindBestRouteParams) => {
      const sdk = await getSDK();
      return sdk.findBestLeverageRoute(params);
    },
    [getSDK]
  );

  const getOpenPositions = useCallback(async () => {
    const sdk = await getSDK();
    return sdk.getOpenPositions();
  }, [getSDK]);

  const getTokenPrice = useCallback(async (asset: string) => {
    // Use read-only SDK if wallet is not connected, otherwise use regular SDK
    const sdk = account?.address ? await getSDK() : await getReadOnlySDK();
    return sdk.getTokenPrice(asset);
  }, [account, getSDK, getReadOnlySDK]);

  return {
    isConnected: !!account?.address,
    address: account?.address,
    openLeverage,
    closeLeverage,
    getPosition,
    dryRunLeverage,
    getPortfolio,
    // getMarkets, // TODO: removed in SDK v0.1.4 — needs alternative implementation
    previewLeverage,
    getBalances,
    getTokenBalance,
    // getMaxBorrowable, // TODO: removed in SDK v0.1.4 — needs alternative implementation
    // getMaxWithdrawable, // TODO: removed in SDK v0.1.4 — needs alternative implementation
    findBestLeverageRoute, // New in SDK v0.1.4
    getOpenPositions, // New in SDK v0.1.4
    getTokenPrice,
    getSDK, // Exposed for other hooks
  };
}

// Transaction hooks remain here

export function useLeverageTransaction() {
  const { openLeverage } = useDefiDash();

  return useMutation({
    mutationFn: async ({
      depositAmount,
      leverage,
      symbol = 'SUI',
      protocol = LendingProtocol.Suilend,
    }: {
      depositAmount: string;
      leverage: number;
      symbol?: string;
      protocol?: LendingProtocol;
    }) => {
      const result = await openLeverage({
        protocol,
        depositAsset: symbol,
        depositAmount,
        multiplier: leverage,
      });

      if (!result) {
        throw new Error('Transaction execution failed');
      }

      return result.digest;
    },
  });
}

export function useDeleverageTransaction() {
  const { closeLeverage } = useDefiDash();

  return useMutation({
    mutationFn: async ({ protocol }: { protocol: LendingProtocol }) => {
      const result = await closeLeverage(protocol);

      if (!result) {
        throw new Error('Transaction execution failed');
      }

      return result.digest;
    },
  });
}
