"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { telegramService, authService } from "@/services/api";
import toast from "react-hot-toast";

export default function TelegramPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [botToken, setBotToken] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);

  // Message Dialog state
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageInfo, setMessageInfo] = useState({
    accountId: null,
    chatId: "",
    message: "",
  });

  // Confirmation Dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmInfo, setConfirmInfo] = useState({
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
      toast.error("Failed to load Telegram accounts");
    } finally {
      setLoading(false);
    }
  };

  // Connect new Telegram account
  const handleConnect = async (e) => {
    e.preventDefault();

    if (!botToken) {
      toast.error("Please enter a bot token");
      return;
    }

    try {
      setConnectLoading(true);
      await telegramService.connect(botToken);
      await loadAccounts();
      setBotToken("");
      toast.success("Telegram bot connected successfully!");
    } catch (err) {
      toast.error("Failed to connect Telegram bot: " + (err.error || err));
    } finally {
      setConnectLoading(false);
    }
  };

  // Delete Telegram account
  const handleDelete = async (accountId) => {
    try {
      await telegramService.deleteAccount(accountId);
      await loadAccounts();
      toast.success("Telegram account deleted successfully!");
    } catch (err) {
      toast.error("Failed to delete Telegram account: " + (err.error || err));
    }
  };

  // Open confirmation dialog
  const openConfirmDialog = (account) => {
    setConfirmInfo({
      accountId: account.id,
      username: account.username,
    });
    setShowConfirmDialog(true);
  };

  // Close confirmation dialog
  const closeConfirmDialog = () => {
    setShowConfirmDialog(false);
  };

  // Open message dialog
  const openMessageDialog = (accountId) => {
    setMessageInfo({
      accountId,
      chatId: "",
      message: "",
    });
    setShowMessageDialog(true);
  };

  // Close message dialog
  const closeMessageDialog = () => {
    setShowMessageDialog(false);
  };

  // Send message
  const handleSendMessage = async () => {
    const { accountId, chatId, message } = messageInfo;

    if (!chatId || !message) {
      toast.error("Please enter both chat ID and message");
      return;
    }

    try {
      await telegramService.sendMessage(accountId, chatId, message);
      closeMessageDialog();
      toast.success("Message sent successfully!");
    } catch (err) {
      toast.error("Failed to send message: " + (err.error || err));
    }
  };

  // Helper for getting chat ID
  const openChatIdHelper = () => {
    const token = prompt(
      "Enter your bot token to access the getUpdates API (only used in browser, not stored):"
    );
    if (token) {
      window.open(`https://api.telegram.org/bot${token}/getUpdates`, "_blank");
    }
  };

  if (loading && accounts.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Telegram Accounts</h1>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          {error}
        </div>
      )}

      {/* Connect new Telegram bot */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-xl font-semibold mb-2">Connect Telegram Bot</h2>
        <p className="text-gray-600 mb-4">
          Enter your Telegram bot token to connect. You can create a new bot and
          get its token from the BotFather.
        </p>
        <div className="bg-blue-50 p-3 rounded mb-4">
          <h3 className="font-semibold text-blue-800">
            How to create a Telegram bot and get a token:
          </h3>
          <ol className="ml-5 mt-2">
            <li>Open Telegram and search for @BotFather</li>
            <li>Start a chat and send the command /newbot</li>
            <li>Follow the instructions to name your bot</li>
            <li>BotFather will provide you with a token (keep it secure)</li>
            <li>Copy the token and paste it here to connect your bot</li>
          </ol>
        </div>
        <form onSubmit={handleConnect} className="flex gap-2">
          <input
            type="text"
            className="flex-1 border p-2 rounded"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder="Enter your Telegram bot token"
            required
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded flex items-center"
            disabled={connectLoading}
          >
            {connectLoading ? (
              <span className="inline-block mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span className="mr-2">+</span>
            )}
            Connect
          </button>
        </form>
      </div>

      {/* Account list */}
      <h2 className="text-xl font-semibold mb-4">Your Telegram Bots</h2>

      {accounts.length === 0 ? (
        <p className="text-gray-600">
          You don't have any Telegram bots connected yet.
        </p>
      ) : (
        accounts.map((account) => (
          <div key={account.id} className="bg-white p-4 rounded shadow mb-3">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">@{account.username}</h3>
                <p className="text-gray-600 text-sm">
                  ID: {account.telegramId}
                </p>
              </div>
              <div>
                <button
                  className="text-blue-500 mr-2"
                  onClick={() => openMessageDialog(account.id)}
                  title="Send Message"
                >
                  Send
                </button>
                <button
                  className="text-red-500"
                  onClick={() => openConfirmDialog(account)}
                  title="Delete Account"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded shadow-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Delete Telegram Bot</h2>
            <p className="mb-6">
              Are you sure you want to delete the Telegram bot @
              {confirmInfo.username}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 border rounded"
                onClick={closeConfirmDialog}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-500 text-white rounded"
                onClick={() => {
                  handleDelete(confirmInfo.accountId);
                  closeConfirmDialog();
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Dialog */}
      {showMessageDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded shadow-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Send Telegram Message</h2>
            <p className="mb-4">
              Enter the chat ID and message content to send a message through
              your Telegram bot.
            </p>
            <div className="mb-4 text-sm text-gray-600">
              <strong>How to get a Chat ID:</strong>
              <ul className="ml-5 mt-1">
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
            </div>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                className="flex-1 border p-2 rounded"
                placeholder="Chat ID"
                value={messageInfo.chatId}
                onChange={(e) =>
                  setMessageInfo({ ...messageInfo, chatId: e.target.value })
                }
                required
              />
              <button
                className="px-3 py-1 border rounded"
                onClick={openChatIdHelper}
              >
                Find ID
              </button>
            </div>
            <textarea
              className="w-full border p-2 rounded mb-4"
              rows="4"
              placeholder="Enter your message"
              value={messageInfo.message}
              onChange={(e) =>
                setMessageInfo({ ...messageInfo, message: e.target.value })
              }
              required
            ></textarea>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 border rounded"
                onClick={closeMessageDialog}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded flex items-center"
                onClick={handleSendMessage}
              >
                <span className="mr-1">→</span> Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
