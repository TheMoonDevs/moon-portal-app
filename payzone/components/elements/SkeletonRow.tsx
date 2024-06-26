'use client'
import React from 'react';
import { Skeleton } from '@mui/material';

export const SkeletonRow = () => {
  return [1, 2, 3].map((item, index) => (
    <tr key={`${index}--skeleton-${item}`}>
      {[1, 2, 3, 4, 5].map((_, i) => (
        <td key={i} className='px-4 py-[2px]'>
          <Skeleton
            variant='text'
            // width={""}
            height={30}
            sx={{ backgroundColor: 'lightgray' }}
          />
        </td>
      ))}
    </tr>
  ));
};


