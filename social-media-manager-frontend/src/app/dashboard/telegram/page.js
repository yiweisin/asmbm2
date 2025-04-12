"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { telegramService, authService } from "@/services/api";
import {
  Button,
  TextField,
  Card,
  Typography,
  Box,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import SendIcon from "@mui/icons-material/Send";
import AddIcon from "@mui/icons-material/Add";

export default function TelegramPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [botToken, setBotToken] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Message Dialog state
  const [messageDialog, setMessageDialog] = useState({
    open: false,
    accountId: null,
    chatId: "",
    message: "",
  });

  // Confirmation Dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    accountId: null,
    username: "",
  });

  // Check if user is logged in
  useEffect(() => {
    if (!authService.isLoggedIn()) {
      router.push("/login");
      return;
    }

    loadAccounts();
  }, [router]);

  // Load Telegram accounts
  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = await telegramService.getAccounts();
      setAccounts(data);
      setError(null);
    } catch (err) {
      setError("Failed to load Telegram accounts: " + (err.error || err));
    } finally {
      setLoading(false);
    }
  };

  // Connect new Telegram account
  const handleConnect = async (e) => {
    e.preventDefault();

    if (!botToken) {
      setSnackbar({
        open: true,
        message: "Please enter a bot token",
        severity: "error",
      });
      return;
    }

    try {
      setConnectLoading(true);
      await telegramService.connect(botToken);
      await loadAccounts();
      setBotToken("");
      setSnackbar({
        open: true,
        message: "Telegram bot connected successfully!",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to connect Telegram bot: " + (err.error || err),
        severity: "error",
      });
    } finally {
      setConnectLoading(false);
    }
  };

  // Delete Telegram account
  const handleDelete = async (accountId) => {
    try {
      await telegramService.deleteAccount(accountId);
      await loadAccounts();
      setSnackbar({
        open: true,
        message: "Telegram account deleted successfully!",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to delete Telegram account: " + (err.error || err),
        severity: "error",
      });
    }
  };

  // Open confirmation dialog
  const openConfirmDialog = (account) => {
    setConfirmDialog({
      open: true,
      accountId: account.id,
      username: account.username,
    });
  };

  // Close confirmation dialog
  const closeConfirmDialog = () => {
    setConfirmDialog({
      open: false,
      accountId: null,
      username: "",
    });
  };

  // Open message dialog
  const openMessageDialog = (accountId) => {
    setMessageDialog({
      open: true,
      accountId,
      chatId: "",
      message: "",
    });
  };

  // Close message dialog
  const closeMessageDialog = () => {
    setMessageDialog({
      open: false,
      accountId: null,
      chatId: "",
      message: "",
    });
  };

  // Send message
  const handleSendMessage = async () => {
    const { accountId, chatId, message } = messageDialog;

    if (!chatId || !message) {
      setSnackbar({
        open: true,
        message: "Please enter both chat ID and message",
        severity: "error",
      });
      return;
    }

    // Add helper for getting chat ID
    const openChatIdHelper = () => {
      const token = prompt(
        "Enter your bot token to access the getUpdates API (only used in browser, not stored):"
      );
      if (token) {
        window.open(
          `https://api.telegram.org/bot${token}/getUpdates`,
          "_blank"
        );
      }
    };

    try {
      await telegramService.sendMessage(accountId, chatId, message);
      closeMessageDialog();
      setSnackbar({
        open: true,
        message: "Message sent successfully!",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to send message: " + (err.error || err),
        severity: "error",
      });
    }
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading && accounts.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Telegram Accounts
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Connect new Telegram bot */}
      <Card sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Connect Telegram Bot
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Enter your Telegram bot token to connect. You can create a new bot and
          get its token from the BotFather.
        </Typography>
        <Box sx={{ mb: 2, p: 1, bgcolor: "info.light", borderRadius: 1 }}>
          <Typography variant="subtitle2" color="info.contrastText">
            How to create a Telegram bot and get a token:
          </Typography>
          <ol style={{ margin: "8px 0 0 20px", paddingLeft: 0 }}>
            <li>Open Telegram and search for @BotFather</li>
            <li>Start a chat and send the command /newbot</li>
            <li>Follow the instructions to name your bot</li>
            <li>BotFather will provide you with a token (keep it secure)</li>
            <li>Copy the token and paste it here to connect your bot</li>
          </ol>
        </Box>
        <Box
          component="form"
          onSubmit={handleConnect}
          sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}
        >
          <TextField
            label="Bot Token"
            variant="outlined"
            fullWidth
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder="Enter your Telegram bot token"
            required
          />
          <Button
            variant="contained"
            color="primary"
            type="submit"
            disabled={connectLoading}
            startIcon={
              connectLoading ? <CircularProgress size={24} /> : <AddIcon />
            }
          >
            Connect
          </Button>
        </Box>
      </Card>

      {/* Account list */}
      <Typography variant="h6" gutterBottom>
        Your Telegram Bots
      </Typography>

      {accounts.length === 0 ? (
        <Typography variant="body1" color="text.secondary">
          You don't have any Telegram bots connected yet.
        </Typography>
      ) : (
        accounts.map((account) => (
          <Card key={account.id} sx={{ mb: 2, p: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box>
                <Typography variant="h6">@{account.username}</Typography>
                <Typography variant="body2" color="text.secondary">
                  ID: {account.telegramId}
                </Typography>
              </Box>
              <Box>
                <IconButton
                  color="primary"
                  onClick={() => openMessageDialog(account.id)}
                  title="Send Message"
                >
                  <SendIcon />
                </IconButton>
                <IconButton
                  color="error"
                  onClick={() => openConfirmDialog(account)}
                  title="Delete Account"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Box>
          </Card>
        ))
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={closeConfirmDialog}>
        <DialogTitle>Delete Telegram Bot</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the Telegram bot @
            {confirmDialog.username}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmDialog} color="primary">
            Cancel
          </Button>
          <Button
            onClick={() => {
              handleDelete(confirmDialog.accountId);
              closeConfirmDialog();
            }}
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Message Dialog */}
      <Dialog
        open={messageDialog.open}
        onClose={closeMessageDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Send Telegram Message</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter the chat ID and message content to send a message through your
            Telegram bot.
          </DialogContentText>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <strong>How to get a Chat ID:</strong>
            <ul>
              <li>
                For users: Ask them to message your bot first, then access
                Telegram API with <code>getUpdates</code> method.
              </li>
              <li>
                For groups: Add your bot to the group, then check{" "}
                <code>getUpdates</code> API response.
              </li>
              <li>
                Alternatively, add @RawDataBot or @getidsbot to your group to
                get the chat ID.
              </li>
            </ul>
          </Typography>
          <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
            <TextField
              label="Chat ID"
              fullWidth
              margin="dense"
              value={messageDialog.chatId}
              onChange={(e) =>
                setMessageDialog({ ...messageDialog, chatId: e.target.value })
              }
              helperText="Enter the chat ID where you want to send the message"
              required
            />
            <Button
              variant="outlined"
              size="small"
              sx={{ mt: 1 }}
              onClick={() => {
                const token = prompt(
                  "Enter your bot token to access the getUpdates API (only used in browser, not stored):"
                );
                if (token) {
                  window.open(
                    `https://api.telegram.org/bot${token}/getUpdates`,
                    "_blank"
                  );
                }
              }}
            >
              Find ID
            </Button>
          </Box>
          <TextField
            label="Message"
            fullWidth
            multiline
            rows={4}
            margin="dense"
            value={messageDialog.message}
            onChange={(e) =>
              setMessageDialog({ ...messageDialog, message: e.target.value })
            }
            helperText="Enter the message content"
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeMessageDialog} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleSendMessage}
            color="primary"
            startIcon={<SendIcon />}
          >
            Send
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
