"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
  Button,
  IconButton,
  TextField,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Zoom,
} from "@mui/material";

import formatDistanceToNow from "date-fns/formatDistanceToNow";
import parseISO from "date-fns/parseISO";

interface EmailLog {
  mailId: string;
  mailMaxCount: number;
  fallbackMailId?: string;
  mailCurrentCount: number;
  lastMailSentAt?: string;
  status: string;
}

const EmailTrackerCard: React.FC = () => {
  const [data, setData] = useState<EmailLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // State for edit mode
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editFallbackMailId, setEditFallbackMailId] = useState<string>("");
  const [editMailMaxCount, setEditMailMaxCount] = useState<number>(0);

  // State for add new mail dialog
  const [open, setOpen] = useState<boolean>(false);
  const [newMailId, setNewMailId] = useState<string>("");
  const [newMailMaxCount, setNewMailMaxCount] = useState<number>(0);
  const [newFallbackMailId, setNewFallbackMailId] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/email-tracker");
      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }
      const result = await response.json();
      setData(result.data);
      setError(null);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      setError(error.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleSetEdit = (index: number, log: EmailLog) => {
    setEditIndex(index);
    setEditFallbackMailId(log.fallbackMailId || "");
    setEditMailMaxCount(log.mailMaxCount);
  };

  const handleCancelEdit = () => {
    setEditIndex(null);
    setEditFallbackMailId("");
    setEditMailMaxCount(0);
  };

  const handleEdit = async (index: number, log: EmailLog) => {
    try {
      const payload = {
        mailId: log.mailId,
        mailMaxCount: editMailMaxCount,
        fallbackMailId: editFallbackMailId,
      };
      console.log("Sending payload for edit:", payload);

      const response = await fetch("/api/email-tracker/update-settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to update entry");
      }

      await fetchData();
      handleCancelEdit();
    } catch (error: any) {
      console.error("Error updating email tracker settings:", error);
      setError(error.message || "Failed to update entry");
    }
  };

  const handleAddNewMail = async () => {
    try {
      // Validate fields
      setLoading(true)
      if (!newMailId || !newMailMaxCount) {
        setError("* Please fill out all required fields. 😥");
        return;
      }

      const payload = {
        mailId: newMailId,
        mailMaxCount: newMailMaxCount,
        fallbackMailId: newFallbackMailId,
      };
      console.log("Sending payload for add new mail:", payload);

      const response = await fetch("/api/email-tracker/manage-mails", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to add new mail");
      }

      await fetchData();
      setOpen(false);
      setNewMailId("");
      setNewMailMaxCount(0);
      setNewFallbackMailId("");
    } catch (error: any) {
      console.error("Error adding new mail:", error);
      setError(error.message || "Failed to add new mail");
    } finally {
      setLoading(false)
    }
  };

  const handleDeleteMail = async (mailID: string) => {
    try {
      setLoading(true)
      if (!mailID) {
        setError("Couldn't find the mail ID.");
        return;
      }

      const payload = {
        mailId: mailID,
      };

      const response = await fetch("/api/email-tracker/manage-mails", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to delete mail");
      }

      await fetchData();
    } catch (error: any) {
      console.error("Error deleting mail:", error);
      setError(error.message || "Failed to delete mail");
    } finally {
      setLoading(false)
    }
  };

  const handleDialogClose = () => {
    setOpen(false);
    // Reset fields and errors on dialog close
    setNewMailId("");
    setNewMailMaxCount(0);
    setNewFallbackMailId("");
    setError(null);
  };

  const formatLastMailSentAt = (dateString: string | undefined) => {
    if (!dateString) return "Never";
    const date = parseISO(dateString);
    return `${formatDistanceToNow(date, { addSuffix: true })}`;
  };

  return (
    <div className="lg:px-8">
      <div className="max-w-5xl mx-auto bg-white p-6 rounded shadow-lg shadow-gray-300">
        <Typography variant="h4" className="mb-4">
          Email Tracker
        </Typography>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Error:</strong> {error}
          </div>
        )}

        {(
          <TableContainer component={Paper} className="shadow-md mt-4">
            <Table>
              <TableHead className="bg-gray-200 whitespace-nowrap">
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>Mail ID</TableCell>
                  <TableCell>Fallback Mail ID</TableCell>
                  <TableCell>Sent Today</TableCell>
                  <TableCell>Max Count</TableCell>
                  <TableCell>Last Sent At</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(!data || data.length === 0) ? loading ? (
                  <TableRow className="animate-pulse"><TableCell colSpan={7}>Loading...</TableCell></TableRow>
                ) : (<TableRow className="animate-pulse"><TableCell colSpan={7}>No Mail Found</TableCell></TableRow>) : data.map((log, index) => (
                  <TableRow
                    key={index}
                    className="hover:bg-gray-50 transition duration-200"
                  >
                    <TableCell>
                      <span
                        className={`rounded px-2 py-1 text-white ${log.status === "Sendable"
                          ? "bg-green-500"
                          : "bg-red-500"
                          }`}
                      >
                        {log.status}
                      </span>
                    </TableCell>
                    <TableCell>{log.mailId}</TableCell>
                    <TableCell>
                      {editIndex === index ? (
                        <TextField
                          value={editFallbackMailId}
                          onChange={(e) =>
                            setEditFallbackMailId(e.target.value)
                          }
                          fullWidth
                        />
                      ) : (
                        log.fallbackMailId || "-"
                      )}
                    </TableCell>
                    <TableCell>{log.mailCurrentCount}</TableCell>
                    <TableCell>
                      {editIndex === index ? (
                        <TextField
                          type="number"
                          value={editMailMaxCount}
                          onChange={(e) =>
                            setEditMailMaxCount(parseInt(e.target.value, 10))
                          }
                          fullWidth
                        />
                      ) : (
                        log.mailMaxCount
                      )}
                    </TableCell>
                    <TableCell>
                      {formatLastMailSentAt(log.lastMailSentAt)}
                    </TableCell>
                    <TableCell>
                      {loading ? (
                        <div className="flex justify-center">
                          <CircularProgress />
                        </div>
                      ) : <div className="flex">

                        {editIndex === index ? (
                          <div className="flex">
                            <Tooltip title="Save" TransitionComponent={Zoom}>
                              <IconButton
                                color="primary"
                                onClick={() => handleEdit(index, log)}
                              >
                                <span className="material-icons text-green-600">
                                  check
                                </span>
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Cancel" TransitionComponent={Zoom}>
                              <IconButton
                                color="error"
                                onClick={handleCancelEdit}
                              >
                                <span className="material-icons">
                                  close
                                </span>
                              </IconButton>
                            </Tooltip>
                          </div>
                        ) : (
                          <Tooltip title="Edit" TransitionComponent={Zoom}>
                            <IconButton
                              color="default"
                              onClick={() => handleSetEdit(index, log)}
                            >
                              <span className="material-icons text-yellow-500">
                                edit
                              </span>
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Delete" TransitionComponent={Zoom}>
                          <IconButton
                            color="default"
                            onClick={() => handleDeleteMail(log.mailId)}
                          >
                            <span className="material-icons text-red-500">
                              delete
                            </span>
                          </IconButton>
                        </Tooltip>
                      </div>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <div className="flex justify-end mt-5 space-x-3">
          <Button
            variant="contained"
            color="primary"
            startIcon={<span className="material-icons text-black">
              refresh
            </span>}
            onClick={fetchData}
          >
            Refresh Data
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<span className="material-icons text-white">
              add
            </span>}
            onClick={() => setOpen(true)}
          >
            Add New Mail
          </Button>
        </div>
      </div>

      <Dialog open={open} onClose={handleDialogClose}>
        <DialogTitle>Add New Mail</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Mail ID"
            type="text"
            fullWidth
            value={newMailId}
            onChange={(e) => setNewMailId(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Mail Max Count"
            type="number"
            fullWidth
            value={newMailMaxCount}
            onChange={(e) => setNewMailMaxCount(parseInt(e.target.value, 10))}
          />
          <TextField
            margin="dense"
            label="Fallback Mail ID"
            type="text"
            fullWidth
            value={newFallbackMailId}
            onChange={(e) => setNewFallbackMailId(e.target.value)}
          />
          {error && (
            <Typography variant="body2" color="error" gutterBottom>
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="warning">
            Cancel
          </Button>
          <Button onClick={handleAddNewMail} color="success">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default EmailTrackerCard;
