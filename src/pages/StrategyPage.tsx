import { useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import appStyles from '../App.module.css';
import styles from './StrategyPage.module.css';
import { WizardStepper } from '../components/WizardStepper';
import { AssetSelector } from '../components/AssetSelector';
import { RouteCards } from '../components/RouteCards';
import { PreviewPanel } from '../components/PreviewPanel';
import type { LeverageRoute } from 'defi-dash-sdk';

type WizardStep = 1 | 2 | 3;
type RouteType = 'maxLeverage' | 'bestApy' | 'custom';

export function StrategyPage() {
  const account = useCurrentAccount();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [usdValue, setUsdValue] = useState<string>('');
  const [selectedRouteType, setSelectedRouteType] = useState<RouteType | null>(null);
  const [selectedRouteData, setSelectedRouteData] = useState<LeverageRoute | null>(null);

  const handleAssetSelect = (asset: string) => {
    setSelectedAsset(asset);
    // Auto-advance to step 2
    setTimeout(() => {
      setCurrentStep(2);
    }, 300);
  };

  const handleRouteSelect = (routeType: RouteType, routeData: LeverageRoute) => {
    setSelectedRouteType(routeType);
    setSelectedRouteData(routeData);
    // Auto-advance to step 3
    setTimeout(() => {
      setCurrentStep(3);
    }, 300);
  };

  const handleBack = () => {
    if (currentStep === 3) {
      setCurrentStep(2);
      setSelectedRouteType(null);
      setSelectedRouteData(null);
    } else if (currentStep === 2) {
      setCurrentStep(1);
      setSelectedAsset(null);
      setUsdValue('');
    }
  };

  // Navigation is auto-handled by step component state

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <AssetSelector selectedAsset={selectedAsset} onAssetSelect={handleAssetSelect} />;

      case 2:
        if (!selectedAsset) {
          // Shouldn't happen, but fallback to step 1
          setCurrentStep(1);
          return null;
        }

        return (
          <div>
            <RouteCards
              selectedAsset={selectedAsset}
              usdValue={usdValue}
              onUsdValueChange={setUsdValue}
              selectedRoute={selectedRouteType}
              onRouteSelect={handleRouteSelect}
            />
            {/* Back button for step 2 */}
            <div className={styles.stepActions}>
              <button type="button" onClick={handleBack} className={styles.backButton}>
                ◀ Back
              </button>
            </div>
          </div>
        );

      case 3:
        if (!selectedAsset || !usdValue || !selectedRouteData) {
          // Shouldn't happen, but fallback
          setCurrentStep(2);
          return null;
        }

        return (
          <PreviewPanel
            selectedAsset={selectedAsset}
            usdValue={usdValue}
            routeData={selectedRouteData}
            onBack={handleBack}
          />
        );

      default:
        return null;
    }
  };

  return (
    <main className={appStyles.content}>
      <section className={styles.container}>
        {/* Page Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Leverage Wizard</h1>
          <p className={styles.subtitle}>
            Create leveraged positions in 3 simple steps. We&apos;ll find the best routes and rates
            for you.
          </p>
        </div>

        {/* Wizard Stepper */}
        <WizardStepper currentStep={currentStep} totalSteps={3} />

        {/* Connection Check */}
        {!account && (
          <div className={styles.connectionWarning}>
            <p>⚠️ Connect your wallet to execute transactions</p>
          </div>
        )}

        {/* Step Content */}
        <div className={styles.stepContent}>{renderStepContent()}</div>
      </section>
    </main>
  );
}
