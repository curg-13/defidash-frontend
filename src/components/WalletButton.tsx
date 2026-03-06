import { useState, useRef, useEffect } from 'react';
import {
  useCurrentAccount,
  useDisconnectWallet,
  useConnectWallet,
  useWallets,
} from '@mysten/dapp-kit';
import styles from './WalletButton.module.css';

export function WalletButton() {
  const account = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const { mutate: connect } = useConnectWallet();
  const wallets = useWallets();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyAddress = async () => {
    if (account?.address) {
      await navigator.clipboard.writeText(account.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!account) {
    return (
      <div className={styles.container} ref={dropdownRef}>
        <button className={styles.connectButton} onClick={() => setIsOpen(!isOpen)}>
          Connect Wallet
        </button>
        {isOpen && wallets.length > 0 && (
          <div className={styles.dropdown}>
            <div className={styles.dropdownHeader}>Select Wallet</div>
            {wallets.map((wallet) => (
              <button
                key={wallet.name}
                className={styles.walletOption}
                onClick={() => {
                  connect({ wallet });
                  setIsOpen(false);
                }}
              >
                {wallet.icon && (
                  <img src={wallet.icon} alt={wallet.name} className={styles.walletIcon} />
                )}
                <span>{wallet.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button className={styles.connectedButton} onClick={() => setIsOpen(!isOpen)}>
        <span className={styles.statusDot} />
        <span className={styles.address}>{truncateAddress(account.address)}</span>
        <span className={styles.arrow}>▾</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>Connected</div>
          <button className={styles.dropdownItem} onClick={copyAddress}>
            <span className={styles.itemIcon}>📋</span>
            <span>{copied ? 'Copied!' : 'Copy Address'}</span>
          </button>
          <button
            className={`${styles.dropdownItem} ${styles.disconnectItem}`}
            onClick={() => {
              disconnect();
              setIsOpen(false);
            }}
          >
            <span className={styles.itemIcon}>🔌</span>
            <span>Disconnect</span>
          </button>
        </div>
      )}
    </div>
  );
}
