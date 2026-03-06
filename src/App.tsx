import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import styles from './App.module.css';

import { Navigation } from './components/Navigation';
import { WalletButton } from './components/WalletButton';
import { Footer } from './components/Footer';
import { StrategyPage } from './pages/StrategyPage';
import { PortfolioPage } from './pages/PortfolioPage';
import logoImage from './assets/services/logo_defidash_small.png';

function App() {
  return (
    <BrowserRouter>
      <div className={styles.app}>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <div className={styles.titleGroup}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <img src={logoImage} alt="DefiDash" className={styles.logo} />
                <Navigation />
              </div>
            </div>
            <div className={styles.headerActions}>
              <WalletButton />
            </div>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<Navigate to="/strategy" replace />} />
          <Route path="/strategy" element={<StrategyPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
        </Routes>

        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
