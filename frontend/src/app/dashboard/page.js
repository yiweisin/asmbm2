"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  scheduleService,
  authService,
  submissionService,
  twitterService,
} from "@/services/api";
import toast from "react-hot-toast";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import SchedulePostModal from "@/components/SchedulePostModal";
import TwitterAnalytics from "@/components/TwitterAnalytics";

export default function DashboardOverview() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // State for SchedulePostModal
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  // For admin and individual users
  const [todayPosts, setTodayPosts] = useState([]);
  const [yesterdayPosts, setYesterdayPosts] = useState([]);

  // For subaccounts
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [recentApprovedSubmissions, setRecentApprovedSubmissions] = useState(
    []
  );
  const [recentRejectedSubmissions, setRecentRejectedSubmissions] = useState(
    []
  );

  // Twitter Analytics state
  const [twitterAccount, setTwitterAccount] = useState(null);
  const [twitterAnalytics, setTwitterAnalytics] = useState({
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
  const [twitterAccountStats, setTwitterAccountStats] = useState({
    followers: 0,
    following: 0,
    tweetsPosted: 0,
  });
  const [timeRange, setTimeRange] = useState("30d");

  // Function to open and close the modal
  const toggleScheduleModal = (post = null) => {
    setSelectedPost(post);
    setIsScheduleModalOpen(!isScheduleModalOpen);
  };

  useEffect(() => {
    if (!authService.isLoggedIn()) {
      router.push("/login");
      return;
    }

    // Get current user details
    const user = authService.getCurrentUser();
    setCurrentUser(user);

    // Load different data based on account type
    if (user.accountType === "subaccount") {
      loadSubmissions();
    } else {
      // For admins and individual users
      loadScheduledPosts();
      loadTwitterAccount();
      // Add this line to also load submissions for admin users
      if (user.accountType === "admin") {
        loadSubmissions();
      }
    }
  }, [router]);

  // Load Twitter account and analytics
  const loadTwitterAccount = async () => {
    try {
      const accounts = await twitterService.getAccounts();
      if (accounts.length > 0) {
        setTwitterAccount(accounts[0]);
        loadTwitterAnalytics(accounts[0].id);
      }
    } catch (error) {
      console.error("Failed to load Twitter account:", error);
    }
  };

  // Load Twitter analytics
  const loadTwitterAnalytics = async (accountId) => {
    try {
      const analyticsData = await twitterService.getAnalytics(
        accountId,
        timeRange
      );
      setTwitterAnalytics(analyticsData);

      setTwitterAccountStats({
        followers: analyticsData.summaryStats.currentFollowers || 0,
        following: 0,
        tweetsPosted: 0,
      });

      // Optionally load tweets to get tweet count
      try {
        const tweetsData = await twitterService.getTimeline(accountId);
        if (tweetsData && tweetsData.data) {
          setTwitterAccountStats((prev) => ({
            ...prev,
            tweetsPosted: tweetsData.data.length || 0,
          }));
        }
      } catch (tweetError) {
        console.error("Failed to load tweets:", tweetError);
      }
    } catch (error) {
      console.error("Failed to load Twitter analytics:", error);
    }
  };

  // Handle time range change
  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
    if (twitterAccount) {
      loadTwitterAnalytics(twitterAccount.id);
    }
  };

  // Load scheduled posts for today and completed posts for yesterday (for admins and individuals)
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

      // Filter for posts from yesterday until now
      const now = new Date();
      const yesterdayUntilNow = completedData.filter((post) => {
        const postDate = parseISO(post.postedTime);
        return isYesterday(postDate) || postDate <= now;
      });

      setTodayPosts(today);
      setYesterdayPosts(yesterdayUntilNow);
    } catch (error) {
      console.error("Failed to load scheduled posts:", error);
      toast.error("Failed to load scheduled posts");
    } finally {
      setIsLoading(false);
    }
  };

  // Load submissions for subaccounts
  const loadSubmissions = async () => {
    try {
      setIsLoading(true);

      // Load submissions for each status
      const pendingData = await submissionService.getSubmissions("pending");
      console.log("Pending Submissions:", pendingData);
      const approvedData = await submissionService.getSubmissions("approved");
      const rejectedData = await submissionService.getSubmissions("rejected");

      // Sort by submission time (newest first)
      const sortByNewest = (a, b) =>
        new Date(b.submissionTime) - new Date(a.submissionTime);

      setPendingSubmissions(pendingData.sort(sortByNewest));

      // Get only the 5 most recent ones
      setRecentApprovedSubmissions(approvedData.sort(sortByNewest).slice(0, 5));
      setRecentRejectedSubmissions(rejectedData.sort(sortByNewest).slice(0, 5));
    } catch (error) {
      console.error("Failed to load submissions:", error);
      toast.error("Failed to load submissions");
    } finally {
      setIsLoading(false);
    }
  };

  // Get platform icon
  const getPlatformIcon = (platform) => {
    switch (platform) {
      case "twitter":
        return "fab fa-twitter text-blue-400";
      case "discord":
        return "fab fa-discord text-purple-500"; // Changed from indigo to purple
      case "telegram":
        return "fab fa-telegram text-blue-500";
      default:
        return "fas fa-globe text-teal-500"; // Changed from gray to teal
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
      return format(date, "MMM d, yyyy 'at' h:mm a");
    } catch (error) {
      return dateString;
    }
  };

  // Truncate text to a specific length
  const truncateText = (text, maxLength = 60) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + "...";
  };

  // Get status color class
  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-800 border border-amber-300"; // Enhanced with border
      case "approved":
      case "completed":
        return "bg-emerald-100 text-emerald-800 border border-emerald-300"; // Changed to emerald with border
      case "rejected":
      case "failed":
        return "bg-rose-100 text-rose-800 border border-rose-300"; // Changed to rose with border
      default:
        return "bg-slate-100 text-slate-800 border border-slate-300"; // Changed to slate with border
    }
  };

  // Render different dashboards based on account type
  if (currentUser?.accountType === "subaccount") {
    // Subaccount Dashboard View
    return (
      <div className="max-w-6xl mx-auto px-4">
        {/* Page Header with Gradient Background */}
        <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 rounded-xl p-6 mb-8 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Dashboard</h1>
              <p className="text-blue-100">
                Welcome back, {currentUser?.username || "User"}
              </p>
            </div>
            <Link
              href="/dashboard/submissions"
              className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-all duration-200 shadow-md font-medium flex items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              New Submission
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Submissions */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Pending Submissions
                </h2>
                <p className="text-amber-100 text-sm mt-1">
                  Waiting for admin approval
                </p>
              </div>

              <div className="divide-y divide-gray-200">
                {pendingSubmissions.length === 0 ? (
                  <div className="p-8 text-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-16 w-16 mx-auto mb-4 text-amber-300 opacity-80"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="mb-2 text-lg text-gray-600">
                      No pending submissions
                    </p>
                    <Link
                      href="/dashboard/submissions"
                      className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center bg-blue-50 px-4 py-2 rounded-lg"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Create a new submission
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                    {pendingSubmissions.map((submission) => (
                      <div
                        key={submission.id}
                        className="p-4 hover:bg-amber-50 transition-colors duration-150"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <div className="bg-amber-100 p-2 rounded-full mr-3">
                              <i
                                className={`${getPlatformIcon(
                                  submission.platform
                                )} text-lg`}
                              ></i>
                            </div>
                            <span className="font-medium text-gray-800">
                              {submission.platformAccountName}
                            </span>
                          </div>
                          <span className="bg-amber-100 text-amber-800 text-xs px-3 py-1 rounded-full font-medium border border-amber-200">
                            Pending
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm bg-amber-50 p-3 rounded-lg border border-amber-100">
                          {truncateText(submission.content)}
                        </p>
                        <div className="mt-3 flex justify-between items-center">
                          <span className="text-xs text-gray-500 flex items-center">
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
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {formatDateTime(submission.submissionTime)}
                          </span>
                          <Link
                            href={`/dashboard/submissions/${submission.id}`}
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center font-medium bg-blue-50 px-3 py-1 rounded-full"
                          >
                            View Details
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
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity (Approved/Rejected) */}
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
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  Recent Activity
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  Recently approved or rejected submissions
                </p>
              </div>

              <div className="divide-y divide-gray-200">
                {recentApprovedSubmissions.length === 0 &&
                recentRejectedSubmissions.length === 0 ? (
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
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-lg text-gray-600">No recent activity</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                    {/* Show approved submissions first, then rejected */}
                    {[
                      ...recentApprovedSubmissions,
                      ...recentRejectedSubmissions,
                    ]
                      .sort(
                        (a, b) =>
                          new Date(b.reviewTime) - new Date(a.reviewTime)
                      )
                      .map((submission) => (
                        <div
                          key={submission.id}
                          className={`p-4 ${
                            submission.status === "approved"
                              ? "hover:bg-emerald-50"
                              : "hover:bg-rose-50"
                          } transition-colors duration-150`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center">
                              <div
                                className={`${
                                  submission.status === "approved"
                                    ? "bg-emerald-100"
                                    : "bg-rose-100"
                                } p-2 rounded-full mr-3`}
                              >
                                <i
                                  className={`${getPlatformIcon(
                                    submission.platform
                                  )} text-lg`}
                                ></i>
                              </div>
                              <span className="font-medium text-gray-800">
                                {submission.platformAccountName}
                              </span>
                            </div>
                            <span
                              className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusColor(
                                submission.status
                              )}`}
                            >
                              {submission.status === "approved"
                                ? "Approved"
                                : "Rejected"}
                            </span>
                          </div>
                          <p
                            className={`text-gray-700 text-sm p-3 rounded-lg border ${
                              submission.status === "approved"
                                ? "bg-emerald-50 border-emerald-100"
                                : "bg-rose-50 border-rose-100"
                            }`}
                          >
                            {truncateText(submission.content)}
                          </p>
                          <div className="mt-3 flex justify-between items-center">
                            <span className="text-xs text-gray-500 flex items-center">
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
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              {formatDateTime(submission.reviewTime)}
                            </span>
                            <Link
                              href={`/dashboard/submissions/${submission.id}`}
                              className="text-xs text-blue-600 hover:text-blue-800 flex items-center font-medium bg-blue-50 px-3 py-1 rounded-full"
                            >
                              View Details
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
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 mr-2 text-blue-600"
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/dashboard/submissions"
              className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-300 group transform hover:-translate-y-1"
            >
              <div className="rounded-full bg-white/20 w-14 h-14 flex items-center justify-center mb-4 group-hover:bg-white/30 transition-all">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-white"
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
              <h3 className="font-bold text-xl text-white mb-1">
                New Submission
              </h3>
              <p className="text-blue-100">Create a new content submission</p>
            </Link>

            <Link
              href="/dashboard/submissions?status=approved"
              className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-300 group transform hover:-translate-y-1"
            >
              <div className="rounded-full bg-white/20 w-14 h-14 flex items-center justify-center mb-4 group-hover:bg-white/30 transition-all">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="font-bold text-xl text-white mb-1">
                Approved Content
              </h3>
              <p className="text-green-100">View all approved submissions</p>
            </Link>

            <Link
              href="/dashboard/profile"
              className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-300 group transform hover:-translate-y-1"
            >
              <div className="rounded-full bg-white/20 w-14 h-14 flex items-center justify-center mb-4 group-hover:bg-white/30 transition-all">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-white"
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
              <h3 className="font-bold text-xl text-white mb-1">
                Profile Settings
              </h3>
              <p className="text-purple-100">Manage your account</p>
            </Link>
          </div>
        </div>
      </div>
    );
  } else {
    // Admin and Individual Users Dashboard View
    return (
      <div className="max-w-6xl mx-auto px-4">
        {/* Page Header with Gradient Background */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-xl p-6 mb-8 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Dashboard Overview
              </h1>
              <p className="text-indigo-100">
                Welcome back, {currentUser?.username || "User"}
              </p>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/dashboard/schedule"
                className="px-6 py-3 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all duration-200 shadow-md font-medium flex items-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
                View All Scheduled Posts
              </Link>
            </div>
          </div>
        </div>

        {/* Render the SchedulePostModal */}
        {isScheduleModalOpen && (
          <SchedulePostModal
            post={selectedPost}
            onClose={() => toggleScheduleModal()}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Schedule */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
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
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Today's Schedule
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                {format(new Date(), "EEEE, MMMM d, yyyy")}
              </p>
            </div>

            <div className="divide-y divide-gray-200">
              {isLoading ? (
                <div className="p-8 flex justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : todayPosts.length === 0 ? (
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
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-lg text-gray-600">
                    No posts scheduled for today
                  </p>
                  <Link
                    href="/dashboard/schedule"
                    className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center mt-2 bg-blue-50 px-4 py-2 rounded-lg"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Schedule a post
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                  {todayPosts.map((post) => (
                    <div
                      key={post.id}
                      className="p-4 hover:bg-blue-50 cursor-pointer transition-colors duration-150"
                      onClick={() => toggleScheduleModal(post)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <div className="bg-blue-100 p-2 rounded-full mr-3">
                            <i
                              className={`${getPlatformIcon(
                                post.platform
                              )} text-lg`}
                            ></i>
                          </div>
                          <span className="font-medium text-gray-800">
                            {getPlatformName(post.platform)}
                          </span>
                        </div>
                        <span className="bg-indigo-100 text-indigo-800 text-xs px-3 py-1 rounded-full font-medium border border-indigo-200 flex items-center">
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
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {formatDateTime(post.scheduledTime).split(" at ")[1]}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm bg-blue-50 p-3 rounded-lg border border-blue-100">
                        {truncateText(post.content)}
                      </p>
                      <div className="mt-3 text-xs text-gray-500 flex justify-end">
                        <span className="text-blue-600 hover:text-blue-800 flex items-center font-medium">
                          Click to manage
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
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Yesterday's Completed Posts */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300">
            <div
              className={`px-6 py-4 ${
                yesterdayPosts.length === 0
                  ? "bg-gradient-to-r from-rose-500 to-pink-600"
                  : "bg-gradient-to-r from-emerald-500 to-green-600"
              }`}
            >
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                Posts from Yesterday Until Now
              </h2>
              <p className="text-green-100 text-sm mt-1">
                {format(new Date(Date.now() - 86400000), "EEEE, MMMM d, yyyy")}
              </p>
            </div>

            <div className="divide-y divide-gray-200">
              {isLoading ? (
                <div className="p-8 flex justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
                </div>
              ) : yesterdayPosts.length === 0 ? (
                <div className="p-8 text-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-16 w-16 mx-auto mb-4 text-rose-300 opacity-80"
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
                  <p className="text-lg text-gray-600">
                    No posts were completed recently
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                  {yesterdayPosts
                    .sort(
                      (a, b) => new Date(b.postedTime) - new Date(a.postedTime)
                    )
                    .map((post) => (
                      <div
                        key={post.id}
                        className="p-4 hover:bg-green-50 transition-colors duration-150"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <div className="bg-green-100 p-2 rounded-full mr-3">
                              <i
                                className={`${getPlatformIcon(
                                  post.platform
                                )} text-lg`}
                              ></i>
                            </div>
                            <span className="font-medium text-gray-800">
                              {getPlatformName(post.platform)}
                            </span>
                          </div>
                          <span className="bg-emerald-100 text-emerald-800 text-xs px-3 py-1 rounded-full font-medium border border-emerald-200 flex items-center">
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
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            Posted
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm bg-green-50 p-3 rounded-lg border border-green-100">
                          {truncateText(post.content)}
                        </p>
                        <div className="mt-3 text-xs text-gray-500 flex justify-end">
                          <span className="flex items-center">
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
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {formatDateTime(post.postedTime)}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Twitter Analytics Component */}
        {twitterAccount && (
          <div className="mt-8">
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-white text-xl font-bold flex items-center">
                      <i className="fab fa-twitter text-xl mr-2"></i>
                      Twitter Analytics
                    </h2>
                    <p className="text-blue-100 text-sm mt-1">
                      Performance metrics for your Twitter account
                    </p>
                  </div>
                  <Link
                    href="/dashboard/twitter"
                    className="px-4 py-2 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-all duration-200 shadow flex items-center"
                  >
                    Full Dashboard
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
              </div>

              <div className="p-4">
                <TwitterAnalytics
                  accountData={{
                    username: twitterAccount.username,
                    tweetsPosted: twitterAccountStats.tweetsPosted,
                  }}
                  analyticsData={twitterAnalytics}
                  timeRange={timeRange}
                  onTimeRangeChange={handleTimeRangeChange}
                />
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats Section for admin - show recent submissions */}
        {currentUser?.accountType === "admin" && (
          <div className="mt-8 bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-lg w-12 h-12 flex items-center justify-center mr-4 shadow-md">
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">
                Subaccount Submissions
              </h2>
              <Link
                href="/dashboard/submissions"
                className="ml-auto text-sm text-purple-600 hover:text-purple-800 flex items-center bg-purple-50 px-4 py-2 rounded-lg transition-colors duration-150"
              >
                <span>Review All</span>
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

            <div className="bg-amber-50 rounded-xl p-6 mb-4 flex items-center border border-amber-200 shadow-sm">
              <div className="bg-amber-100 rounded-full p-3 mr-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-amber-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <Link
                  href="/dashboard/submissions?status=pending"
                  className="font-bold text-lg text-amber-800 hover:underline flex items-center"
                >
                  {pendingSubmissions.length} pending submissions
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 ml-1"
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
                <p className="text-sm text-amber-700">
                  Submissions from your subaccounts waiting for review
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 mr-2 text-indigo-600"
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/dashboard/schedule"
              className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-300 group transform hover:-translate-y-1"
            >
              <div className="rounded-full bg-white/20 w-14 h-14 flex items-center justify-center mb-4 group-hover:bg-white/30 transition-all">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-white"
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
              <h3 className="font-bold text-xl text-white mb-1">
                Schedule Post
              </h3>
              <p className="text-blue-100">Create a new scheduled post</p>
            </Link>

            <Link
              href="/dashboard/twitter"
              className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-300 group transform hover:-translate-y-1"
            >
              <div className="rounded-full bg-white/20 w-14 h-14 flex items-center justify-center mb-4 group-hover:bg-white/30 transition-all">
                <i className="fab fa-twitter text-2xl text-white"></i>
              </div>
              <h3 className="font-bold text-xl text-white mb-1">
                Twitter Dashboard
              </h3>
              <p className="text-blue-100">Manage Twitter activity</p>
            </Link>

            <Link
              href="/dashboard/profile"
              className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-300 group transform hover:-translate-y-1"
            >
              <div className="rounded-full bg-white/20 w-14 h-14 flex items-center justify-center mb-4 group-hover:bg-white/30 transition-all">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-white"
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
              <h3 className="font-bold text-xl text-white mb-1">
                Profile Settings
              </h3>
              <p className="text-purple-100">Manage your account</p>
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
