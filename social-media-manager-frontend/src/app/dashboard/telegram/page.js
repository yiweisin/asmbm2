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
  const [currentUser, setCurrentUser] = useState(null);

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

  // Check if user is logged in and load accounts
  useEffect(() => {
    if (!authService.isLoggedIn()) {
      router.push("/login");
      return;
    }

    // Get current user details including account type
    const user = authService.getCurrentUser();
    setCurrentUser(user);

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

  // Check if user is premium
  const isPremiumUser = () => {
    return currentUser?.accountType === "premium";
  };

  // Check if user can add more bots
  const canAddMoreBots = () => {
    // Only premium users can add more bots
    if (isPremiumUser()) {
      return true;
    }
    // Non-premium users can add a bot if they don't have any
    return accounts.length === 0;
  };

  // Navigate to connect page
  const handleAddBot = () => {
    router.push("/dashboard/telegram/connect");
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Telegram Bots</h1>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          {error}
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Your Bots</h2>
        {canAddMoreBots() && (
          <button
            className="px-3 py-1 bg-blue-500 text-white rounded"
            onClick={handleAddBot}
          >
            Connect New Bot
          </button>
        )}
      </div>

      {!isPremiumUser() && accounts.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Upgrade to Premium to connect multiple Telegram bots.
              </p>
              <p className="mt-2">
                <button
                  className="text-sm text-yellow-700 underline"
                  onClick={() => router.push("/dashboard/profile")}
                >
                  Upgrade now
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Send Telegram Message</h2>

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
