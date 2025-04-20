"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  scheduleService,
  authService,
  submissionService,
} from "@/services/api";
import toast from "react-hot-toast";
import { format, isToday, isYesterday, parseISO } from "date-fns";

export default function DashboardOverview() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

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
    }
  }, [router]);

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

  // Load submissions for subaccounts
  const loadSubmissions = async () => {
    try {
      setIsLoading(true);

      // Load submissions for each status
      const pendingData = await submissionService.getSubmissions("pending");
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
        return "bg-yellow-100 text-yellow-800";
      case "approved":
      case "completed":
        return "bg-green-100 text-green-800";
      case "rejected":
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Render different dashboards based on account type
  if (currentUser?.accountType === "subaccount") {
    // Subaccount Dashboard View
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <Link
            href="/dashboard/submissions"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            New Submission
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Submissions */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 px-4 py-3">
                <h2 className="text-white text-lg font-medium">
                  Pending Submissions
                </h2>
                <p className="text-yellow-100 text-sm">
                  Waiting for admin approval
                </p>
              </div>

              <div className="divide-y divide-gray-200">
                {pendingSubmissions.length === 0 ? (
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
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="mb-1">No pending submissions</p>
                    <Link
                      href="/dashboard/submissions"
                      className="text-blue-500 hover:text-blue-700 font-medium"
                    >
                      Create a new submission
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                    {pendingSubmissions.map((submission) => (
                      <div key={submission.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <i
                              className={`${getPlatformIcon(
                                submission.platform
                              )} text-lg mr-2`}
                            ></i>
                            <span className="font-medium">
                              {submission.platformAccountName}
                            </span>
                          </div>
                          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                            Pending
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm">
                          {truncateText(submission.content)}
                        </p>
                        <div className="mt-2 flex justify-between items-center">
                          <span className="text-xs text-gray-500">
                            {formatDateTime(submission.submissionTime)}
                          </span>
                          <Link
                            href={`/dashboard/submissions/${submission.id}`}
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

            {/* Recent Activity (Approved/Rejected) */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
                <h2 className="text-white text-lg font-medium">
                  Recent Activity
                </h2>
                <p className="text-blue-100 text-sm">
                  Recently approved or rejected submissions
                </p>
              </div>

              <div className="divide-y divide-gray-200">
                {recentApprovedSubmissions.length === 0 &&
                recentRejectedSubmissions.length === 0 ? (
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
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p>No recent activity</p>
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
                          className="p-4 hover:bg-gray-50"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <i
                                className={`${getPlatformIcon(
                                  submission.platform
                                )} text-lg mr-2`}
                              ></i>
                              <span className="font-medium">
                                {submission.platformAccountName}
                              </span>
                            </div>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                                submission.status
                              )}`}
                            >
                              {submission.status === "approved"
                                ? "Approved"
                                : "Rejected"}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm">
                            {truncateText(submission.content)}
                          </p>
                          <div className="mt-2 flex justify-between items-center">
                            <span className="text-xs text-gray-500">
                              {formatDateTime(submission.reviewTime)}
                            </span>
                            <Link
                              href={`/dashboard/submissions/${submission.id}`}
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
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/dashboard/submissions"
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
              <h3 className="font-medium">New Submission</h3>
              <p className="text-sm text-gray-600">
                Create a new content submission
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard/submissions?status=approved"
            className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow flex items-center"
          >
            <div className="rounded-full bg-green-100 p-3 mr-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-green-500"
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
            <div>
              <h3 className="font-medium">Approved Content</h3>
              <p className="text-sm text-gray-600">
                View all approved submissions
              </p>
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
  } else {
    // Admin and Individual Users Dashboard View
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
              <h2 className="text-white text-lg font-medium">
                Today's Schedule
              </h2>
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

        {/* Quick Stats Section for admin - show recent submissions */}
        {currentUser?.accountType === "admin" && (
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-medium">Subaccount Submissions</h2>
              <Link
                href="/dashboard/submissions"
                className="ml-auto text-sm text-blue-600 hover:text-blue-800 flex items-center"
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

            <div className="bg-yellow-50 rounded-lg p-4 mb-4 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-yellow-500 mr-2"
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
              <div>
                <Link
                  href="/dashboard/submissions?status=pending"
                  className="font-medium text-yellow-800 hover:underline"
                >
                  {pendingSubmissions.length} pending submissions
                </Link>
                <p className="text-xs text-yellow-700">
                  Submissions from your subaccounts waiting for review
                </p>
              </div>
            </div>
          </div>
        )}

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
              <p className="text-sm text-gray-600">
                Create a new scheduled post
              </p>
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
}
