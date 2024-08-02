import React from 'react';
import { Button } from '@mui/material';
import Link from 'next/link';
import {APP_BASE_URL} from "@/utils/constants/appInfo";

const ArchiveButton: React.FC = () => {
  return (
    <div className="w-full">
      <Link href={`${APP_BASE_URL}/quicklinks/archive`} passHref>
        <Button
          sx={{
            backgroundColor: '#18181b',
            color: '#fff',
            '&:hover': {
              backgroundColor: '#3f3f46',
            },
          }}
          className="my-4 w-full"
        >
          Archived Files
        </Button>
      </Link>
    </div>
  );
};

export default ArchiveButton;
