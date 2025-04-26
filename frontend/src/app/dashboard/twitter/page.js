"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  Twitter,
  ChevronRight,
  FileText,
  BarChart2,
} from "lucide-react";
import AITextGenerator from "@/components/AiTextGenerator";
import TwitterAnalytics from "@/components/TwitterAnalytics";

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

export default function TwitterDashboard() {
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
  const router = useRouter();

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
          router.push("twitter/connect");
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
    } catch (error) {
      console.error("Error loading account analytics:", error);
    }
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header with Gradient Background */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-xl p-6 mb-8 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center">
                <Twitter className="h-8 w-8 mr-3" />
                Twitter Dashboard
              </h1>
              {account && (
                <p className="text-blue-100 mt-1">
                  Connected account: @{account.username}
                </p>
              )}
            </div>
            <div className="flex space-x-4">
              {account && (
                <button
                  onClick={() => loadTweets(account.id, true)}
                  disabled={isLoading || refreshDisabled}
                  className="px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all duration-200 shadow-md font-medium flex items-center disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {refreshDisabled
                    ? `Refresh in ${refreshCountdown}s`
                    : isLoading
                    ? "Refreshing..."
                    : "Refresh Data"}
                </button>
              )}
            </div>
          </div>
        </div>

        {
          <div className="space-y-6">
            {/* Analytics Component */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-white text-xl font-bold flex items-center">
                      <BarChart2 className="h-6 w-6 mr-2" />
                      Twitter Analytics
                    </h2>
                    <p className="text-blue-100 text-sm mt-1">
                      Performance metrics for your Twitter account
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <TwitterAnalytics
                  accountData={{
                    username: account?.username,
                    tweetsPosted: accountStats.tweetsPosted,
                  }}
                  analyticsData={analytics}
                  timeRange={timeRange}
                  onTimeRangeChange={handleTimeRangeChange}
                />
              </div>
            </div>

            {/* Main Dashboard Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Post new tweet */}
              <div className="bg-white shadow-md rounded-xl p-6 lg:col-span-3 border border-gray-100 hover:shadow-lg transition-all duration-300">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <FileText className="h-6 w-6 mr-2 text-blue-600" />
                  Compose a Tweet
                </h2>
                <form onSubmit={handleTweetSubmit}>
                  <div>
                    <textarea
                      id="tweet-text"
                      name="tweet-text"
                      rows={4}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full text-sm border border-gray-300 rounded-xl p-4 transition-all duration-200"
                      placeholder="What's happening?"
                      value={tweetText}
                      onChange={(e) => setTweetText(e.target.value)}
                      maxLength={280}
                    />
                    <div className="mt-3">
                      <AITextGenerator
                        onTextGenerated={handleAIGenerated}
                        platform="twitter"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-between items-center">
                    <div
                      className={`text-sm ${
                        tweetText.length > 240
                          ? "text-orange-500 font-medium"
                          : "text-gray-500"
                      }`}
                    >
                      {tweetText.length}/280 characters
                    </div>
                    <button
                      type="submit"
                      disabled={isPosting || !tweetText.trim()}
                      className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200 transform hover:-translate-y-0.5"
                    >
                      {isPosting ? (
                        <div className="flex items-center">
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                          Posting...
                        </div>
                      ) : (
                        <>
                          <Twitter className="h-4 w-4 mr-2" />
                          Post Tweet
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Top Performing Content */}
            <div className="bg-white shadow-md rounded-xl p-6 border border-gray-100 hover:shadow-lg transition-all duration-300">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Award className="h-6 w-6 mr-2 text-indigo-600" />
                Top Performing Content
              </h2>

              <div className="mb-6">
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex">
                    <button
                      onClick={() => setActiveTab("top-views")}
                      className={`${
                        activeTab === "top-views"
                          ? "border-indigo-500 text-indigo-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      } py-3 px-4 border-b-2 font-medium text-sm mr-8 transition-colors duration-200`}
                    >
                      <div className="flex items-center">
                        <Eye className="h-4 w-4 mr-2" />
                        Highest Reach
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab("top-likes")}
                      className={`${
                        activeTab === "top-likes"
                          ? "border-indigo-500 text-indigo-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      } py-3 px-4 border-b-2 font-medium text-sm transition-colors duration-200`}
                    >
                      <div className="flex items-center">
                        <Heart className="h-4 w-4 mr-2" />
                        Most Engaging
                      </div>
                    </button>
                  </nav>
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
              ) : (
                <>
                  {activeTab === "top-views" && (
                    <>
                      {topTweets.views.length > 0 ? (
                        <div className="space-y-5">
                          {topTweets.views.slice(0, 3).map((tweet) => (
                            <div
                              key={tweet.id}
                              className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 hover:shadow-md transition-all duration-200"
                            >
                              <div className="flex items-start">
                                <div className="flex-grow">
                                  <p className="text-md text-gray-800">
                                    {tweet.text}
                                  </p>
                                  <div className="mt-3 flex items-center text-xs text-gray-500">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {formatTweetDate(tweet.created_at)}
                                  </div>
                                </div>

                                <div className="ml-4 p-3 bg-purple-100 rounded-lg border border-purple-200 shadow-sm">
                                  <div className="flex flex-col items-center">
                                    <Eye className="h-5 w-5 text-purple-600" />
                                    <div className="mt-1 font-bold text-purple-800">
                                      {tweet.public_metrics.impression_count?.toLocaleString() ||
                                        0}
                                    </div>
                                    <div className="text-xs text-purple-700">
                                      Views
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 flex space-x-6 text-xs text-gray-600 p-2 bg-white/60 rounded-lg">
                                <div className="flex items-center">
                                  <Heart className="h-4 w-4 text-pink-500 mr-1" />
                                  <span className="font-medium">
                                    {tweet.public_metrics.like_count || 0} Likes
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <RefreshCw className="h-4 w-4 text-emerald-500 mr-1" />
                                  <span className="font-medium">
                                    {tweet.public_metrics.retweet_count || 0}{" "}
                                    Retweets
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <MessageSquare className="h-4 w-4 text-blue-500 mr-1" />
                                  <span className="font-medium">
                                    {tweet.public_metrics.reply_count || 0}{" "}
                                    Replies
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-10 text-center bg-blue-50 rounded-xl border border-blue-100">
                          <div className="rounded-full bg-blue-100 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                            <Eye className="h-8 w-8 text-blue-600" />
                          </div>
                          <p className="text-xl font-bold text-gray-800">
                            No view data available
                          </p>
                          <p className="mt-2 text-gray-600">
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
                        <div className="space-y-5">
                          {topTweets.likes.slice(0, 3).map((tweet) => (
                            <div
                              key={tweet.id}
                              className="p-5 bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl border border-pink-100 hover:shadow-md transition-all duration-200"
                            >
                              <div className="flex items-start">
                                <div className="flex-grow">
                                  <p className="text-md text-gray-800">
                                    {tweet.text}
                                  </p>
                                  <div className="mt-3 flex items-center text-xs text-gray-500">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {formatTweetDate(tweet.created_at)}
                                  </div>
                                </div>

                                <div className="ml-4 p-3 bg-pink-100 rounded-lg border border-pink-200 shadow-sm">
                                  <div className="flex flex-col items-center">
                                    <Heart className="h-5 w-5 text-pink-600" />
                                    <div className="mt-1 font-bold text-pink-800">
                                      {tweet.public_metrics.like_count || 0}
                                    </div>
                                    <div className="text-xs text-pink-700">
                                      Likes
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 flex space-x-6 text-xs text-gray-600 p-2 bg-white/60 rounded-lg">
                                <div className="flex items-center">
                                  <Eye className="h-4 w-4 text-purple-500 mr-1" />
                                  <span className="font-medium">
                                    {tweet.public_metrics.impression_count?.toLocaleString() ||
                                      0}{" "}
                                    Views
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <RefreshCw className="h-4 w-4 text-emerald-500 mr-1" />
                                  <span className="font-medium">
                                    {tweet.public_metrics.retweet_count || 0}{" "}
                                    Retweets
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <MessageSquare className="h-4 w-4 text-blue-500 mr-1" />
                                  <span className="font-medium">
                                    {tweet.public_metrics.reply_count || 0}{" "}
                                    Replies
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-10 text-center bg-pink-50 rounded-xl border border-pink-100">
                          <div className="rounded-full bg-pink-100 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                            <Heart className="h-8 w-8 text-pink-600" />
                          </div>
                          <p className="text-xl font-bold text-gray-800">
                            No engagement data available
                          </p>
                          <p className="mt-2 text-gray-600">
                            Engagement metrics will appear as your tweets
                            receive interactions
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Tweet Timeline */}
            <div className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-white text-xl font-bold flex items-center">
                      <Twitter className="h-5 w-5 mr-2" />
                      Recent Tweets
                    </h2>
                    <p className="text-purple-100 text-sm mt-1">
                      Your latest Twitter updates
                    </p>
                  </div>
                  <div className="flex items-center">
                    {lastUpdated && (
                      <span className="text-xs text-indigo-100 mr-3 bg-indigo-600/40 py-1 px-2 rounded-full">
                        Updated: {formatLastUpdated()}
                      </span>
                    )}
                    <button
                      onClick={() => loadTweets(account.id, true)}
                      disabled={isLoading || refreshDisabled}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-white/20 hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all duration-200"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {refreshDisabled
                        ? `${refreshCountdown}s`
                        : isLoading
                        ? "Refreshing..."
                        : "Refresh"}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                  </div>
                ) : (
                  <div className="p-6">
                    {tweets.length > 0 ? (
                      <div className="space-y-4">
                        {tweets.slice(0, 5).map((tweet) => (
                          <div
                            key={tweet.id}
                            className="py-4 px-5 flex items-start bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-blue-100 hover:shadow-md transition-all duration-200"
                          >
                            <div className="flex-1">
                              <p className="text-gray-800">{tweet.text}</p>
                              <div className="mt-3 flex items-center text-xs text-gray-500">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formatTweetDate(tweet.created_at)}
                              </div>
                            </div>

                            {tweet.public_metrics && (
                              <div className="ml-4 flex flex-col space-y-2">
                                <div className="flex items-center bg-purple-100 p-1.5 px-3 rounded-full border border-purple-200">
                                  <Eye className="h-3 w-3 text-purple-600 mr-2" />
                                  <span className="text-xs font-medium text-purple-800">
                                    {tweet.public_metrics.impression_count?.toLocaleString() ||
                                      0}
                                  </span>
                                </div>
                                <div className="flex items-center bg-pink-100 p-1.5 px-3 rounded-full border border-pink-200">
                                  <Heart className="h-3 w-3 text-pink-600 mr-2" />
                                  <span className="text-xs font-medium text-pink-800">
                                    {tweet.public_metrics.like_count || 0}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-10 text-center">
                        <div className="rounded-full bg-indigo-100 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                          <Twitter className="h-8 w-8 text-indigo-600" />
                        </div>
                        <p className="text-xl font-bold text-gray-800">
                          No tweets found
                        </p>
                        <p className="mt-2 text-gray-600">
                          Post your first tweet to get started
                        </p>
                        <button
                          onClick={() =>
                            document.getElementById("tweet-text").focus()
                          }
                          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Compose a Tweet
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-md p-6 text-white hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center mb-4">
                  <div className="rounded-full bg-white/20 w-12 h-12 flex items-center justify-center mr-4">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-purple-100 text-sm">Followers</p>
                    <h3 className="text-2xl font-bold">
                      {accountStats.followers.toLocaleString()}
                    </h3>
                  </div>
                </div>
                <div className="bg-white/10 rounded-lg p-2 text-center">
                  <p className="text-sm text-purple-100">
                    {analytics.summaryStats.followerGrowth > 0 ? (
                      <span className="flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 mr-1 text-green-300" />+
                        {analytics.summaryStats.followerGrowth} new followers
                      </span>
                    ) : analytics.summaryStats.followerGrowth < 0 ? (
                      <span className="flex items-center justify-center">
                        <TrendingDown className="h-4 w-4 mr-1 text-red-300" />
                        {analytics.summaryStats.followerGrowth} followers
                      </span>
                    ) : (
                      <span>No change in followers</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl shadow-md p-6 text-white hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center mb-4">
                  <div className="rounded-full bg-white/20 w-12 h-12 flex items-center justify-center mr-4">
                    <Heart className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-pink-100 text-sm">Total Likes</p>
                    <h3 className="text-2xl font-bold">
                      {analytics.summaryStats.currentLikes.toLocaleString()}
                    </h3>
                  </div>
                </div>
                <div className="bg-white/10 rounded-lg p-2 text-center">
                  <p className="text-sm text-pink-100">
                    {analytics.summaryStats.likeGrowth > 0 ? (
                      <span className="flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 mr-1 text-green-300" />+
                        {analytics.summaryStats.likeGrowth} new likes
                      </span>
                    ) : analytics.summaryStats.likeGrowth < 0 ? (
                      <span className="flex items-center justify-center">
                        <TrendingDown className="h-4 w-4 mr-1 text-red-300" />
                        {analytics.summaryStats.likeGrowth} likes
                      </span>
                    ) : (
                      <span>No change in likes</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-md p-6 text-white hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center mb-4">
                  <div className="rounded-full bg-white/20 w-12 h-12 flex items-center justify-center mr-4">
                    <Eye className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-blue-100 text-sm">Total Views</p>
                    <h3 className="text-2xl font-bold">
                      {analytics.summaryStats.currentViews.toLocaleString()}
                    </h3>
                  </div>
                </div>
                <div className="bg-white/10 rounded-lg p-2 text-center">
                  <p className="text-sm text-blue-100">
                    {analytics.summaryStats.viewGrowth > 0 ? (
                      <span className="flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 mr-1 text-green-300" />+
                        {analytics.summaryStats.viewGrowth.toLocaleString()} new
                        views
                      </span>
                    ) : analytics.summaryStats.viewGrowth < 0 ? (
                      <span className="flex items-center justify-center">
                        <TrendingDown className="h-4 w-4 mr-1 text-red-300" />
                        {analytics.summaryStats.viewGrowth.toLocaleString()}{" "}
                        views
                      </span>
                    ) : (
                      <span>No change in views</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  );
}
