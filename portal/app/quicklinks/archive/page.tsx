"use client";

import React, { useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/utils/redux/store';
import { removeFromArchive, setToast, addNewDirectory, setArchive, setNeedsRefetch } from '@/utils/redux/quicklinks/quicklinks.slice';
import { ToastSeverity } from "@/components/elements/Toast";
import { QuicklinksSdk } from '@/utils/services/QuicklinksSdk';

interface Directory {
  id: string;
  title: string;
  logo: string;
  slug: string;
  parentDirId: string | null;
  archive?: string | null;
  timestamp: Date;
}

const ArchivePage: React.FC = () => {
  const archivedDirectories = useSelector((state: RootState) => state.quicklinks.archive);
  const needsRefetch = useSelector((state: RootState) => state.quicklinks.needsRefetch);
  const dispatch = useDispatch();
  
  const fetchArchivedDirectories = async () => {
    try {
      const response = await QuicklinksSdk.getData("/api/quicklinks/directory/archive");
      dispatch(setArchive(response.data.directories));
    } catch (error) {
      console.log(error);
    }
  };

  // Fetch archived directories when the component mounts
  useEffect(() => {
    fetchArchivedDirectories();
  }, [dispatch]);

  // Refetch archived directories when needsRefetch changes to true
  useEffect(() => {
    if (needsRefetch) {
      fetchArchivedDirectories();
      dispatch(setNeedsRefetch(false));
    }
  }, [needsRefetch, dispatch]);

  const handleRestore = async (directory: Directory) => {
    try {
      const data = {
        id: directory.id,
        parentDirId: directory.archive,
        archive: null
      };
      await QuicklinksSdk.createData("/api/quicklinks/directory/archive", data);
      dispatch(removeFromArchive(directory.id));
      dispatch(addNewDirectory(directory));
      dispatch(
        setToast({
          toastMsg: "Directory has been restored!",
          toastSev: ToastSeverity.success,
        })
      );
    } catch (error) {
      console.log(error);
      dispatch(
        setToast({
          toastMsg: "Something went wrong. Please try again.",
          toastSev: ToastSeverity.error,
        })
      );
    }
  };

  const defaultFolderEmoji = '📁';

  return (
    <Box
      sx={{
        width: '80%',
        margin: 'auto',
        mt: 4,
      }}
    >
      <Typography variant="h4" component="h1" sx={{ mb: 4 }}>
        Archived Files
      </Typography>
      <div className="mt-4">
        {archivedDirectories.length > 0 ? (
          archivedDirectories.map((directory: Directory) => (
            <div key={directory.id} className="flex items-center justify-between mb-2 p-2 bg-gray-100">
              <div className="flex items-center">
                <span className="mr-2">{directory.logo || defaultFolderEmoji}</span>
                <span>{directory.title}</span>
              </div>
              <Button
                variant="contained"
                sx={{
                  backgroundColor: '#18181b',
                  color: '#fff',
                  boxShadow: 'none',
                  borderRadius: 0,
                  '&:hover': {
                    backgroundColor: '#3f3f46',
                  },
                }}
                onClick={() => handleRestore(directory)}
              >
                Restore
              </Button>
            </div>
          ))
        ) : (
          <Typography>No archived files found.</Typography>
        )}
      </div>
    </Box>
  );
};

export default ArchivePage;
