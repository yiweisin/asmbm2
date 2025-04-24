"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { twitterService } from "@/services/api";
import toast from "react-hot-toast";
import {
  Users,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Eye,
  Heart,
  Award,
  Calendar,
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
  AreaChart,
  Area,
} from "recharts";

// Optimized cache management
const CACHE_EXPIRY = 15 * 60 * 1000; // 15 minutes

const getTweetCache = () => {
  try {
    const cache = localStorage.getItem(`twitter_timeline_cache`);
    if (cache) {
      const { data, timestamp } = JSON.parse(cache);
      const expiryTime = Date.now() - CACHE_EXPIRY;
      if (timestamp > expiryTime) return data;
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

export default function SimplifiedTwitterDashboard() {
  const [account, setAccount] = useState(null);
  const [tweets, setTweets] = useState([]);
  const [topTweets, setTopTweets] = useState({ views: [], likes: [] });
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
  const [timeRange, setTimeRange] = useState("30d");
  const [activeTab, setActiveTab] = useState("top-views");
  const [engagementTrend, setEngagementTrend] = useState([]);

  // Load Twitter account
  useEffect(() => {
    async function loadAccount() {
      try {
        const data = await twitterService.getAccounts();
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

  // Refresh timer countdown
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

  // Load account analytics
  const loadAccountDetails = async (accountId) => {
    try {
      // Get analytics data
      const analyticsData = await twitterService.getAnalytics(
        accountId,
        timeRange
      );

      setAccountStats({
        followers: analyticsData.summaryStats.currentFollowers || 0,
        following: 0,
        tweetsPosted: tweets.length || 0,
      });

      setAnalytics(analyticsData);

      // Generate engagement trend data
      generateEngagementTrend(timeRange);
    } catch (error) {
      console.error("Error loading account analytics:", error);
    }
  };

  // Generate engagement trend data
  const generateEngagementTrend = (range) => {
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const data = [];
    const baseValue = {
      likes: Math.floor(Math.random() * 200) + 50,
      retweets: Math.floor(Math.random() * 100) + 20,
      replies: Math.floor(Math.random() * 80) + 10,
    };

    const today = new Date();

    for (let i = days; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayVariation = Math.random() * 0.3 - 0.15; // -15% to +15%

      data.push({
        date: date.toISOString().split("T")[0],
        likes: Math.floor(baseValue.likes * (1 + dayVariation * (i / days))),
        retweets: Math.floor(
          baseValue.retweets * (1 + dayVariation * (i / days))
        ),
        replies: Math.floor(
          baseValue.replies * (1 + dayVariation * (i / days))
        ),
      });
    }

    setEngagementTrend(data);
  };

  // Handle time range change
  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
    if (account) {
      loadAccountDetails(account.id);
    }
  };

  // Load tweets
  const loadTweets = async (accountId, forceRefresh = false) => {
    if (refreshDisabled && !forceRefresh) {
      toast.error(`Please wait ${refreshCountdown} seconds before refreshing`);
      return;
    }

    setIsLoading(true);

    // Use cached tweets if available
    if (!forceRefresh) {
      const cachedTweets = getTweetCache();
      if (cachedTweets) {
        console.log("Using cached tweets");
        setTweets(cachedTweets.data || []);
        setLastUpdated(new Date(cachedTweets.timestamp));
        setIsLoading(false);
        processTweetsForTop(cachedTweets.data || []);
        fetchTweets(accountId, false);
        return;
      }
    }

    await fetchTweets(accountId, true);
  };

  // Process tweets to find top performers
  const processTweetsForTop = (tweetList) => {
    if (!tweetList || tweetList.length === 0) {
      setTopTweets({ views: [], likes: [] });
      return;
    }

    const tweetsWithMetrics = tweetList.filter(
      (tweet) =>
        tweet.public_metrics &&
        (tweet.public_metrics.impression_count !== undefined ||
          tweet.public_metrics.like_count !== undefined)
    );

    // Sort by views
    const topByViews = [...tweetsWithMetrics]
      .sort(
        (a, b) =>
          (b.public_metrics.impression_count || 0) -
          (a.public_metrics.impression_count || 0)
      )
      .slice(0, 5);

    // Sort by likes
    const topByLikes = [...tweetsWithMetrics]
      .sort(
        (a, b) =>
          (b.public_metrics.like_count || 0) -
          (a.public_metrics.like_count || 0)
      )
      .slice(0, 5);

    setTopTweets({
      views: topByViews,
      likes: topByLikes,
    });
  };

  // Fetch tweets from API
  const fetchTweets = async (accountId, updateLoadingState = true) => {
    try {
      const data = await twitterService.getTimeline(accountId);

      if (data && data.data) {
        setTweets(data.data);
        setTweetCache(data);
        setLastUpdated(new Date());
        processTweetsForTop(data.data);

        setAccountStats((prev) => ({
          ...prev,
          tweetsPosted: data.data.length || 0,
        }));
      } else {
        setTweets([]);
      }
    } catch (error) {
      console.error("Error loading tweets:", error);

      // Handle rate limiting
      const errorMsg = error.toString().toLowerCase();
      if (
        errorMsg.includes("rate limit") ||
        errorMsg.includes("too many requests")
      ) {
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
          setRefreshCountdown(15 * 60);
          setRefreshDisabled(true);
          toast.error("Twitter rate limit reached. Try again in 15 minutes.");
        }

        // Use cached tweets if available
        const cachedTweets = getTweetCache();
        if (cachedTweets) {
          setTweets(cachedTweets.data || []);
          processTweetsForTop(cachedTweets.data || []);
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
      await loadTweets(account.id, true);

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

  // Handle AI generated text
  const handleAIGenerated = (text) => {
    setTweetText(text);
  };

  // Format tweet date
  const formatTweetDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format last updated time
  const formatLastUpdated = () => {
    if (!lastUpdated) return "";

    const now = new Date();
    const diff = Math.floor((now - lastUpdated) / 1000); // seconds

    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="pb-5 border-b border-gray-200 flex justify-between items-center">
        <h1 className="text-2xl font-medium text-gray-900">
          Twitter Dashboard
        </h1>
        <div className="flex space-x-2"></div>
      </div>

      {!account ? (
        <div className="bg-white shadow-sm rounded-lg p-8">
          <div className="text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mx-auto h-16 w-16 text-blue-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M22.162 5.656a8.384 8.384 0 0 1-2.402.658A4.196 4.196 0 0 0 21.6 4c-.82.488-1.719.83-2.656 1.015a4.182 4.182 0 0 0-7.126 3.814 11.874 11.874 0 0 1-8.62-4.37 4.168 4.168 0 0 0-.566 2.103c0 1.45.738 2.731 1.86 3.481a4.168 4.168 0 0 1-1.894-.523v.052a4.185 4.185 0 0 0 3.355 4.101 4.21 4.21 0 0 1-1.89.072A4.185 4.185 0 0 0 7.97 16.65a8.394 8.394 0 0 1-6.191 1.732 11.83 11.83 0 0 0 6.41 1.88c7.693 0 11.9-6.373 11.9-11.9 0-.18-.005-.362-.013-.54a8.496 8.496 0 0 0 2.087-2.165z" />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              No Twitter account connected
            </h3>
            <p className="mt-2 text-md text-gray-600">
              Connect your Twitter account to access insights and performance
              metrics.
            </p>
            <div className="mt-8">
              <Link
                href="/dashboard/twitter/connect"
                className="inline-flex items-center px-5 py-3 border border-transparent text-md font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Connect Twitter Account
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Account Summary */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="h-12 w-12 bg-blue-500 text-white rounded-full flex items-center justify-center">
                  <span className="text-xl font-bold">
                    {account.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="ml-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    @{account.username}
                  </h2>
                </div>
              </div>

              <div className="flex space-x-8">
                <div className="flex flex-col items-center">
                  <div className="text-xl font-semibold text-gray-900">
                    {accountStats.followers}
                  </div>
                  <div className="text-sm text-gray-600">Followers</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-xl font-semibold text-gray-900">
                    {accountStats.tweetsPosted}
                  </div>
                  <div className="text-sm text-gray-600">Tweets</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-xl font-semibold text-gray-900">
                    {Math.round(
                      (analytics.summaryStats.currentLikes /
                        Math.max(analytics.summaryStats.currentViews, 1)) *
                        1000
                    ) / 10}
                    %
                  </div>
                  <div className="text-sm text-gray-600">Engagement Rate</div>
                </div>
              </div>

              <div>
                <Link
                  href="/dashboard/twitter/connect"
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Manage Account
                </Link>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Audience Growth */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Users className="h-6 w-6 text-blue-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Audience Growth
                      </p>
                      <h3 className="text-xl font-bold text-gray-900">
                        {analytics.summaryStats.followerGrowthPercent}%
                      </h3>
                    </div>
                  </div>
                  <div
                    className={`flex items-center px-2 py-1 rounded-full text-sm ${
                      analytics.summaryStats.followerGrowth >= 0
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {analytics.summaryStats.followerGrowth >= 0 ? (
                      <TrendingUp className="h-4 w-4 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mr-1" />
                    )}
                    <span>
                      {analytics.summaryStats.followerGrowth >= 0 ? "+" : ""}
                      {analytics.summaryStats.followerGrowth}
                    </span>
                  </div>
                </div>
              </div>

              {/* Engagement Rate */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Heart className="h-6 w-6 text-pink-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Engagement Rate
                      </p>
                      <h3 className="text-xl font-bold text-gray-900">
                        {Math.round(
                          (analytics.summaryStats.currentLikes /
                            Math.max(analytics.summaryStats.currentViews, 1)) *
                            1000
                        ) / 10}
                        %
                      </h3>
                    </div>
                  </div>
                  <div
                    className={`flex items-center px-2 py-1 rounded-full text-sm ${
                      analytics.summaryStats.likeGrowth >= 0
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {analytics.summaryStats.likeGrowth >= 0 ? (
                      <TrendingUp className="h-4 w-4 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mr-1" />
                    )}
                    <span>{analytics.summaryStats.likeGrowthPercent}%</span>
                  </div>
                </div>
              </div>

              {/* Impressions */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Eye className="h-6 w-6 text-purple-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Impressions
                      </p>
                      <h3 className="text-xl font-bold text-gray-900">
                        {analytics.summaryStats.currentViews.toLocaleString()}
                      </h3>
                    </div>
                  </div>
                  <div
                    className={`flex items-center px-2 py-1 rounded-full text-sm ${
                      analytics.summaryStats.viewGrowth >= 0
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {analytics.summaryStats.viewGrowth >= 0 ? (
                      <TrendingUp className="h-4 w-4 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mr-1" />
                    )}
                    <span>{analytics.summaryStats.viewGrowthPercent}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Dashboard Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Performance Chart */}
            <div className="lg:col-span-2">
              <div className="bg-white shadow-sm rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900">
                    Performance Trends
                  </h2>
                  <div className="inline-flex rounded-md shadow-sm">
                    <button
                      type="button"
                      onClick={() => handleTimeRangeChange("7d")}
                      className={`px-3 py-1 text-sm font-medium rounded-l-md ${
                        timeRange === "7d"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Week
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTimeRangeChange("30d")}
                      className={`px-3 py-1 text-sm font-medium ${
                        timeRange === "30d"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Month
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTimeRangeChange("90d")}
                      className={`px-3 py-1 text-sm font-medium rounded-r-md ${
                        timeRange === "90d"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Quarter
                    </button>
                  </div>
                </div>

                {/* Engagement Chart */}
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={engagementTrend}
                      margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
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
                        dataKey="likes"
                        stroke="#ec4899"
                        activeDot={{ r: 8 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="retweets"
                        stroke="#10b981"
                      />
                      <Line
                        type="monotone"
                        dataKey="replies"
                        stroke="#f59e0b"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Post new tweet */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Post a Tweet
              </h2>
              <form onSubmit={handleTweetSubmit}>
                <div>
                  <textarea
                    id="tweet-text"
                    name="tweet-text"
                    rows={4}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md"
                    placeholder="What's happening?"
                    value={tweetText}
                    onChange={(e) => setTweetText(e.target.value)}
                    maxLength={280}
                  />
                  <div className="mt-2">
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
          </div>

          {/* Top Performing Content */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Top Performing Content
            </h2>

            <div className="mb-4">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex">
                  <button
                    onClick={() => setActiveTab("top-views")}
                    className={`${
                      activeTab === "top-views"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    } py-2 px-1 border-b-2 font-medium text-sm mr-8`}
                  >
                    Highest Reach
                  </button>
                  <button
                    onClick={() => setActiveTab("top-likes")}
                    className={`${
                      activeTab === "top-likes"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    } py-2 px-1 border-b-2 font-medium text-sm`}
                  >
                    Most Engaging
                  </button>
                </nav>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <>
                {activeTab === "top-views" && (
                  <>
                    {topTweets.views.length > 0 ? (
                      <div className="space-y-4">
                        {topTweets.views.slice(0, 3).map((tweet) => (
                          <div
                            key={tweet.id}
                            className="p-4 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-start">
                              <div className="flex-grow">
                                <p className="text-md text-gray-900">
                                  {tweet.text}
                                </p>
                                <div className="mt-2 flex items-center text-xs text-gray-500">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {formatTweetDate(tweet.created_at)}
                                </div>
                              </div>

                              <div className="ml-4 p-3 bg-purple-100 rounded-lg">
                                <div className="flex flex-col items-center">
                                  <Eye className="h-5 w-5 text-purple-500" />
                                  <div className="mt-1 font-bold text-purple-700">
                                    {tweet.public_metrics.impression_count?.toLocaleString() ||
                                      0}
                                  </div>
                                  <div className="text-xs text-purple-600">
                                    Views
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 flex space-x-6 text-xs text-gray-500">
                              <div className="flex items-center">
                                <Heart className="h-4 w-4 text-pink-500 mr-1" />
                                <span>
                                  {tweet.public_metrics.like_count || 0} Likes
                                </span>
                              </div>
                              <div className="flex items-center">
                                <RefreshCw className="h-4 w-4 text-green-500 mr-1" />
                                <span>
                                  {tweet.public_metrics.retweet_count || 0}{" "}
                                  Retweets
                                </span>
                              </div>
                              <div className="flex items-center">
                                <MessageSquare className="h-4 w-4 text-blue-500 mr-1" />
                                <span>
                                  {tweet.public_metrics.reply_count || 0}{" "}
                                  Replies
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-gray-500">
                        <Eye className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                        <p className="text-lg font-medium">
                          No view data available
                        </p>
                        <p className="mt-1">
                          Content metrics will appear as your tweets gain more
                          impressions
                        </p>
                      </div>
                    )}
                  </>
                )}

                {activeTab === "top-likes" && (
                  <>
                    {topTweets.likes.length > 0 ? (
                      <div className="space-y-4">
                        {topTweets.likes.slice(0, 3).map((tweet) => (
                          <div
                            key={tweet.id}
                            className="p-4 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-start">
                              <div className="flex-grow">
                                <p className="text-md text-gray-900">
                                  {tweet.text}
                                </p>
                                <div className="mt-2 flex items-center text-xs text-gray-500">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {formatTweetDate(tweet.created_at)}
                                </div>
                              </div>

                              <div className="ml-4 p-3 bg-pink-100 rounded-lg">
                                <div className="flex flex-col items-center">
                                  <Heart className="h-5 w-5 text-pink-500" />
                                  <div className="mt-1 font-bold text-pink-700">
                                    {tweet.public_metrics.like_count || 0}
                                  </div>
                                  <div className="text-xs text-pink-600">
                                    Likes
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 flex space-x-6 text-xs text-gray-500">
                              <div className="flex items-center">
                                <Eye className="h-4 w-4 text-purple-500 mr-1" />
                                <span>
                                  {tweet.public_metrics.impression_count?.toLocaleString() ||
                                    0}{" "}
                                  Views
                                </span>
                              </div>
                              <div className="flex items-center">
                                <RefreshCw className="h-4 w-4 text-green-500 mr-1" />
                                <span>
                                  {tweet.public_metrics.retweet_count || 0}{" "}
                                  Retweets
                                </span>
                              </div>
                              <div className="flex items-center">
                                <MessageSquare className="h-4 w-4 text-blue-500 mr-1" />
                                <span>
                                  {tweet.public_metrics.reply_count || 0}{" "}
                                  Replies
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-gray-500">
                        <Heart className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                        <p className="text-lg font-medium">
                          No engagement data available
                        </p>
                        <p className="mt-1">
                          Engagement metrics will appear as your tweets receive
                          interactions
                        </p>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* Tweet Timeline */}
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    Recent Tweets
                  </h2>
                </div>
                <div className="flex items-center space-x-4">
                  {lastUpdated && (
                    <span className="text-xs text-gray-500">
                      Last updated: {formatLastUpdated()}
                    </span>
                  )}
                  <button
                    onClick={() => loadTweets(account.id, true)}
                    disabled={isLoading || refreshDisabled}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {refreshDisabled
                      ? `Refresh in ${refreshCountdown}s`
                      : isLoading
                      ? "Refreshing..."
                      : "Refresh"}
                  </button>
                </div>
              </div>
            </div>

            <div>
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="px-6 py-2">
                  {tweets.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {tweets.slice(0, 5).map((tweet) => (
                        <div key={tweet.id} className="py-4 flex items-start">
                          <div className="flex-1">
                            <p className="text-sm text-gray-900">
                              {tweet.text}
                            </p>
                            <div className="mt-1 text-xs text-gray-500">
                              {formatTweetDate(tweet.created_at)}
                            </div>
                          </div>

                          {tweet.public_metrics && (
                            <div className="ml-4 flex space-x-4 text-xs text-gray-500">
                              <div className="flex items-center">
                                <Eye className="h-3 w-3 text-purple-500 mr-1" />
                                <span>
                                  {tweet.public_metrics.impression_count?.toLocaleString() ||
                                    0}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <Heart className="h-3 w-3 text-pink-500 mr-1" />
                                <span>
                                  {tweet.public_metrics.like_count || 0}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-500">
                      <p className="text-lg font-medium">No tweets found</p>
                      <p className="mt-1">
                        Post your first tweet to get started
                      </p>
                    </div>
                  )}

                  {tweets.length > 5 && (
                    <div className="mt-4 text-center pb-4">
                      <button className="text-sm text-blue-600 hover:text-blue-800">
                        View all tweets
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
