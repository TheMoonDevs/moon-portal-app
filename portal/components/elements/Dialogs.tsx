import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { CircleAlert } from 'lucide-react';
import { Spinner } from './Loaders';

const DeleteConfirmationDialog = ({
  open,
  handleClose,
  handleDelete,
  isDeleting,
  title = 'Confirm Delete',
  description = 'Are you sure you want to delete this item? This action cannot be undone.',
}: {
  open: boolean;
  handleClose: () => void;
  handleDelete: () => void;
  isDeleting: boolean;
  title?: string;
  description?: string;
}) => {
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      PaperProps={{ sx: { borderRadius: '10px' } }}
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-description"
    >
      <DialogTitle id="delete-dialog-title" className="flex items-center gap-2">
        <CircleAlert />
        <span>{title}</span>
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="delete-dialog-description">
          {description}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        {isDeleting ? (
          <Spinner />
        ) : (
          <Button
            className="!bg-red-600 !text-white"
            onClick={handleDelete}
            disabled={isDeleting}
            autoFocus
          >
            Delete
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default DeleteConfirmationDialog;
