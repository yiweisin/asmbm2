"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  twitterService,
  discordService,
  telegramService,
} from "@/services/api";
import toast from "react-hot-toast";

export default function Dashboard() {
  const [accounts, setAccounts] = useState({
    twitter: [],
    discord: [],
    telegram: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAccounts() {
      setIsLoading(true);
      try {
        const [twitterAccounts, discordAccounts, telegramAccounts] =
          await Promise.all([
            twitterService.getAccounts(),
            discordService.getAccounts(),
            telegramService.getAccounts(),
          ]);

        setAccounts({
          twitter: twitterAccounts,
          discord: discordAccounts,
          telegram: telegramAccounts,
        });
      } catch (error) {
        console.error("Error fetching accounts:", error);
        toast.error("Failed to load accounts");
      } finally {
        setIsLoading(false);
      }
    }

    fetchAccounts();
  }, []);

  return (
    <div>
      <div className="pb-5 border-b border-gray-200 mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Twitter Panel */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Twitter
                </h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {accounts.twitter.length} accounts
                </span>
              </div>
              <div className="mt-4">
                {accounts.twitter.length > 0 ? (
                  <div className="space-y-2">
                    {accounts.twitter.map((account) => (
                      <div
                        key={account.id}
                        className="bg-gray-50 p-3 rounded-md flex justify-between items-center"
                      >
                        <span className="font-medium">@{account.username}</span>
                        <button
                          onClick={async () => {
                            try {
                              await twitterService.deleteAccount(account.id);
                              setAccounts((prev) => ({
                                ...prev,
                                twitter: prev.twitter.filter(
                                  (a) => a.id !== account.id
                                ),
                              }));
                              toast.success("Twitter account disconnected");
                            } catch (error) {
                              toast.error("Failed to disconnect account");
                            }
                          }}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Disconnect
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    No Twitter accounts connected
                  </p>
                )}
                <div className="mt-4">
                  <Link
                    href="/dashboard/twitter/connect"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Connect Twitter
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Discord Panel */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Discord
                </h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  {accounts.discord.length} accounts
                </span>
              </div>
              <div className="mt-4">
                {accounts.discord.length > 0 ? (
                  <div className="space-y-2">
                    {accounts.discord.map((account) => (
                      <div
                        key={account.id}
                        className="bg-gray-50 p-3 rounded-md flex justify-between items-center"
                      >
                        <span className="font-medium">{account.username}</span>
                        <button
                          onClick={async () => {
                            try {
                              await discordService.deleteAccount(account.id);
                              setAccounts((prev) => ({
                                ...prev,
                                discord: prev.discord.filter(
                                  (a) => a.id !== account.id
                                ),
                              }));
                              toast.success("Discord account disconnected");
                            } catch (error) {
                              toast.error("Failed to disconnect account");
                            }
                          }}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Disconnect
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    No Discord accounts connected
                  </p>
                )}
                <div className="mt-4">
                  <Link
                    href="/dashboard/discord/connect"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Connect Discord
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Telegram Panel */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Telegram
                </h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {accounts.telegram.length} accounts
                </span>
              </div>
              <div className="mt-4">
                {accounts.telegram.length > 0 ? (
                  <div className="space-y-2">
                    {accounts.telegram.map((account) => (
                      <div
                        key={account.id}
                        className="bg-gray-50 p-3 rounded-md flex justify-between items-center"
                      >
                        <span className="font-medium">@{account.username}</span>
                        <button
                          onClick={async () => {
                            try {
                              await telegramService.deleteAccount(account.id);
                              setAccounts((prev) => ({
                                ...prev,
                                telegram: prev.telegram.filter(
                                  (a) => a.id !== account.id
                                ),
                              }));
                              toast.success("Telegram account disconnected");
                            } catch (error) {
                              toast.error("Failed to disconnect account");
                            }
                          }}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Disconnect
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    No Telegram accounts connected
                  </p>
                )}
                <div className="mt-4">
                  <Link
                    href="/dashboard/telegram/connect"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Connect Telegram
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <div className="mt-8">
        <div className="pb-5 border-b border-gray-200 mb-5">
          <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul role="list" className="divide-y divide-gray-200">
            <li className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">
                  No recent activity
                </p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
