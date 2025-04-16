"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { twitterService } from "@/services/api";
import toast from "react-hot-toast";
import {
  BarChart,
  Users,
  MessageSquare,
  PenSquare,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import AITextGenerator from "@/components/AiTextGenerator";
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

// Helper function to manage local cache
const getTweetCache = () => {
  try {
    const cache = localStorage.getItem(`twitter_timeline_cache`);
    if (cache) {
      const { data, timestamp } = JSON.parse(cache);

      // Check if cache is less than 15 minutes old
      const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
      if (timestamp > fifteenMinutesAgo) {
        return data;
      }
    }
    return null;
  } catch (error) {
    console.error("Error reading tweet cache:", error);
    return null;
  }
};

const setTweetCache = (data) => {
  try {
    localStorage.setItem(
      `twitter_timeline_cache`,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );
  } catch (error) {
    console.error("Error saving tweet cache:", error);
  }
};

export default function TwitterDashboard() {
  const [account, setAccount] = useState(null);
  const [tweets, setTweets] = useState([]);
  const [tweetText, setTweetText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshDisabled, setRefreshDisabled] = useState(false);
  const [refreshCountdown, setRefreshCountdown] = useState(0);
  const [accountStats, setAccountStats] = useState({
    followers: 0,
    following: 0,
    tweetsPosted: 0,
  });
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
  const [timeRange, setTimeRange] = useState("7d"); // 7d, 30d, 90d

  // Load Twitter account
  useEffect(() => {
    async function loadAccount() {
      try {
        const data = await twitterService.getAccounts();

        // Take the first account or null if none exists
        if (data.length > 0) {
          setAccount(data[0]);
          loadTweets(data[0].id);
          loadAccountDetails(data[0].id);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error loading Twitter account:", error);
        toast.error("Failed to load Twitter account");
        setIsLoading(false);
      }
    }

    loadAccount();
  }, []);

  // Countdown refresh timer
  useEffect(() => {
    let timer;

    if (refreshCountdown > 0) {
      timer = setTimeout(() => {
        setRefreshCountdown((prevCount) => prevCount - 1);
      }, 1000);
    } else if (refreshCountdown === 0 && refreshDisabled) {
      setRefreshDisabled(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [refreshCountdown, refreshDisabled]);

  // Load account details (followers, following, tweet count) and analytics
  const loadAccountDetails = async (accountId) => {
    try {
      // Get analytics for account stats
      const analyticsData = await twitterService.getAnalytics(
        accountId,
        timeRange
      );

      // Extract account stats from analytics
      setAccountStats({
        followers: analyticsData.summaryStats.currentFollowers || 0,
        following: 0, // Not provided in analytics, could be added to backend later
        tweetsPosted: tweets.length || 0,
      });

      // Set full analytics data
      setAnalytics(analyticsData);
    } catch (error) {
      console.error("Error loading account details:", error);
      // Don't show error toast as this is supplementary data
    }
  };

  // Handle time range change for analytics
  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
    if (account) {
      loadAccountDetails(account.id);
    }
  };

  // Load tweets for the account
  const loadTweets = async (accountId, forceRefresh = false) => {
    if (refreshDisabled && !forceRefresh) {
      toast.error(`Please wait ${refreshCountdown} seconds before refreshing`);
      return;
    }

    setIsLoading(true);

    // Try to get cached tweets first if not forcing refresh
    if (!forceRefresh) {
      const cachedTweets = getTweetCache();
      if (cachedTweets) {
        console.log("Using cached tweets");
        setTweets(cachedTweets.data || []);
        setLastUpdated(new Date(cachedTweets.timestamp));
        setIsLoading(false);

        // Still try to update in the background
        fetchTweets(accountId, false);
        return;
      }
    }

    // No valid cache, need to fetch
    await fetchTweets(accountId, true);
  };

  // Function to fetch tweets from API
  const fetchTweets = async (accountId, updateLoadingState = true) => {
    try {
      const data = await twitterService.getTimeline(accountId);

      // Save to local cache
      if (data && data.data) {
        setTweets(data.data);
        setTweetCache(data);
        setLastUpdated(new Date());

        // Update tweets posted count
        setAccountStats((prev) => ({
          ...prev,
          tweetsPosted: data.data.length || 0,
        }));
      } else {
        setTweets([]);
      }
    } catch (error) {
      console.error("Error loading tweets:", error);

      // Check if it's a rate limit error
      const errorMsg = error.toString().toLowerCase();
      if (
        errorMsg.includes("rate limit") ||
        errorMsg.includes("too many requests")
      ) {
        // Extract wait time if available (e.g., "Please try again in 15 minutes")
        const match = errorMsg.match(/try again in (\d+) minutes/);
        if (match && match[1]) {
          const waitMinutes = parseInt(match[1]);
          const waitSeconds = waitMinutes * 60;
          setRefreshCountdown(waitSeconds);
          setRefreshDisabled(true);
          toast.error(
            `Twitter rate limit reached. Try again in ${waitMinutes} minutes.`
          );
        } else {
          // Default to 15 minute wait if specific time not provided
          setRefreshCountdown(15 * 60);
          setRefreshDisabled(true);
          toast.error("Twitter rate limit reached. Try again in 15 minutes.");
        }

        // Try to use cached tweets
        const cachedTweets = getTweetCache();
        if (cachedTweets) {
          setTweets(cachedTweets.data || []);
          setLastUpdated(new Date(cachedTweets.timestamp));
          toast.info("Showing cached tweets");
        } else {
          toast.error("Failed to load tweets and no cache available");
        }
      } else {
        toast.error("Failed to load tweets");
      }
    } finally {
      if (updateLoadingState) {
        setIsLoading(false);
      }
    }
  };

  // Handle tweet submission
  const handleTweetSubmit = async (e) => {
    e.preventDefault();

    if (!account) {
      toast.error("No Twitter account connected");
      return;
    }

    if (!tweetText.trim()) {
      toast.error("Tweet cannot be empty");
      return;
    }

    setIsPosting(true);
    try {
      await twitterService.postTweet(account.id, tweetText);
      toast.success("Tweet posted successfully!");
      setTweetText("");

      // Refresh the timeline
      await loadTweets(account.id, true);

      // Update account stats
      setAccountStats((prev) => ({
        ...prev,
        tweetsPosted: prev.tweetsPosted + 1,
      }));
    } catch (error) {
      console.error("Error posting tweet:", error);
      toast.error("Failed to post tweet. Please try again.");
    } finally {
      setIsPosting(false);
    }
  };

  // Handle text generated from AI
  const handleAIGenerated = (text) => {
    setTweetText(text);
  };

  // Format a tweet's created date
  const formatTweetDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Format the last updated time
  const formatLastUpdated = () => {
    if (!lastUpdated) return "";

    const now = new Date();
    const diff = Math.floor((now - lastUpdated) / 1000); // seconds

    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    return `${Math.floor(diff / 3600)} hours ago`;
  };

  return (
    <div className="space-y-6">
      <div className="pb-5 border-b border-gray-200 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Twitter Dashboard</h1>
      </div>

      {!account ? (
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
              No Twitter account connected
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Connect your Twitter account to post tweets and view your
              timeline.
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
          {/* Account Info Card */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 text-blue-500"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M22.162 5.656a8.384 8.384 0 0 1-2.402.658A4.196 4.196 0 0 0 21.6 4c-.82.488-1.719.83-2.656 1.015a4.182 4.182 0 0 0-7.126 3.814 11.874 11.874 0 0 1-8.62-4.37 4.168 4.168 0 0 0-.566 2.103c0 1.45.738 2.731 1.86 3.481a4.168 4.168 0 0 1-1.894-.523v.052a4.185 4.185 0 0 0 3.355 4.101 4.21 4.21 0 0 1-1.89.072A4.185 4.185 0 0 0 7.97 16.65a8.394 8.394 0 0 1-6.191 1.732 11.83 11.83 0 0 0 6.41 1.88c7.693 0 11.9-6.373 11.9-11.9 0-.18-.005-.362-.013-.54a8.496 8.496 0 0 0 2.087-2.165z" />
                </svg>
              </div>
              <div className="ml-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  @{account.username}
                </h2>
                <div className="mt-3 flex space-x-6">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-gray-500 mr-2" />
                    <span className="text-sm text-gray-700">
                      {accountStats.followers} Followers
                    </span>
                  </div>
                  <div className="flex items-center">
                    <MessageSquare className="h-5 w-5 text-gray-500 mr-2" />
                    <span className="text-sm text-gray-700">
                      {accountStats.tweetsPosted} Tweets
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-gray-500 mr-2" />
                    <span className="text-sm text-gray-700">
                      {accountStats.following} Following
                    </span>
                  </div>
                </div>
              </div>

              <div className="ml-auto">
                <Link
                  href="/dashboard/twitter/connect"
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Update Account
                </Link>
              </div>
            </div>
          </div>

          {/* Post new tweet */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Post a Tweet
            </h2>
            <form onSubmit={handleTweetSubmit}>
              <div>
                <label htmlFor="tweet-text" className="sr-only">
                  Tweet
                </label>
                <textarea
                  id="tweet-text"
                  name="tweet-text"
                  rows={3}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md"
                  placeholder="What's happening?"
                  value={tweetText}
                  onChange={(e) => setTweetText(e.target.value)}
                  maxLength={280}
                />
                <div className="mt-1">
                  <AITextGenerator
                    onTextGenerated={handleAIGenerated}
                    platform="twitter"
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  {tweetText.length}/280 characters
                </div>
                <button
                  type="submit"
                  disabled={isPosting || !tweetText.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isPosting ? "Posting..." : "Tweet"}
                </button>
              </div>
            </form>
          </div>

          {/* Analytics Overview */}
          {account && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">
                  Analytics Overview
                </h2>
                <div>
                  <label className="sr-only">Time Range</label>
                  <div className="flex rounded-md shadow-sm">
                    <button
                      type="button"
                      onClick={() => handleTimeRangeChange("7d")}
                      className={`px-3 py-1 text-xs font-medium rounded-l-md ${
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
                      className={`px-3 py-1 text-xs font-medium ${
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
                      className={`px-3 py-1 text-xs font-medium rounded-r-md ${
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Followers Card */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-800">
                    Followers
                  </h3>
                  <p className="mt-2 text-xl font-bold text-blue-900">
                    {analytics.summaryStats.currentFollowers}
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
                      {analytics.summaryStats.followerGrowth} (
                      {analytics.summaryStats.followerGrowthPercent}%)
                    </span>
                    {analytics.summaryStats.followerGrowth >= 0 ? (
                      <TrendingUp className="ml-1.5 h-4 w-4" />
                    ) : (
                      <TrendingDown className="ml-1.5 h-4 w-4" />
                    )}
                  </div>
                </div>

                {/* Likes Card */}
                <div className="bg-pink-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-pink-800">Likes</h3>
                  <p className="mt-2 text-xl font-bold text-pink-900">
                    {analytics.summaryStats.currentLikes}
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
                      {analytics.summaryStats.likeGrowth} (
                      {analytics.summaryStats.likeGrowthPercent}%)
                    </span>
                    {analytics.summaryStats.likeGrowth >= 0 ? (
                      <TrendingUp className="ml-1.5 h-4 w-4" />
                    ) : (
                      <TrendingDown className="ml-1.5 h-4 w-4" />
                    )}
                  </div>
                </div>

                {/* Views Card */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-purple-800">Views</h3>
                  <p className="mt-2 text-xl font-bold text-purple-900">
                    {analytics.summaryStats.currentViews}
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
                      {analytics.summaryStats.viewGrowth} (
                      {analytics.summaryStats.viewGrowthPercent}%)
                    </span>
                    {analytics.summaryStats.viewGrowth >= 0 ? (
                      <TrendingUp className="ml-1.5 h-4 w-4" />
                    ) : (
                      <TrendingDown className="ml-1.5 h-4 w-4" />
                    )}
                  </div>
                </div>
              </div>

              {/* Follower Growth Mini Chart */}
              <div className="h-48 mb-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={analytics.followerData}
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="followers"
                      stroke="#3b82f6"
                      activeDot={{ r: 6 }}
                      name="Followers"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="text-center">
                <Link
                  href="/dashboard/twitter/analytics"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <BarChart className="mr-2 h-4 w-4" />
                  View Detailed Analytics
                </Link>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">
                Your Timeline
              </h2>
              <div className="flex items-center space-x-4">
                {lastUpdated && (
                  <span className="text-xs text-gray-500">
                    Last updated: {formatLastUpdated()}
                  </span>
                )}
                <button
                  onClick={() => loadTweets(account.id, true)}
                  disabled={isLoading || refreshDisabled}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {refreshDisabled
                    ? `Refresh in ${refreshCountdown}s`
                    : isLoading
                    ? "Refreshing..."
                    : "Refresh"}
                </button>
              </div>
            </div>
            <div className="border-t border-gray-200">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : tweets.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {tweets.map((tweet) => (
                    <li key={tweet.id} className="px-4 py-5 sm:px-6">
                      <div className="text-sm text-gray-900">{tweet.text}</div>
                      {tweet.created_at && (
                        <div className="mt-1 text-xs text-gray-500">
                          {formatTweetDate(tweet.created_at)}
                        </div>
                      )}
                      {tweet.public_metrics && (
                        <div className="mt-2 flex space-x-4 text-xs text-gray-500">
                          <span>
                            {tweet.public_metrics.retweet_count} Retweets
                          </span>
                          <span>{tweet.public_metrics.like_count} Likes</span>
                          <span>
                            {tweet.public_metrics.reply_count} Replies
                          </span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-5 sm:px-6 text-center text-gray-500">
                  No tweets found. Post your first tweet!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
