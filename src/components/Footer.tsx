import { protocols } from '../config/protocols';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        {/* Supported Protocols */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Supported Protocols</h4>
          <div className={styles.protocolList}>
            {protocols.map((protocol) => (
              <a
                key={protocol.id}
                href={protocol.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.protocolItem}
              >
                <img src={protocol.logo} alt={protocol.name} className={styles.protocolLogo} />
                <span className={styles.protocolName}>{protocol.name}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Featured Strategies */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Featured Strategies</h4>
          <div className={styles.strategyList}>
            <div className={styles.strategyCard}>
              <span className={styles.strategyIcon}>🔥</span>
              <div className={styles.strategyInfo}>
                <span className={styles.strategyName}>SUI 3x Leverage</span>
                <span className={styles.strategyApy}>Up to 15% APY</span>
              </div>
            </div>
            <div className={styles.strategyCard}>
              <span className={styles.strategyIcon}>💎</span>
              <div className={styles.strategyInfo}>
                <span className={styles.strategyName}>XBTC Conservative</span>
                <span className={styles.strategyApy}>Up to 8% APY</span>
              </div>
            </div>
            <div className={styles.strategyCard}>
              <span className={styles.strategyIcon}>⚡</span>
              <div className={styles.strategyInfo}>
                <span className={styles.strategyName}>LBTC Max Yield</span>
                <span className={styles.strategyApy}>Up to 12% APY</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={styles.bottomBar}>
          <div className={styles.copyright}>© 2026 DefiDash. Built on Sui.</div>
          <div className={styles.links}>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
            >
              𝕏
            </a>
            <a
              href="https://discord.com"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
            >
              Discord
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
