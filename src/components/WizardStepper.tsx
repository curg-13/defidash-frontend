import styles from './WizardStepper.module.css';

interface WizardStepperProps {
  currentStep: number;
  totalSteps: number;
}

export function WizardStepper({ currentStep, totalSteps }: WizardStepperProps) {
  return (
    <div className={styles.stepper}>
      {Array.from({ length: totalSteps }, (_, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;
        
        return (
          <div key={stepNumber} className={styles.stepContainer}>
            <div
              className={`${styles.step} ${
                isActive ? styles.active : ''
              } ${isCompleted ? styles.completed : ''}`}
            >
              {isCompleted ? '✓' : stepNumber}
            </div>
            {stepNumber < totalSteps && (
              <div
                className={`${styles.connector} ${
                  isCompleted ? styles.connectorCompleted : ''
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}