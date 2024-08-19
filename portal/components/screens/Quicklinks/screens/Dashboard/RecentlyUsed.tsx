import React, { useState } from 'react';
import { Link as Quicklink } from '@prisma/client';
import { CircularProgress } from '@mui/material';

const RecentlyUsed = ({ allQuicklinks }: { allQuicklinks?: Quicklink[] }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  return (
    <div className={`w-full `}>
      {allQuicklinks?.length === 0 && isLoading && (
        <div className='w-full flex justify-center h-52 items-center '>
          <CircularProgress color='inherit' />
        </div>
      )}
      {allQuicklinks?.length === 0 && !isLoading ? (
        <div className='w-full flex justify-center h-52 items-center '>
          Nothing to show
        </div>
      ) : (
        <div>hi</div>
      )}
    </div>
  );
};

export default RecentlyUsed;
