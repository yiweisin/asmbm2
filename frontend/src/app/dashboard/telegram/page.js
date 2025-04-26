"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* Page Header with Gradient Background */}
      <div className="bg-gradient-to-r from-blue-500 via-cyan-600 to-teal-500 rounded-xl p-6 mb-8 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Telegram Bots</h1>
            <p className="text-blue-100">
              Manage and send messages with your Telegram bots
            </p>
          </div>
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-all duration-200 shadow-md font-medium flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Dashboard
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-rose-100 border-l-4 border-rose-500 text-rose-700 p-4 mb-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="font-medium">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Bot Info */}
        <div className="col-span-1">
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4">
              <h2 className="text-white text-xl font-bold flex items-center">
                <i className="fab fa-telegram text-xl mr-2"></i>
                Your Bots
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                Manage your Telegram bot accounts
              </p>
            </div>

            {accounts.length > 0 ? (
              <div className="p-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="bg-blue-100 p-3 rounded-full mr-3">
                        <i className="fab fa-telegram text-blue-500 text-xl"></i>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800">
                          @{accounts[0].username}
                        </h3>
                        <p className="text-gray-600 text-sm flex items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                            />
                          </svg>
                          ID: {accounts[0].telegramId}
                        </p>
                      </div>
                    </div>
                    <button
                      className="px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-medium flex items-center transition-all duration-150"
                      onClick={() => openConfirmDialog(accounts[0])}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 mx-auto mb-4 text-blue-300 opacity-80"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                  />
                </svg>
                <p className="text-lg text-gray-600">No bots connected</p>
                <Link
                  href="/dashboard/telegram/connect"
                  className="inline-block mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 shadow-md font-medium"
                >
                  Connect a Bot
                </Link>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mt-6 bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300">
            <div className="bg-gradient-to-r from-purple-600 to-violet-600 px-6 py-4">
              <h2 className="text-white text-xl font-bold flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Quick Actions
              </h2>
            </div>

            <div className="p-4 space-y-3">
              <Link
                href="/dashboard/schedule"
                className="bg-indigo-50 hover:bg-indigo-100 p-4 rounded-lg flex items-center text-indigo-700 border border-indigo-100 transition-colors duration-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 mr-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <div>
                  <p className="font-medium">Schedule Posts</p>
                  <p className="text-sm text-indigo-600">
                    Plan your Telegram content
                  </p>
                </div>
              </Link>

              <a
                href="https://core.telegram.org/bots#how-do-i-create-a-bot"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-teal-50 hover:bg-teal-100 p-4 rounded-lg flex items-center text-teal-700 border border-teal-100 transition-colors duration-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 mr-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="font-medium">Help & Resources</p>
                  <p className="text-sm text-teal-600">
                    Learn more about Telegram bots
                  </p>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Message Box */}
        <div className="col-span-2">
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300">
            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4">
              <h2 className="text-white text-xl font-bold flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
                Send Message
              </h2>
              {accounts.length > 0 && (
                <p className="text-blue-100 text-sm mt-1">
                  Sending as: @{accounts[0].username}
                </p>
              )}
            </div>

            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chat ID
                  <span className="text-xs text-gray-500 ml-1">
                    (User or group chat ID)
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 border border-gray-300 rounded-lg p-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. 123456789"
                    value={messageInfo.chatId}
                    onChange={(e) =>
                      setMessageInfo({ ...messageInfo, chatId: e.target.value })
                    }
                    required
                  />
                  <button
                    className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 font-medium transition-all duration-150 flex items-center"
                    onClick={openChatIdHelper}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    Find ID
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Don't know the chat ID? Click "Find ID" to open Telegram's
                  getUpdates API.
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg p-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  rows="6"
                  placeholder="Enter your message content here..."
                  value={messageInfo.message}
                  onChange={(e) =>
                    setMessageInfo({ ...messageInfo, message: e.target.value })
                  }
                  required
                ></textarea>

                {/* Add AI Text Generator */}
                <div className="mt-2">
                  <AITextGenerator
                    onTextGenerated={handleAIGenerated}
                    platform="telegram"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg shadow-sm hover:from-blue-700 hover:to-cyan-700 font-medium transition-all duration-150 flex items-center"
                  onClick={handleSendMessage}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-md w-full mx-4 overflow-hidden shadow-xl">
            <div className="bg-gradient-to-r from-rose-500 to-pink-600 px-6 py-4">
              <h3 className="text-xl font-bold text-white flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete Telegram Bot
              </h3>
              <p className="text-rose-100 text-sm">
                This action cannot be undone
              </p>
            </div>

            <div className="p-6">
              <div className="bg-rose-50 p-4 rounded-lg border border-rose-200 mb-6">
                <p className="text-rose-800">
                  Are you sure you want to delete the Telegram bot{" "}
                  <span className="font-bold">@{confirmInfo.username}</span>?
                  This will remove the bot from your account but won't delete
                  the actual Telegram bot.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white shadow-sm hover:bg-gray-50 font-medium transition-all duration-150"
                  onClick={closeConfirmDialog}
                >
                  Cancel
                </button>
                <button
                  className="px-6 py-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg shadow-sm hover:from-rose-600 hover:to-pink-700 font-medium transition-all duration-150"
                  onClick={() => {
                    handleDelete(confirmInfo.accountId);
                    closeConfirmDialog();
                  }}
                >
                  Delete Bot
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
