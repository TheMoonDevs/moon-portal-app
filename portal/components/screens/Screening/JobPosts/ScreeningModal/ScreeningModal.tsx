import { Modal, Portal, Tab, Tabs } from '@mui/material';
import type { ChangeEvent } from 'react';
import { useState } from 'react';

import { ScreeningFields } from './ScreeningFields';

export const ScreeningModal = ({
  isOpen,
  handleClose,
  screeningData,
  handleScreeningRoundSave,
  title,
}: {
  isOpen: boolean;
  handleClose: () => void;
  screeningData: any;
  handleScreeningRoundSave: (
    e: any,
    data: any,
    candidateId: string,
  ) => Promise<any>;
  title: string;
}) => {
  const [currentTabIndex, setCurrentTabIndex] = useState(0);

  const handleTabChange = (e: ChangeEvent<{}>, tabIndex: number) => {
    setCurrentTabIndex(tabIndex);
  };

  return (
    <Portal>
      <Modal onClose={handleClose} open={isOpen}>
        <div className="absolute left-1/2 top-1/2 h-1/2 w-4/5 -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md bg-white p-8 md:h-4/5 md:w-1/2">
          <h1 className="mb-4 text-2xl font-bold">{title}</h1>
          <Tabs
            value={currentTabIndex}
            onChange={handleTabChange}
            aria-label="screening modal tabs"
            textColor="inherit"
            TabIndicatorProps={{
              style: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                height: '1px',
              },
            }}
            sx={{ borderBottom: '1px solid rgba(0, 0, 0, 0.2)' }}
            variant="fullWidth"
          >
            <Tab label="Reviewer" />
            <Tab label="Interviewer" />
          </Tabs>

          {/* Screening fields for Reviewer  */}
          {currentTabIndex === 0 && (
            <ScreeningFields
              data={{
                id: screeningData?.id,
                screeningData,
              }}
              handleScreeningRoundSave={handleScreeningRoundSave}
              tabindex={0}
            />
          )}

          {/* Screening fields for interviewer */}
          {currentTabIndex === 1 && (
            <ScreeningFields
              data={{
                id: screeningData?.id,
                screeningData,
              }}
              tabindex={1}
              handleScreeningRoundSave={handleScreeningRoundSave}
            />
          )}
        </div>
      </Modal>
    </Portal>
  );
};
