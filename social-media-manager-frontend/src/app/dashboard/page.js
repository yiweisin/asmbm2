"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { scheduleService, authService, twitterService } from "@/services/api";
import toast from "react-hot-toast";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function DashboardOverview() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [todayPosts, setTodayPosts] = useState([]);
  const [yesterdayPosts, setYesterdayPosts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [twitterAccount, setTwitterAccount] = useState(null);
  const [twitterAnalytics, setTwitterAnalytics] = useState(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);

  useEffect(() => {
    if (!authService.isLoggedIn()) {
      router.push("/login");
      return;
    }

    // Get current user details
    const user = authService.getCurrentUser();
    setCurrentUser(user);

    loadScheduledPosts();
    loadTwitterAccount();
  }, [router]);

  // Load scheduled posts for today and completed posts for yesterday
  const loadScheduledPosts = async () => {
    try {
      setIsLoading(true);

      // Load all scheduled posts (pending today + all completed)
      const scheduledData = await scheduleService.getScheduledPosts(
        "scheduled"
      );
      const completedData = await scheduleService.getScheduledPosts(
        "completed"
      );

      // Filter for today's scheduled posts
      const today = scheduledData.filter((post) => {
        const postDate = parseISO(post.scheduledTime);
        return isToday(postDate);
      });

      // Filter for yesterday's completed posts
      const yesterday = completedData.filter((post) => {
        const postDate = parseISO(post.postedTime);
        return isYesterday(postDate);
      });

      setTodayPosts(today);
      setYesterdayPosts(yesterday);
    } catch (error) {
      console.error("Failed to load scheduled posts:", error);
      toast.error("Failed to load scheduled posts");
    } finally {
      setIsLoading(false);
    }
  };

  // Load Twitter account and analytics
  const loadTwitterAccount = async () => {
    try {
      setIsAnalyticsLoading(true);
      const accounts = await twitterService.getAccounts();

      if (accounts && accounts.length > 0) {
        setTwitterAccount(accounts[0]);
        // Load analytics data for 7 days
        const analytics = await twitterService.getAnalytics(
          accounts[0].id,
          "7d"
        );
        setTwitterAnalytics(analytics);
      }
    } catch (error) {
      console.error("Failed to load Twitter account:", error);
      // Don't show error toast as this is supplementary data
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  // Get platform icon
  const getPlatformIcon = (platform) => {
    switch (platform) {
      case "twitter":
        return "fab fa-twitter text-blue-400";
      case "discord":
        return "fab fa-discord text-indigo-500";
      case "telegram":
        return "fab fa-telegram text-blue-500";
      default:
        return "fas fa-globe text-gray-500";
    }
  };

  // Get platform name
  const getPlatformName = (platform) => {
    switch (platform) {
      case "twitter":
        return "Twitter";
      case "discord":
        return "Discord";
      case "telegram":
        return "Telegram";
      default:
        return "Unknown";
    }
  };

  // Format date for display
  const formatDateTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, "h:mm a");
    } catch (error) {
      return "Time not available";
    }
  };

  // Truncate text to a specific length
  const truncateText = (text, maxLength = 60) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + "...";
  };

  // Format numbers with K/M suffix
  const formatNumber = (num) => {
    if (!num && num !== 0) return "0";
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <Link
          href="/dashboard/schedule"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          View All Scheduled Posts
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
            <h2 className="text-white text-lg font-medium">Today's Schedule</h2>
            <p className="text-blue-100 text-sm">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {isLoading ? (
              <div className="p-6 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : todayPosts.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 mx-auto mb-2 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="mb-1">No posts scheduled for today</p>
                <Link
                  href="/dashboard/schedule"
                  className="text-blue-500 hover:text-blue-700 font-medium"
                >
                  Schedule a post
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {todayPosts
                  .sort(
                    (a, b) =>
                      new Date(a.scheduledTime) - new Date(b.scheduledTime)
                  )
                  .map((post) => (
                    <div key={post.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <i
                            className={`${getPlatformIcon(
                              post.platform
                            )} text-lg mr-2`}
                          ></i>
                          <span className="font-medium">
                            {getPlatformName(post.platform)}
                          </span>
                        </div>
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                          {formatDateTime(post.scheduledTime)}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm">
                        {truncateText(post.content)}
                      </p>
                      <div className="mt-2 flex justify-end">
                        <Link
                          href={`/dashboard/schedule?edit=${post.id}`}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Yesterday's Completed Posts */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-4 py-3">
            <h2 className="text-white text-lg font-medium">
              Yesterday's Completed Posts
            </h2>
            <p className="text-green-100 text-sm">
              {format(new Date(Date.now() - 86400000), "EEEE, MMMM d, yyyy")}
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {isLoading ? (
              <div className="p-6 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
              </div>
            ) : yesterdayPosts.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 mx-auto mb-2 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <p>No posts were completed yesterday</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {yesterdayPosts
                  .sort(
                    (a, b) => new Date(b.postedTime) - new Date(a.postedTime)
                  )
                  .map((post) => (
                    <div key={post.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <i
                            className={`${getPlatformIcon(
                              post.platform
                            )} text-lg mr-2`}
                          ></i>
                          <span className="font-medium">
                            {getPlatformName(post.platform)}
                          </span>
                        </div>
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                          {formatDateTime(post.postedTime)}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm">
                        {truncateText(post.content)}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Section */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-md w-10 h-10 flex items-center justify-center mr-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-white"
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
          </div>
          <h2 className="text-lg font-medium">Social Media Overview</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="rounded-full bg-blue-100 p-3 mr-4 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="#1DA1F2"
                >
                  <path d="M22.162 5.656a8.384 8.384 0 0 1-2.402.658A4.196 4.196 0 0 0 21.6 4c-.82.488-1.719.83-2.656 1.015a4.182 4.182 0 0 0-7.126 3.814 11.874 11.874 0 0 1-8.62-4.37 4.168 4.168 0 0 0-.566 2.103c0 1.45.738 2.731 1.86 3.481a4.168 4.168 0 0 1-1.894-.523v.052a4.185 4.185 0 0 0 3.355 4.101 4.21 4.21 0 0 1-1.89.072A4.185 4.185 0 0 0 7.97 16.65a8.394 8.394 0 0 1-6.191 1.732 11.83 11.83 0 0 0 6.41 1.88c7.693 0 11.9-6.373 11.9-11.9 0-.18-.005-.362-.013-.54a8.496 8.496 0 0 0 2.087-2.165z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Twitter</h3>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3 w-3 mr-1 text-blue-500"
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
                    {todayPosts.filter((p) => p.platform === "twitter").length}{" "}
                    scheduled today
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-indigo-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="rounded-full bg-indigo-100 p-3 mr-4 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 127.14 96.36"
                  fill="#5865F2"
                >
                  <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Discord</h3>
                <div className="flex items-center text-sm text-gray-600">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3 mr-1 text-indigo-500"
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
                  {todayPosts.filter((p) => p.platform === "discord").length}{" "}
                  scheduled today
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="rounded-full bg-blue-100 p-3 mr-4 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 240 240"
                  fill="#26A5E4"
                >
                  <defs>
                    <linearGradient
                      id="a"
                      x1=".667"
                      x2=".417"
                      y1=".167"
                      y2=".75"
                    >
                      <stop offset="0" stopColor="#37aee2" />
                      <stop offset="1" stopColor="#1e96c8" />
                    </linearGradient>
                    <linearGradient
                      id="b"
                      x1=".66"
                      x2=".851"
                      y1=".437"
                      y2=".802"
                    >
                      <stop offset="0" stopColor="#eff7fc" />
                      <stop offset="1" stopColor="#fff" />
                    </linearGradient>
                  </defs>
                  <circle cx="120" cy="120" r="120" fill="url(#a)" />
                  <path
                    fill="#c8daea"
                    d="M98 175c-3.888 0-3.227-1.468-4.568-5.17L82 132.207 170 80"
                  />
                  <path
                    fill="#a9c9dd"
                    d="M98 175c3 0 4.325-1.372 6-3l16-15.558-19.958-12.035"
                  />
                  <path
                    fill="url(#b)"
                    d="M100.04 144.41l48.36 35.729c5.519 3.045 9.501 1.468 10.876-5.123l19.685-92.763c2.015-8.08-3.08-11.746-8.36-9.349l-115.59 44.571c-7.89 3.165-7.843 7.567-1.438 9.528l29.663 9.259 68.673-43.325c3.242-1.966 6.218-.91 3.776 1.258"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Telegram</h3>
                <div className="flex items-center text-sm text-gray-600">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3 mr-1 text-blue-500"
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
                  {todayPosts.filter((p) => p.platform === "telegram").length}{" "}
                  scheduled today
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Twitter Analytics Overview - Only shown when Twitter account is connected */}
        {twitterAccount && twitterAnalytics && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="#1DA1F2"
                  className="mr-2"
                >
                  <path d="M22.162 5.656a8.384 8.384 0 0 1-2.402.658A4.196 4.196 0 0 0 21.6 4c-.82.488-1.719.83-2.656 1.015a4.182 4.182 0 0 0-7.126 3.814 11.874 11.874 0 0 1-8.62-4.37 4.168 4.168 0 0 0-.566 2.103c0 1.45.738 2.731 1.86 3.481a4.168 4.168 0 0 1-1.894-.523v.052a4.185 4.185 0 0 0 3.355 4.101 4.21 4.21 0 0 1-1.89.072A4.185 4.185 0 0 0 7.97 16.65a8.394 8.394 0 0 1-6.191 1.732 11.83 11.83 0 0 0 6.41 1.88c7.693 0 11.9-6.373 11.9-11.9 0-.18-.005-.362-.013-.54a8.496 8.496 0 0 0 2.087-2.165z" />
                </svg>
                <h3 className="text-md font-medium">Twitter Analytics</h3>
              </div>
              <Link
                href="/dashboard/twitter/analytics"
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
              >
                <span>View Detailed Analytics</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 ml-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Followers Card */}
              <div className="bg-blue-50 rounded-lg p-3">
                <h4 className="text-xs font-medium text-blue-800">Followers</h4>
                <p className="mt-1 text-lg font-bold text-blue-900">
                  {formatNumber(twitterAnalytics.summaryStats.currentFollowers)}
                </p>
                <div
                  className={`mt-1 flex items-center text-xs ${
                    twitterAnalytics.summaryStats.followerGrowth >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  <span className="font-medium">
                    {twitterAnalytics.summaryStats.followerGrowth >= 0
                      ? "+"
                      : ""}
                    {twitterAnalytics.summaryStats.followerGrowth} (
                    {twitterAnalytics.summaryStats.followerGrowthPercent}%)
                  </span>
                  {twitterAnalytics.summaryStats.followerGrowth >= 0 ? (
                    <TrendingUp className="ml-1 h-3 w-3" />
                  ) : (
                    <TrendingDown className="ml-1 h-3 w-3" />
                  )}
                </div>
              </div>

              {/* Likes Card */}
              <div className="bg-pink-50 rounded-lg p-3">
                <h4 className="text-xs font-medium text-pink-800">Likes</h4>
                <p className="mt-1 text-lg font-bold text-pink-900">
                  {formatNumber(twitterAnalytics.summaryStats.currentLikes)}
                </p>
                <div
                  className={`mt-1 flex items-center text-xs ${
                    twitterAnalytics.summaryStats.likeGrowth >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  <span className="font-medium">
                    {twitterAnalytics.summaryStats.likeGrowth >= 0 ? "+" : ""}
                    {twitterAnalytics.summaryStats.likeGrowth} (
                    {twitterAnalytics.summaryStats.likeGrowthPercent}%)
                  </span>
                  {twitterAnalytics.summaryStats.likeGrowth >= 0 ? (
                    <TrendingUp className="ml-1 h-3 w-3" />
                  ) : (
                    <TrendingDown className="ml-1 h-3 w-3" />
                  )}
                </div>
              </div>

              {/* Views Card */}
              <div className="bg-purple-50 rounded-lg p-3">
                <h4 className="text-xs font-medium text-purple-800">Views</h4>
                <p className="mt-1 text-lg font-bold text-purple-900">
                  {formatNumber(twitterAnalytics.summaryStats.currentViews)}
                </p>
                <div
                  className={`mt-1 flex items-center text-xs ${
                    twitterAnalytics.summaryStats.viewGrowth >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  <span className="font-medium">
                    {twitterAnalytics.summaryStats.viewGrowth >= 0 ? "+" : ""}
                    {formatNumber(twitterAnalytics.summaryStats.viewGrowth)} (
                    {twitterAnalytics.summaryStats.viewGrowthPercent}%)
                  </span>
                  {twitterAnalytics.summaryStats.viewGrowth >= 0 ? (
                    <TrendingUp className="ml-1 h-3 w-3" />
                  ) : (
                    <TrendingDown className="ml-1 h-3 w-3" />
                  )}
                </div>
              </div>
            </div>

            {/* Mini Follower Growth Chart */}
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={twitterAnalytics.followerData}
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
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
                  <Tooltip
                    formatter={(value) => [`${value} followers`, "Followers"]}
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString()
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="followers"
                    stroke="#3b82f6"
                    activeDot={{ r: 5 }}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* No Twitter account connected message */}
        {isAnalyticsLoading && (
          <div className="mt-6 p-4 flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}

        {!isAnalyticsLoading && !twitterAccount && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="#1DA1F2"
                >
                  <path d="M22.162 5.656a8.384 8.384 0 0 1-2.402.658A4.196 4.196 0 0 0 21.6 4c-.82.488-1.719.83-2.656 1.015a4.182 4.182 0 0 0-7.126 3.814 11.874 11.874 0 0 1-8.62-4.37 4.168 4.168 0 0 0-.566 2.103c0 1.45.738 2.731 1.86 3.481a4.168 4.168 0 0 1-1.894-.523v.052a4.185 4.185 0 0 0 3.355 4.101 4.21 4.21 0 0 1-1.89.072A4.185 4.185 0 0 0 7.97 16.65a8.394 8.394 0 0 1-6.191 1.732 11.83 11.83 0 0 0 6.41 1.88c7.693 0 11.9-6.373 11.9-11.9 0-.18-.005-.362-.013-.54a8.496 8.496 0 0 0 2.087-2.165z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-700">
                Connect Twitter to view analytics
              </h3>
              <p className="mt-1 text-xs text-gray-500 mb-3">
                Get insights about your followers, engagement, and more
              </p>
              <Link
                href="/dashboard/twitter/connect"
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Connect Twitter Account
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/dashboard/schedule"
          className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow flex items-center"
        >
          <div className="rounded-full bg-blue-100 p-3 mr-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-medium">Schedule Post</h3>
            <p className="text-sm text-gray-600">Create a new scheduled post</p>
          </div>
        </Link>

        <Link
          href="/dashboard/twitter"
          className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow flex items-center"
        >
          <div className="rounded-full bg-blue-100 p-3 mr-4">
            <i className="fab fa-twitter text-blue-500 text-xl"></i>
          </div>
          <div>
            <h3 className="font-medium">Twitter Dashboard</h3>
            <p className="text-sm text-gray-600">Manage Twitter activity</p>
          </div>
        </Link>

        <Link
          href="/dashboard/profile"
          className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow flex items-center"
        >
          <div className="rounded-full bg-blue-100 p-3 mr-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-medium">Profile Settings</h3>
            <p className="text-sm text-gray-600">Manage your account</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
