import { Tooltip } from '@mui/material';
import React, { ReactElement } from 'react';

const ToolTip = ({
  title,
  children,
}: {
  title: string;
  children: ReactElement;
}) => {
  return (
    <Tooltip title={title} placement='right' arrow>
      {children}
    </Tooltip>
  );
};

export default ToolTip;
