import { useEffect, useState, useCallback, useRef } from 'react';

export interface AlertThreshold {
  warning: number; // e.g., 1.5
  danger: number; // e.g., 1.2
}

export type AlertLevel = 'safe' | 'warning' | 'danger';

interface HealthAlertsConfig {
  thresholds: AlertThreshold;
  browserNotifications: boolean;
}

const DEFAULT_CONFIG: HealthAlertsConfig = {
  thresholds: {
    warning: 1.5,
    danger: 1.2,
  },
  browserNotifications: false,
};

const STORAGE_KEY = 'defidash_health_alerts';

function loadConfig(): HealthAlertsConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch {
    console.warn('[useHealthAlerts] Failed to load config');
  }
  return DEFAULT_CONFIG;
}

function saveConfig(config: HealthAlertsConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    console.warn('[useHealthAlerts] Failed to save config');
  }
}

export function useHealthAlerts(currentHealthFactor: number) {
  const [config, setConfig] = useState<HealthAlertsConfig>(loadConfig);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  );
  const lastNotifiedLevel = useRef<AlertLevel>('safe');

  // Calculate current alert level
  const getAlertLevel = useCallback(
    (hf: number): AlertLevel => {
      if (hf <= 0 || hf === Infinity) return 'safe';
      if (hf <= config.thresholds.danger) return 'danger';
      if (hf <= config.thresholds.warning) return 'warning';
      return 'safe';
    },
    [config.thresholds]
  );

  const alertLevel = getAlertLevel(currentHealthFactor);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('[useHealthAlerts] Notifications not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission === 'granted';
    } catch {
      console.error('[useHealthAlerts] Failed to request permission');
      return false;
    }
  }, []);

  // Update thresholds
  const updateThresholds = useCallback((thresholds: AlertThreshold) => {
    setConfig((prev) => {
      const newConfig = { ...prev, thresholds };
      saveConfig(newConfig);
      return newConfig;
    });
  }, []);

  // Toggle browser notifications
  const toggleBrowserNotifications = useCallback(
    async (enabled: boolean) => {
      if (enabled && notificationPermission !== 'granted') {
        const granted = await requestNotificationPermission();
        if (!granted) return;
      }

      setConfig((prev) => {
        const newConfig = { ...prev, browserNotifications: enabled };
        saveConfig(newConfig);
        return newConfig;
      });
    },
    [notificationPermission, requestNotificationPermission]
  );

  // Send browser notification when health drops
  useEffect(() => {
    if (!config.browserNotifications || notificationPermission !== 'granted') return;
    if (currentHealthFactor <= 0 || currentHealthFactor === Infinity) return;

    const currentLevel = getAlertLevel(currentHealthFactor);

    // Only notify when level worsens
    const levelPriority: Record<AlertLevel, number> = { safe: 0, warning: 1, danger: 2 };

    if (levelPriority[currentLevel] > levelPriority[lastNotifiedLevel.current]) {
      const title =
        currentLevel === 'danger' ? '🚨 Critical Health Factor!' : '⚠️ Health Factor Warning';

      const body =
        currentLevel === 'danger'
          ? `Your position health is ${currentHealthFactor.toFixed(2)}. Liquidation risk is high!`
          : `Your position health dropped to ${currentHealthFactor.toFixed(2)}. Consider reducing leverage.`;

      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: 'health-alert',
          requireInteraction: currentLevel === 'danger',
        });
      } catch (e) {
        console.warn('[useHealthAlerts] Failed to send notification:', e);
      }
    }

    lastNotifiedLevel.current = currentLevel;
  }, [currentHealthFactor, config.browserNotifications, notificationPermission, getAlertLevel]);

  return {
    alertLevel,
    config,
    notificationPermission,
    updateThresholds,
    toggleBrowserNotifications,
    requestNotificationPermission,
  };
}
