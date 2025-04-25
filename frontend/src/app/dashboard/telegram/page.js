"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { telegramService, authService } from "@/services/api";
import toast from "react-hot-toast";
import AITextGenerator from "@/components/AiTextGenerator";

export default function TelegramPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Message state
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

      // If user has no accounts, redirect to connect page
      if (data.length === 0) {
        router.push("/dashboard/telegram/connect");
        return;
      }

      // Automatically select the first account
      if (data.length > 0) {
        setMessageInfo((prev) => ({
          ...prev,
          accountId: data[0].id,
        }));
      }

      setError(null);
    } catch (err) {
      setError("Failed to load Telegram accounts: " + (err.error || err));
      toast.error("Failed to load Telegram accounts");
    } finally {
      setLoading(false);
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

  // Handle AI-generated text
  const handleAIGenerated = (text) => {
    setMessageInfo((prev) => ({
      ...prev,
      message: text,
    }));
  };

  // Send message
  const handleSendMessage = async () => {
    const { accountId, chatId, message } = messageInfo;

    if (!chatId || !message) {
      toast.error("Please enter both chat ID and message");
      return;
    }

    try {
      // Always use the first account's ID
      const activeAccountId = accounts[0]?.id;

      if (!activeAccountId) {
        toast.error("No Telegram bot available");
        return;
      }

      await telegramService.sendMessage(activeAccountId, chatId, message);
      // Clear just the message, keep the chat ID
      setMessageInfo((prev) => ({
        ...prev,
        message: "",
      }));
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

      <div className="mb-4">
        <h2 className="text-xl font-semibold">Your Bots</h2>
      </div>

      {/* Bot Info */}
      <div className="mb-6">
        {accounts.length > 0 && (
          <div className="bg-white p-4 rounded shadow mb-3">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">@{accounts[0].username}</h3>
                <p className="text-gray-600 text-sm">
                  ID: {accounts[0].telegramId}
                </p>
              </div>
              <div>
                <button
                  className="text-red-500"
                  onClick={() => openConfirmDialog(accounts[0])}
                  title="Delete Account"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Message Box */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-bold mb-4">Send Message</h2>
        <div className="mb-4">
          {accounts.length > 0 && (
            <p className="text-sm text-gray-600 mb-1">
              Sending as: @{accounts[0].username}
            </p>
          )}

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

          <div className="mb-4">
            <textarea
              className="w-full border p-2 rounded"
              rows="4"
              placeholder="Enter your message"
              value={messageInfo.message}
              onChange={(e) =>
                setMessageInfo({ ...messageInfo, message: e.target.value })
              }
              required
            ></textarea>

            {/* Add AI Text Generator */}
            <div className="mt-1 flex justify-start">
              <AITextGenerator
                onTextGenerated={handleAIGenerated}
                platform="telegram"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              className="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded flex items-center"
              onClick={handleSendMessage}
            >
              <span className="mr-1">→</span> Send
            </button>
          </div>
        </div>
      </div>

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
    </div>
  );
}
