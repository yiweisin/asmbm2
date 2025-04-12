"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { twitterService } from "@/services/api";
import toast from "react-hot-toast";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";

export default function TwitterAnalytics() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    followerData: [],
    engagementData: [],
    summaryStats: {
      currentFollowers: 0,
      followerGrowth: 0,
      followerGrowthPercent: 0,
      currentLikes: 0,
      likeGrowth: 0,
      likeGrowthPercent: 0,
      currentViews: 0,
      viewGrowth: 0,
      viewGrowthPercent: 0,
    },
  });
  const [timeRange, setTimeRange] = useState("30d"); // 7d, 30d, 90d
  const router = useRouter();

  // Load Twitter accounts
  useEffect(() => {
    async function loadAccounts() {
      try {
        const data = await twitterService.getAccounts();
        setAccounts(data);

        // Select the first account by default if available
        if (data.length > 0) {
          setSelectedAccount(data[0]);
          loadAnalytics(data[0].id, timeRange);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error loading Twitter accounts:", error);
        toast.error("Failed to load Twitter accounts");
        setIsLoading(false);
      }
    }

    loadAccounts();
  }, []);

  // Load analytics data for the selected account
  const loadAnalytics = async (accountId, range) => {
    setIsLoading(true);
    try {
      const data = await twitterService.getAnalytics(accountId, range);
      setAnalytics(data);
    } catch (error) {
      console.error("Error loading analytics:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle account selection change
  const handleAccountChange = (event) => {
    const accountId = parseInt(event.target.value);
    const account = accounts.find((acc) => acc.id === accountId);
    setSelectedAccount(account);
    if (account) {
      loadAnalytics(account.id, timeRange);
    }
  };

  // Handle time range change
  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
    if (selectedAccount) {
      loadAnalytics(selectedAccount.id, range);
    }
  };

  // Format numbers with K/M suffix
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  return (
    <div className="space-y-6">
      <div className="pb-5 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center">
          <Link
            href="/dashboard/twitter"
            className="mr-3 p-1 rounded-full text-blue-600 hover:bg-blue-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Twitter Analytics
          </h1>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
          <div className="text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mx-auto h-12 w-12 text-blue-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M22.162 5.656a8.384 8.384 0 0 1-2.402.658A4.196 4.196 0 0 0 21.6 4c-.82.488-1.719.83-2.656 1.015a4.182 4.182 0 0 0-7.126 3.814 11.874 11.874 0 0 1-8.62-4.37 4.168 4.168 0 0 0-.566 2.103c0 1.45.738 2.731 1.86 3.481a4.168 4.168 0 0 1-1.894-.523v.052a4.185 4.185 0 0 0 3.355 4.101 4.21 4.21 0 0 1-1.89.072A4.185 4.185 0 0 0 7.97 16.65a8.394 8.394 0 0 1-6.191 1.732 11.83 11.83 0 0 0 6.41 1.88c7.693 0 11.9-6.373 11.9-11.9 0-.18-.005-.362-.013-.54a8.496 8.496 0 0 0 2.087-2.165z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No Twitter accounts connected
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Connect your Twitter account to view analytics data.
            </p>
            <div className="mt-6">
              <Link
                href="/dashboard/twitter/connect"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Connect Twitter Account
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Account selector and time range */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="account-select"
                  className="block text-sm font-medium text-gray-700"
                >
                  Select Twitter Account
                </label>
                <select
                  id="account-select"
                  value={selectedAccount?.id || ""}
                  onChange={handleAccountChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      @{account.username}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Time Range
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <button
                    type="button"
                    onClick={() => handleTimeRangeChange("7d")}
                    className={`px-4 py-2 text-sm font-medium rounded-l-md ${
                      timeRange === "7d"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTimeRangeChange("30d")}
                    className={`px-4 py-2 text-sm font-medium ${
                      timeRange === "30d"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTimeRangeChange("90d")}
                    className={`px-4 py-2 text-sm font-medium rounded-r-md ${
                      timeRange === "90d"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    90 Days
                  </button>
                </div>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-20">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-6">
                  Growth Summary
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Followers */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-blue-800">
                      Followers
                    </h3>
                    <p className="mt-2 text-3xl font-bold text-blue-900">
                      {formatNumber(analytics.summaryStats.currentFollowers)}
                    </p>
                    <div
                      className={`mt-2 flex items-center text-sm ${
                        analytics.summaryStats.followerGrowth >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      <span className="font-medium">
                        {analytics.summaryStats.followerGrowth >= 0 ? "+" : ""}
                        {analytics.summaryStats.followerGrowth}(
                        {analytics.summaryStats.followerGrowthPercent}%)
                      </span>
                      {analytics.summaryStats.followerGrowth >= 0 ? (
                        <TrendingUp className="ml-1.5 h-4 w-4" />
                      ) : (
                        <TrendingDown className="ml-1.5 h-4 w-4" />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-blue-700">
                      In the past{" "}
                      {timeRange === "7d"
                        ? "7"
                        : timeRange === "30d"
                        ? "30"
                        : "90"}{" "}
                      days
                    </p>
                  </div>

                  {/* Likes */}
                  <div className="bg-pink-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-pink-800">Likes</h3>
                    <p className="mt-2 text-3xl font-bold text-pink-900">
                      {formatNumber(analytics.summaryStats.currentLikes)}
                    </p>
                    <div
                      className={`mt-2 flex items-center text-sm ${
                        analytics.summaryStats.likeGrowth >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      <span className="font-medium">
                        {analytics.summaryStats.likeGrowth >= 0 ? "+" : ""}
                        {analytics.summaryStats.likeGrowth}(
                        {analytics.summaryStats.likeGrowthPercent}%)
                      </span>
                      {analytics.summaryStats.likeGrowth >= 0 ? (
                        <TrendingUp className="ml-1.5 h-4 w-4" />
                      ) : (
                        <TrendingDown className="ml-1.5 h-4 w-4" />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-pink-700">
                      In the past{" "}
                      {timeRange === "7d"
                        ? "7"
                        : timeRange === "30d"
                        ? "30"
                        : "90"}{" "}
                      days
                    </p>
                  </div>

                  {/* Views */}
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-purple-800">
                      Views
                    </h3>
                    <p className="mt-2 text-3xl font-bold text-purple-900">
                      {formatNumber(analytics.summaryStats.currentViews)}
                    </p>
                    <div
                      className={`mt-2 flex items-center text-sm ${
                        analytics.summaryStats.viewGrowth >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      <span className="font-medium">
                        {analytics.summaryStats.viewGrowth >= 0 ? "+" : ""}
                        {formatNumber(analytics.summaryStats.viewGrowth)}(
                        {analytics.summaryStats.viewGrowthPercent}%)
                      </span>
                      {analytics.summaryStats.viewGrowth >= 0 ? (
                        <TrendingUp className="ml-1.5 h-4 w-4" />
                      ) : (
                        <TrendingDown className="ml-1.5 h-4 w-4" />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-purple-700">
                      In the past{" "}
                      {timeRange === "7d"
                        ? "7"
                        : timeRange === "30d"
                        ? "30"
                        : "90"}{" "}
                      days
                    </p>
                  </div>
                </div>
              </div>

              {/* Follower Growth Chart */}
              <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-6">
                  Follower Growth
                </h2>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={analytics.followerData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => {
                          // Show fewer ticks for better readability
                          const date = new Date(value);
                          return `${date.getMonth() + 1}/${date.getDate()}`;
                        }}
                      />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => [
                          `${value} followers`,
                          "Followers",
                        ]}
                        labelFormatter={(value) =>
                          new Date(value).toLocaleDateString()
                        }
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="followers"
                        stroke="#3b82f6"
                        activeDot={{ r: 8 }}
                        name="Followers"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Engagement Chart */}
              <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-6">
                  Engagement Growth
                </h2>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={analytics.engagementData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => {
                          // Show fewer ticks for better readability
                          const date = new Date(value);
                          return `${date.getMonth() + 1}/${date.getDate()}`;
                        }}
                      />
                      <YAxis yAxisId="left" orientation="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip
                        formatter={(value, name) => [
                          value,
                          name.charAt(0).toUpperCase() + name.slice(1),
                        ]}
                        labelFormatter={(value) =>
                          new Date(value).toLocaleDateString()
                        }
                      />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="likes"
                        stroke="#ec4899"
                        name="Likes"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="views"
                        stroke="#8b5cf6"
                        name="Views"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Data Source Note */}
              <div className="text-center text-sm text-gray-500">
                <p>
                  {timeRange === "7d"
                    ? "Last 7 days"
                    : timeRange === "30d"
                    ? "Last 30 days"
                    : "Last 90 days"}{" "}
                  of data. Statistics are updated daily.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
