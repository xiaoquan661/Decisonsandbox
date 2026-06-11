import { createContext, useContext, ReactNode } from 'react';
import { UseWizardState } from './useWizardState';

const WizardContext = createContext<UseWizardState | null>(null);

export function WizardProvider({ value, children }: { value: UseWizardState; children: ReactNode }) {
  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard(): UseWizardState | null {
  return useContext(WizardContext);
}
