"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
            <h1 className="text-3xl font-bold text-white">
              Connect Telegram Bot
            </h1>
            <p className="text-blue-100">
              Add your Telegram bot to start sending messages
            </p>
          </div>
          <Link
            href="/dashboard/telegram"
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Telegram
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Information Panel */}
        <div className="col-span-1">
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
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
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                How It Works
              </h2>
              <p className="text-indigo-100 text-sm mt-1">
                Learn how to connect your Telegram bot
              </p>
            </div>

            <div className="p-6">
              <div className="bg-indigo-50 rounded-lg p-5 border border-indigo-100">
                <h3 className="font-bold text-indigo-800 mb-3 flex items-center">
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
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  How to get a Bot Token:
                </h3>
                <ol className="space-y-3 text-indigo-700">
                  <li className="flex items-start">
                    <span className="bg-indigo-200 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0 font-medium">
                      1
                    </span>
                    <span>
                      Open Telegram and search for{" "}
                      <span className="font-bold">@BotFather</span>
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-indigo-200 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0 font-medium">
                      2
                    </span>
                    <span>
                      Start a chat and send the command{" "}
                      <span className="font-mono bg-indigo-100 px-2 py-0.5 rounded">
                        /newbot
                      </span>
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-indigo-200 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0 font-medium">
                      3
                    </span>
                    <span>Follow the instructions to create a new bot</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-indigo-200 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0 font-medium">
                      4
                    </span>
                    <span>
                      BotFather will give you a token for your new bot
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-indigo-200 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0 font-medium">
                      5
                    </span>
                    <span>Copy and paste the token in the form</span>
                  </li>
                </ol>
              </div>

              <div className="mt-6 bg-blue-50 rounded-lg p-5 border border-blue-100">
                <h3 className="font-bold text-blue-800 mb-3 flex items-center">
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
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  What you'll be able to do:
                </h3>
                <ul className="space-y-2 text-blue-700">
                  <li className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2 text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Send messages to users or groups
                  </li>
                  <li className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2 text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Schedule posts for later
                  </li>
                  <li className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2 text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Use AI to generate message content
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Connect Form */}
        <div className="col-span-2">
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4">
              <h2 className="text-white text-xl font-bold flex items-center">
                <i className="fab fa-telegram text-xl mr-2"></i>
                Connect Your Bot
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                Enter your Telegram bot token to connect
              </p>
            </div>

            <div className="p-6">
              <div className="flex flex-col items-center mb-6">
                <div className="bg-blue-100 p-4 rounded-full mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-16 w-16 text-blue-500"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Add Your Telegram Bot
                </h3>
                <p className="text-gray-600 text-center max-w-md">
                  Enter your bot token below to connect it to our platform.
                  You'll be able to send and schedule messages through this bot.
                </p>
              </div>

              <form onSubmit={handleConnect} className="max-w-md mx-auto">
                <div className="mb-6">
                  <label
                    htmlFor="botToken"
                    className="block text-sm font-medium text-gray-700 mb-2"
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
                    className="w-full border border-gray-300 rounded-lg p-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    The token is a string like{" "}
                    <span className="font-mono text-gray-600">
                      123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
                    </span>{" "}
                    provided by BotFather
                  </p>
                </div>

                <div className="flex justify-center">
                  <button
                    type="submit"
                    disabled={isConnecting}
                    className={`px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg shadow-sm font-medium transition-all duration-150 flex items-center
                      ${
                        isConnecting
                          ? "opacity-70 cursor-not-allowed"
                          : "hover:from-blue-700 hover:to-cyan-700"
                      }`}
                  >
                    {isConnecting ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Connecting...
                      </>
                    ) : (
                      <>
                        <i className="fab fa-telegram mr-2"></i>
                        Connect Telegram Bot
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Help Resources */}
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
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Need Help?
              </h2>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a
                  href="https://core.telegram.org/bots"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-purple-50 hover:bg-purple-100 p-4 rounded-lg flex items-center text-purple-700 border border-purple-100 transition-colors duration-200"
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <div>
                    <p className="font-medium">Telegram Bot Documentation</p>
                    <p className="text-sm text-purple-600">
                      Official guides and API docs
                    </p>
                  </div>
                </a>

                <a
                  href="https://t.me/botfather"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-50 hover:bg-blue-100 p-4 rounded-lg flex items-center text-blue-700 border border-blue-100 transition-colors duration-200"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 mr-3 text-blue-500"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z" />
                  </svg>
                  <div>
                    <p className="font-medium">Open BotFather</p>
                    <p className="text-sm text-blue-600">
                      Create a new bot on Telegram
                    </p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
