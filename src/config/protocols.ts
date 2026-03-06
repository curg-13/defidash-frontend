import type { Protocol } from '../domain/types';

import naviLogo from '../assets/protocols/navi.png';
import suilendLogo from '../assets/protocols/suilend.png';
import scallopLogo from '../assets/protocols/scallop.png';
import xbtcLogo from '../assets/tokens/xbtc.png';

import suiTokenLogo from '../assets/tokens/sui.png';
import usdcTokenLogo from '../assets/tokens/usdc.png';
import lbtcTokenLogo from '../assets/tokens/lbtc.png';

export const SUPPORTED_TOKENS = {
  SUI: {
    symbol: 'SUI',
    name: 'Sui',
    coinType: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
    decimals: 9,
    icon: suiTokenLogo,
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    coinType: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
    decimals: 6,
    icon: usdcTokenLogo,
  },
  LBTC: {
    symbol: 'LBTC',
    name: 'Lombard Staked BTC',
    coinType: '0x3e8e9423d80e1774a7ca128fccd8bf5f1f7753be658c5e645929037f7c819040::lbtc::LBTC',
    decimals: 8,
    icon: lbtcTokenLogo,
  },
  XBTC: {
    symbol: 'XBTC',
    name: 'XBTC',
    coinType: '0x876a4b7bce8aeaef60464c11f4026903e9afacab79b9b142686158aa86560b50::xbtc::XBTC',
    decimals: 8,
    icon: xbtcLogo,
  },
} as const;

export const protocols: Protocol[] = [
  {
    id: 'navi',
    name: 'Navi Protocol',
    logo: naviLogo,
    siteUrl: 'https://naviprotocol.io',
    categories: ['lending'],
    chains: ['sui'],
  },
  {
    id: 'suilend',
    name: 'Suilend',
    logo: suilendLogo,
    siteUrl: 'https://suilend.fi',
    categories: ['lending'],
    chains: ['sui'],
  },
  {
    id: 'scallop',
    name: 'Scallop',
    logo: scallopLogo,
    siteUrl: 'https://scallop.io',
    categories: ['lending'],
    chains: ['sui'],
  },
];

export const protocolsById = Object.fromEntries(
  protocols.map((protocol) => [protocol.id, protocol])
);

// Asset-Protocol Support Matrix
// Defines which protocols support each asset
export const ASSET_PROTOCOL_SUPPORT: Record<string, string[]> = {
  SUI: ['navi', 'suilend', 'scallop'],
  XBTC: ['navi', 'suilend', 'scallop'],
  LBTC: ['navi', 'suilend'], // NOT supported by Scallop
  USDC: ['navi', 'suilend', 'scallop'],
};

export function getProtocolsForAsset(asset: string): string[] {
  return ASSET_PROTOCOL_SUPPORT[asset] || [];
}

export function isAssetSupportedByProtocol(asset: string, protocolId: string): boolean {
  const supportedProtocols = ASSET_PROTOCOL_SUPPORT[asset] || [];
  return supportedProtocols.includes(protocolId);
}
