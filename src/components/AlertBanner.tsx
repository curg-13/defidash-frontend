import { useState } from 'react';
import type { AlertLevel, AlertThreshold } from '../hooks/useHealthAlerts';
import styles from './AlertBanner.module.css';

interface AlertBannerProps {
  alertLevel: AlertLevel;
  healthFactor: number;
  thresholds: AlertThreshold;
  browserNotifications: boolean;
  notificationPermission: NotificationPermission;
  onToggleNotifications: (enabled: boolean) => void;
  onUpdateThresholds: (thresholds: AlertThreshold) => void;
}

export function AlertBanner({
  alertLevel,
  healthFactor,
  thresholds,
  browserNotifications,
  notificationPermission,
  onToggleNotifications,
  onUpdateThresholds,
}: AlertBannerProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [localThresholds, setLocalThresholds] = useState(thresholds);

  if (alertLevel === 'safe') return null;

  const isDanger = alertLevel === 'danger';

  const handleSaveThresholds = () => {
    onUpdateThresholds(localThresholds);
    setShowSettings(false);
  };

  return (
    <div className={`${styles.banner} ${isDanger ? styles.danger : styles.warning}`}>
      <div className={styles.content}>
        <span className={styles.icon}>{isDanger ? '🚨' : '⚠️'}</span>
        <div className={styles.message}>
          <strong>{isDanger ? 'Critical Health Factor!' : 'Health Factor Warning'}</strong>
          <span className={styles.details}>
            Your position health is{' '}
            <strong>{healthFactor === Infinity ? '∞' : healthFactor.toFixed(2)}</strong>.{' '}
            {isDanger
              ? 'Liquidation risk is high! Consider reducing leverage immediately.'
              : 'Consider reducing leverage to avoid liquidation risk.'}
          </span>
        </div>
        <button
          className={styles.settingsButton}
          onClick={() => setShowSettings(!showSettings)}
          aria-label="Alert settings"
        >
          ⚙️
        </button>
      </div>

      {showSettings && (
        <div className={styles.settings}>
          <div className={styles.settingsHeader}>
            <h4>Alert Settings</h4>
            <button className={styles.closeSettings} onClick={() => setShowSettings(false)}>
              ×
            </button>
          </div>

          <div className={styles.settingsContent}>
            <div className={styles.settingRow}>
              <label htmlFor="warning-threshold">Warning Threshold</label>
              <input
                id="warning-threshold"
                type="number"
                step="0.1"
                min="1.1"
                max="3"
                value={localThresholds.warning}
                onChange={(e) =>
                  setLocalThresholds((t) => ({ ...t, warning: parseFloat(e.target.value) || 1.5 }))
                }
                className={styles.thresholdInput}
              />
            </div>

            <div className={styles.settingRow}>
              <label htmlFor="danger-threshold">Danger Threshold</label>
              <input
                id="danger-threshold"
                type="number"
                step="0.1"
                min="1.01"
                max="2"
                value={localThresholds.danger}
                onChange={(e) =>
                  setLocalThresholds((t) => ({ ...t, danger: parseFloat(e.target.value) || 1.2 }))
                }
                className={styles.thresholdInput}
              />
            </div>

            <div className={styles.settingRow}>
              <label htmlFor="browser-notifications">Browser Notifications</label>
              <div className={styles.notificationToggle}>
                <input
                  id="browser-notifications"
                  type="checkbox"
                  checked={browserNotifications}
                  onChange={(e) => onToggleNotifications(e.target.checked)}
                  className={styles.checkbox}
                />
                {notificationPermission === 'denied' && (
                  <span className={styles.permissionDenied}>
                    (Blocked - enable in browser settings)
                  </span>
                )}
              </div>
            </div>

            <button className={styles.saveButton} onClick={handleSaveThresholds}>
              Save Thresholds
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
