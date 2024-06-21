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
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";

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
      const payload = {
        mailId: newMailId,
        mailMaxCount: newMailMaxCount,
        fallbackMailId: newFallbackMailId,
      };
      console.log("Sending payload for add new mail:", payload);

      const response = await fetch("/api/email-tracker/update-settings", {
        method: "PATCH",
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
    }
  };

  const formatLastMailSentAt = (dateString: string | undefined) => {
    if (!dateString) return "Never";
    const date = parseISO(dateString);
    return `${formatDistanceToNow(date, { addSuffix: true })}`;
  };

  return (
    <div className="min-h-screen  p-8">
      <div className="max-w-5xl mx-auto bg-white p-6 rounded shadow-lg">
        <Typography variant="h4" className="mb-4">
          Email Tracker
        </Typography>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Error:</strong> {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center">
            <CircularProgress />
          </div>
        ) : (
          <TableContainer component={Paper} className="shadow-md mt-4">
            <Table>
              <TableHead className="bg-gray-200">
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Fallback Mail ID</TableCell>
                  <TableCell>Mail ID</TableCell>
                  <TableCell>Mail Current Count</TableCell>
                  <TableCell>Mail Max Count</TableCell>
                  <TableCell>Last Mail Sent At</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((log, index) => (
                  <TableRow
                    key={index}
                    className="hover:bg-gray-50 transition duration-200"
                  >
                    <TableCell>{log.mailId}</TableCell>
                    <TableCell>
                      <span
                        className={`rounded px-2 py-1 text-white ${
                          log.status === "Sendable"
                            ? "bg-green-500"
                            : "bg-red-500"
                        }`}
                      >
                        {log.status}
                      </span>
                    </TableCell>
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
                    <TableCell>{log.mailId}</TableCell>
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
                      {editIndex === index ? (
                        <div className="flex space-x-2">
                          <Tooltip title="Save" TransitionComponent={Zoom}>
                            <IconButton
                              color="primary"
                              onClick={() => handleEdit(index, log)}
                            >
                              <CheckIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Cancel" TransitionComponent={Zoom}>
                            <IconButton
                              color="error"
                              onClick={handleCancelEdit}
                            >
                              <CloseIcon />
                            </IconButton>
                          </Tooltip>
                        </div>
                      ) : (
                        <Tooltip title="Edit" TransitionComponent={Zoom}>
                          <IconButton
                            color="default"
                            onClick={() => handleSetEdit(index, log)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      )}
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
            startIcon={<RefreshIcon />}
            onClick={fetchData}
          >
            Refresh Data
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
          >
            Add New Mail
          </Button>
        </div>
      </div>

      <Dialog open={open} onClose={() => setOpen(false)}>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleAddNewMail} color="primary">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default EmailTrackerCard;
