'use client';

import { createContext, useContext } from 'react';

const TallyPopupContext = createContext<ReturnType<
  typeof useTallyPopupInternal
> | null>(null);

const useTallyPopupInternal = () => {
  const formId = 'w2DML9';
  const openPopup = (options = {}) => {
    if ((window as any).Tally) {
      (window as any).Tally.openPopup(formId, {
        layout: 'modal',
        width: 700,
        autoClose: 5000,
        ...options,
      });
    } else {
      console.error('Tally script not loaded yet');
    }
  };
  const closePopup = () => {
    if ((window as any).Tally) {
      (window as any).Tally.closePopup(formId);
    }
  };

  return {
    openPopup,
    closePopup,
  };
};

export const TallyPopupProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <TallyPopupContext.Provider value={useTallyPopupInternal()}>
      {children}
    </TallyPopupContext.Provider>
  );
};

export const useTallyPopup = () => {
  const context = useContext(TallyPopupContext);
  if (!context) {
    throw new Error('useTallyPopup must be used within a TallyPopupProvider');
  }
  return context;
};
