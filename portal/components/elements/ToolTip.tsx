import { Tooltip } from '@mui/material';
import type { ReactElement } from 'react';
import React from 'react';

const ToolTip = ({
  title,
  children,
  arrow,
}: {
  title: string;
  children: ReactElement;
  arrow?: boolean;
}) => {
  return (
    <Tooltip title={title} placement="top" arrow={arrow}>
      {children}
    </Tooltip>
  );
};

export default ToolTip;
