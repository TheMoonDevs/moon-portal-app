import { Modal, Portal, Tab, Tabs } from "@mui/material";
import { ChangeEvent, useState } from "react";
import { ScreeningFields } from "./ScreeningFields";

export const ScreeningModal = ({
  isOpen,
  handleClose,
  screeningData,
  handleScreeningRoundSave,
}: {
  isOpen: boolean;
  handleClose: () => void;
  screeningData: any;
  handleScreeningRoundSave: (
    e: any,
    data: any,
    candidateId: string
  ) => Promise<any>;
}) => {
  const [currentTabIndex, setCurrentTabIndex] = useState(0);

  const handleTabChange = (e: ChangeEvent<{}>, tabIndex: number) => {
    setCurrentTabIndex(tabIndex);
  };

  return (
    <Portal>
      <Modal onClose={handleClose} open={isOpen}>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-md p-8 w-4/5 md:w-1/2 h-1/2 md:h-4/5 overflow-y-auto">
          <Tabs
            value={currentTabIndex}
            onChange={handleTabChange}
            aria-label="screening modal tabs"
            textColor="inherit"
            TabIndicatorProps={{
              style: { backgroundColor: "rgba(0, 0, 0, 0.8)", height: "1px" },
            }}
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
