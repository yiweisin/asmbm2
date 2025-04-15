"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { telegramService, authService } from "@/services/api";
import toast from "react-hot-toast";

export default function TelegramConnectPage() {
  const router = useRouter();
  const [botToken, setBotToken] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check user eligibility on page load
  useEffect(() => {
    async function checkEligibility() {
      try {
        setLoading(true);

        // Check if user is logged in
        if (!authService.isLoggedIn()) {
          router.push("/login");
          return;
        }

        // Get current user details
        const currentUser = authService.getCurrentUser();
        const isPremiumUser = currentUser?.accountType === "premium";

        // Get existing accounts
        const accounts = await telegramService.getAccounts();

        // If user already has a bot and is not premium, redirect to profile page
        if (accounts.length > 0 && !isPremiumUser) {
          toast.error("Upgrade to Premium to connect multiple Telegram bots");
          router.push("/dashboard/profile");
          return;
        }
      } catch (error) {
        console.error("Error checking eligibility:", error);
      } finally {
        setLoading(false);
      }
    }

    checkEligibility();
  }, [router]);

  const handleConnect = async (e) => {
    e.preventDefault();

    if (!botToken.trim()) {
      toast.error("Please enter a bot token");
      return;
    }

    setIsConnecting(true);
    try {
      await telegramService.connect(botToken);
      toast.success("Telegram bot connected successfully!");
      router.push("/dashboard/telegram");
    } catch (error) {
      console.error("Error connecting Telegram bot:", error);
      toast.error(
        "Failed to connect Telegram bot. Please check your token and try again."
      );
    } finally {
      setIsConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 pb-5 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">
          Connect Telegram Bot
        </h1>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mx-auto h-12 w-12 text-blue-400"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Connect your Telegram Bot
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Connect a Telegram Bot to send messages and interact with users.
            </p>

            <div className="mt-6 max-w-md mx-auto">
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-blue-800 text-sm">
                  How to get a Bot Token:
                </h4>
                <ol className="mt-2 text-sm text-blue-700 list-decimal pl-4 space-y-1">
                  <li>Open Telegram and search for "@BotFather"</li>
                  <li>Start a chat and send the command "/newbot"</li>
                  <li>Follow the instructions to create a new bot</li>
                  <li>BotFather will give you a token for your new bot</li>
                  <li>Copy and paste the token below</li>
                </ol>
              </div>

              <form onSubmit={handleConnect}>
                <div className="mb-4">
                  <label
                    htmlFor="botToken"
                    className="block text-sm font-medium text-gray-700 text-left"
                  >
                    Bot Token
                  </label>
                  <input
                    type="text"
                    name="botToken"
                    id="botToken"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isConnecting}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isConnecting ? "Connecting..." : "Connect Telegram Bot"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
