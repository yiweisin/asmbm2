"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { submissionService, authService } from "@/services/api";
import toast from "react-hot-toast";
import AITextGenerator from "@/components/AiTextGenerator";

export default function SubmissionsPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [currentUser, setCurrentUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // For subaccount submission form - maintain targetId in the state for compatibility
  const [newSubmission, setNewSubmission] = useState({
    platform: "twitter",
    targetId: "", // Keep this for compatibility
    content: "",
    scheduledTime: getTomorrowDateTimeUTC8(),
  });

  // Check if user is logged in and determine account type
  useEffect(() => {
    if (!authService.isLoggedIn()) {
      router.push("/login");
      return;
    }

    const user = authService.getCurrentUser();
    setCurrentUser(user);

    if (user.accountType !== "subaccount" && user.accountType !== "admin") {
      // Individual users shouldn't access this page
      router.push("/dashboard");
      return;
    }

    loadSubmissions();
  }, [router, activeTab]);

  // Load submissions based on active tab
  const loadSubmissions = async () => {
    try {
      setIsLoading(true);
      const data = await submissionService.getSubmissions(activeTab);
      setSubmissions(data);
    } catch (error) {
      console.error("Failed to load submissions:", error);
      toast.error("Failed to load submissions");
    } finally {
      setIsLoading(false);
    }
  };

  // Get tomorrow's date at current time
  function getTomorrowDateTimeUTC8() {
    const now = new Date();
    const utc8OffsetMs = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

    // Convert current time to UTC+8
    const utc8Now = new Date(now.getTime() + utc8OffsetMs);

    // Add one day
    utc8Now.setDate(utc8Now.getDate() + 1);

    return formatDateTimeForInput(utc8Now);
  }

  // Format date for datetime-local input
  function formatDateTimeForInput(date) {
    return date.toISOString().slice(0, 16); // Format: "YYYY-MM-DDTHH:MM"
  }

  // Format date for display - correctly handling UTC+8 times from backend
  const formatDate = (dateString) => {
    try {
      if (!dateString) return "N/A";

      // Parse the date string into a Date object
      const date = new Date(dateString);

      // Format the date using the browser's locale settings
      // The backend is already providing dates in UTC+8, so we don't need to adjust
      return (
        date.toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        }) + " (UTC+8)"
      );
    } catch (error) {
      console.error("Date formatting error:", error);
      return dateString || "N/A";
    }
  };

  // Handle platform selection change
  const handlePlatformChange = (platform) => {
    setNewSubmission((prev) => ({
      ...prev,
      platform: platform,
      targetId: platform === "twitter" ? "" : "placeholder", // Set placeholder for Discord/Telegram
    }));
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSubmission((prev) => ({ ...prev, [name]: value }));
  };

  // Get platform icon
  const getPlatformIcon = (platform) => {
    switch (platform) {
      case "twitter":
        return "fab fa-twitter text-blue-400";
      case "discord":
        return "fab fa-discord text-purple-500"; // Changed to match dashboard
      case "telegram":
        return "fab fa-telegram text-blue-500";
      default:
        return "fas fa-globe text-teal-500"; // Changed to match dashboard
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

  // Get status color class
  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-800 border border-amber-300"; // Enhanced with border
      case "approved":
        return "bg-emerald-100 text-emerald-800 border border-emerald-300"; // Changed to emerald with border
      case "rejected":
        return "bg-rose-100 text-rose-800 border border-rose-300"; // Changed to rose with border
      default:
        return "bg-slate-100 text-slate-800 border border-slate-300"; // Changed to slate with border
    }
  };

  // Get background gradient by tab
  const getTabGradient = (tab) => {
    switch (tab) {
      case "pending":
        return "from-amber-500 to-orange-500";
      case "approved":
        return "from-emerald-500 to-green-600";
      case "rejected":
        return "from-rose-500 to-pink-600";
      default:
        return "from-blue-600 to-indigo-600";
    }
  };

  // Create new submission
  const handleCreateSubmission = async (e) => {
    e.preventDefault();

    try {
      if (!newSubmission.content) {
        toast.error("Please enter content for your post");
        return;
      }

      // Prepare the submission data
      const submissionData = { ...newSubmission };

      // For Twitter, ensure targetId is an empty string, not undefined
      if (submissionData.platform === "twitter") {
        submissionData.targetId = "";
      }

      // For Discord/Telegram, ensure there's a placeholder value
      if (
        submissionData.platform === "discord" ||
        submissionData.platform === "telegram"
      ) {
        submissionData.targetId = "placeholder";
      }

      // Only set scheduled time if provided
      if (!submissionData.scheduledTime) {
        delete submissionData.scheduledTime;
      }

      await submissionService.createSubmission(submissionData);
      toast.success("Submission created successfully!");
      setShowCreateModal(false);
      loadSubmissions();

      // Reset form
      setNewSubmission({
        platform: "twitter",
        targetId: "",
        content: "",
        scheduledTime: getTomorrowDateTimeUTC8(),
      });
    } catch (error) {
      console.error("Failed to create submission:", error);
      toast.error(
        "Failed to create submission: " +
          (error.error || error.message || "Unknown error")
      );
    }
  };

  // Handle AI-generated text
  const handleAIGenerated = (text) => {
    setNewSubmission((prev) => ({ ...prev, content: text }));
  };

  // Render the appropriate view based on account type
  if (currentUser?.accountType === "subaccount") {
    return (
      <div className="max-w-6xl mx-auto px-4">
        {/* Page Header with Gradient Background */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-xl p-6 mb-8 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">My Submissions</h1>
              <p className="text-indigo-100">
                Create and track your content submissions
              </p>
            </div>
            <button
              className="px-6 py-3 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all duration-200 shadow-md font-medium flex items-center"
              onClick={() => setShowCreateModal(true)}
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
            </button>
          </div>
        </div>

        {/* Enhanced Tabs */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-0.5">
            <nav className="flex">
              <button
                className={`py-4 px-6 font-medium ${
                  activeTab === "pending"
                    ? "bg-white text-amber-600"
                    : "text-white hover:bg-white/10"
                } transition-all duration-200`}
                onClick={() => setActiveTab("pending")}
              >
                <div className="flex items-center">
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Pending
                </div>
              </button>
              <button
                className={`py-4 px-6 font-medium ${
                  activeTab === "approved"
                    ? "bg-white text-emerald-600"
                    : "text-white hover:bg-white/10"
                } transition-all duration-200`}
                onClick={() => setActiveTab("approved")}
              >
                <div className="flex items-center">
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Approved
                </div>
              </button>
              <button
                className={`py-4 px-6 font-medium ${
                  activeTab === "rejected"
                    ? "bg-white text-rose-600"
                    : "text-white hover:bg-white/10"
                } transition-all duration-200`}
                onClick={() => setActiveTab("rejected")}
              >
                <div className="flex items-center">
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Rejected
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300">
          <div
            className={`bg-gradient-to-r ${getTabGradient(
              activeTab
            )} px-6 py-4`}
          >
            <h2 className="text-white text-xl font-bold flex items-center">
              {activeTab === "pending" && (
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
              )}
              {activeTab === "approved" && (
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
              {activeTab === "rejected" && (
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}{" "}
              Submissions
            </h2>
            <p
              className={`${
                activeTab === "pending"
                  ? "text-amber-100"
                  : activeTab === "approved"
                  ? "text-green-100"
                  : "text-rose-100"
              } text-sm mt-1`}
            >
              {activeTab === "pending"
                ? "Submissions waiting for admin approval"
                : activeTab === "approved"
                ? "Submissions that have been approved"
                : "Submissions that have been rejected"}
            </p>
          </div>

          {/* Submissions list */}
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <div className="flex flex-col items-center">
                {activeTab === "pending" && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-16 w-16 mb-4 text-amber-300 opacity-80"
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
                )}
                {activeTab === "approved" && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-16 w-16 mb-4 text-emerald-300 opacity-80"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
                {activeTab === "rejected" && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-16 w-16 mb-4 text-rose-300 opacity-80"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
                <p className="text-lg">No {activeTab} submissions found</p>
                {activeTab === "pending" && (
                  <button
                    className="mt-4 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg shadow-sm hover:from-indigo-700 hover:to-purple-700 font-medium transition-all duration-150 flex items-center"
                    onClick={() => setShowCreateModal(true)}
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
                    Create your first submission
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className={`p-6 ${
                    submission.status === "pending"
                      ? "hover:bg-amber-50"
                      : submission.status === "approved"
                      ? "hover:bg-emerald-50"
                      : "hover:bg-rose-50"
                  } transition-colors duration-150`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <div
                        className={`${
                          submission.status === "pending"
                            ? "bg-amber-100"
                            : submission.status === "approved"
                            ? "bg-emerald-100"
                            : "bg-rose-100"
                        } p-3 rounded-full mr-3`}
                      >
                        <i
                          className={`${getPlatformIcon(
                            submission.platform
                          )} text-xl`}
                        ></i>
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">
                          {getPlatformName(submission.platform)}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs flex items-center ${getStatusColor(
                        submission.status
                      )}`}
                    >
                      {submission.status === "pending" && (
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
                      )}
                      {submission.status === "approved" && (
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
                      )}
                      {submission.status === "rejected" && (
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
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      )}
                      {submission.status.charAt(0).toUpperCase() +
                        submission.status.slice(1)}
                    </span>
                  </div>

                  <div
                    className={`mt-4 text-gray-700 whitespace-pre-wrap p-4 rounded-lg border ${
                      submission.status === "pending"
                        ? "bg-amber-50 border-amber-100"
                        : submission.status === "approved"
                        ? "bg-emerald-50 border-emerald-100"
                        : "bg-rose-50 border-rose-100"
                    }`}
                  >
                    {submission.content}
                  </div>

                  <div className="mt-4 text-sm text-gray-500">
                    <div className="flex items-center">
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
                      Submitted on: {formatDate(submission.submissionTime)}
                    </div>
                    {submission.scheduledTime && (
                      <div className="flex items-center mt-1">
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
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        Suggested for: {formatDate(submission.scheduledTime)}
                      </div>
                    )}
                    {submission.status === "rejected" &&
                      submission.rejectionReason && (
                        <div className="flex items-start mt-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 mr-2 text-rose-600 flex-shrink-0"
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
                            <span className="font-medium text-rose-700">
                              Reason for rejection:
                            </span>
                            <p className="text-rose-700">
                              {submission.rejectionReason}
                            </p>
                          </div>
                        </div>
                      )}
                  </div>

                  {/* View Details button */}
                  <div className="mt-4 flex justify-end">
                    <Link
                      href={`/dashboard/submissions/${submission.id}`}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-sm hover:from-blue-700 hover:to-indigo-700 font-medium transition-all duration-150 flex items-center"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Submission Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl max-w-lg w-full mx-4 overflow-hidden shadow-xl">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                <h3 className="text-xl font-bold text-white flex items-center">
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
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Create New Submission
                </h3>
                <p className="text-blue-100 text-sm">
                  Submit content for admin approval
                </p>
              </div>

              <form onSubmit={handleCreateSubmission}>
                <div className="p-6 space-y-4">
                  {/* Platform Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Platform
                    </label>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        className={`flex-1 py-2 px-4 rounded-lg border flex justify-center items-center ${
                          newSubmission.platform === "twitter"
                            ? "bg-blue-50 border-blue-300 text-blue-600"
                            : "border-gray-300 hover:bg-gray-50"
                        }`}
                        onClick={() => handlePlatformChange("twitter")}
                      >
                        <i className="fab fa-twitter mr-2"></i>
                        Twitter
                      </button>
                      <button
                        type="button"
                        className={`flex-1 py-2 px-4 rounded-lg border flex justify-center items-center ${
                          newSubmission.platform === "discord"
                            ? "bg-indigo-50 border-indigo-300 text-indigo-600"
                            : "border-gray-300 hover:bg-gray-50"
                        }`}
                        onClick={() => handlePlatformChange("discord")}
                      >
                        <i className="fab fa-discord mr-2"></i>
                        Discord
                      </button>
                      <button
                        type="button"
                        className={`flex-1 py-2 px-4 rounded-lg border flex justify-center items-center ${
                          newSubmission.platform === "telegram"
                            ? "bg-blue-50 border-blue-300 text-blue-600"
                            : "border-gray-300 hover:bg-gray-50"
                        }`}
                        onClick={() => handlePlatformChange("telegram")}
                      >
                        <i className="fab fa-telegram mr-2"></i>
                        Telegram
                      </button>
                    </div>
                    {(newSubmission.platform === "discord" ||
                      newSubmission.platform === "telegram") && (
                      <p className="mt-2 text-sm text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-200">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 inline mr-1 text-gray-400"
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
                        {newSubmission.platform === "discord"
                          ? "Your admin will select which Discord channel to post to during review."
                          : "Your admin will select which Telegram chat to post to during review."}
                      </p>
                    )}
                  </div>

                  {/* Content */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content
                    </label>
                    <textarea
                      name="content"
                      value={newSubmission.content}
                      onChange={handleInputChange}
                      rows="6"
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder={`What do you want to post on ${getPlatformName(
                        newSubmission.platform
                      )}?`}
                      maxLength={
                        newSubmission.platform === "twitter" ? 280 : 2000
                      }
                    ></textarea>
                    <div className="mt-2">
                      <AITextGenerator
                        onTextGenerated={handleAIGenerated}
                        platform={newSubmission.platform}
                      />
                    </div>
                    {newSubmission.platform === "twitter" && (
                      <div className="text-xs text-right mt-1 text-gray-500">
                        {newSubmission.content.length}/280 characters
                      </div>
                    )}
                  </div>

                  {/* Schedule Date/Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Suggested posting time (optional)
                    </label>
                    <input
                      type="datetime-local"
                      name="scheduledTime"
                      value={newSubmission.scheduledTime}
                      onChange={handleInputChange}
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="mt-2 text-sm text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-200">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 inline mr-1 text-gray-400"
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
                      Your admin will have final approval of posting time. All
                      times are in UTC+8 timezone.
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
                  <button
                    type="button"
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white shadow-sm hover:bg-gray-50 font-medium transition-all duration-150"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-sm hover:from-blue-700 hover:to-indigo-700 font-medium transition-all duration-150"
                  >
                    Submit for Approval
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  } else if (currentUser?.accountType === "admin") {
    // Admin view for reviewing submissions
    return (
      <div className="max-w-6xl mx-auto px-4">
        {/* Page Header with Gradient Background */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-xl p-6 mb-8 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Review Submissions
              </h1>
              <p className="text-indigo-100">
                Review and manage subaccount content submissions
              </p>
            </div>
            <Link
              href="/dashboard"
              className="px-6 py-3 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all duration-200 shadow-md font-medium flex items-center"
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
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Dashboard
            </Link>
          </div>
        </div>

        {/* Enhanced Tabs */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-0.5">
            <nav className="flex">
              <button
                className={`py-4 px-6 font-medium ${
                  activeTab === "pending"
                    ? "bg-white text-amber-600"
                    : "text-white hover:bg-white/10"
                } transition-all duration-200`}
                onClick={() => setActiveTab("pending")}
              >
                <div className="flex items-center">
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Pending
                </div>
              </button>
              <button
                className={`py-4 px-6 font-medium ${
                  activeTab === "approved"
                    ? "bg-white text-emerald-600"
                    : "text-white hover:bg-white/10"
                } transition-all duration-200`}
                onClick={() => setActiveTab("approved")}
              >
                <div className="flex items-center">
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Approved
                </div>
              </button>
              <button
                className={`py-4 px-6 font-medium ${
                  activeTab === "rejected"
                    ? "bg-white text-rose-600"
                    : "text-white hover:bg-white/10"
                } transition-all duration-200`}
                onClick={() => setActiveTab("rejected")}
              >
                <div className="flex items-center">
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Rejected
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300">
          <div
            className={`bg-gradient-to-r ${getTabGradient(
              activeTab
            )} px-6 py-4`}
          >
            <h2 className="text-white text-xl font-bold flex items-center">
              {activeTab === "pending" && (
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
              )}
              {activeTab === "approved" && (
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
              {activeTab === "rejected" && (
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}{" "}
              Submissions
            </h2>
            <p
              className={`${
                activeTab === "pending"
                  ? "text-amber-100"
                  : activeTab === "approved"
                  ? "text-green-100"
                  : "text-rose-100"
              } text-sm mt-1`}
            >
              {activeTab === "pending"
                ? "Submissions awaiting your review"
                : activeTab === "approved"
                ? "Submissions you have approved"
                : "Submissions you have rejected"}
            </p>
          </div>

          {/* Submissions list */}
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <div className="flex flex-col items-center">
                {activeTab === "pending" && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-16 w-16 mb-4 text-amber-300 opacity-80"
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
                )}
                {activeTab === "approved" && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-16 w-16 mb-4 text-emerald-300 opacity-80"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
                {activeTab === "rejected" && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-16 w-16 mb-4 text-rose-300 opacity-80"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
                <p className="text-lg">No {activeTab} submissions found</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className={`p-6 ${
                    submission.status === "pending"
                      ? "hover:bg-amber-50"
                      : submission.status === "approved"
                      ? "hover:bg-emerald-50"
                      : "hover:bg-rose-50"
                  } transition-colors duration-150`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <div
                        className={`${
                          submission.status === "pending"
                            ? "bg-amber-100"
                            : submission.status === "approved"
                            ? "bg-emerald-100"
                            : "bg-rose-100"
                        } p-3 rounded-full mr-3`}
                      >
                        <i
                          className={`${getPlatformIcon(
                            submission.platform
                          )} text-xl`}
                        ></i>
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">
                          {getPlatformName(submission.platform)}
                        </div>
                        {/* Only show targetId for admin view if it's not a placeholder */}
                        {submission.targetId &&
                          submission.targetId !== "placeholder" &&
                          (submission.platform === "discord" ||
                            submission.platform === "telegram") && (
                            <div className="text-sm text-gray-500">
                              {submission.platform === "discord"
                                ? `Channel ID: ${submission.targetId}`
                                : `Chat ID: ${submission.targetId}`}
                            </div>
                          )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs flex items-center ${getStatusColor(
                          submission.status
                        )}`}
                      >
                        {submission.status === "pending" && (
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
                        )}
                        {submission.status === "approved" && (
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
                        )}
                        {submission.status === "rejected" && (
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
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        )}
                        {submission.status.charAt(0).toUpperCase() +
                          submission.status.slice(1)}
                      </span>
                      <div className="py-1 px-3 bg-indigo-100 text-indigo-800 text-xs rounded-full border border-indigo-200 flex items-center">
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
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        {submission.submitterUsername}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`mt-4 text-gray-700 whitespace-pre-wrap p-4 rounded-lg border ${
                      submission.status === "pending"
                        ? "bg-amber-50 border-amber-100"
                        : submission.status === "approved"
                        ? "bg-emerald-50 border-emerald-100"
                        : "bg-rose-50 border-rose-100"
                    }`}
                  >
                    {submission.content}
                  </div>

                  <div className="mt-4 text-sm text-gray-500">
                    <div className="flex items-center">
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
                      Submitted on: {formatDate(submission.submissionTime)}
                    </div>
                    {submission.scheduledTime && (
                      <div className="flex items-center mt-1">
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
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        Suggested for: {formatDate(submission.scheduledTime)}
                      </div>
                    )}
                    {submission.status === "rejected" &&
                      submission.rejectionReason && (
                        <div className="flex items-start mt-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 mr-2 text-rose-600 flex-shrink-0"
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
                            <span className="font-medium text-rose-700">
                              Reason for rejection:
                            </span>
                            <p className="text-rose-700">
                              {submission.rejectionReason}
                            </p>
                          </div>
                        </div>
                      )}
                  </div>

                  {/* Action buttons for admin */}
                  <div className="mt-4 flex justify-end">
                    {submission.status === "pending" ? (
                      <Link
                        href={`/dashboard/submissions/${submission.id}`}
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg shadow-sm hover:from-amber-600 hover:to-orange-700 font-medium transition-all duration-150 flex items-center"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                          />
                        </svg>
                        Review
                      </Link>
                    ) : (
                      <Link
                        href={`/dashboard/submissions/${submission.id}`}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-sm hover:from-blue-700 hover:to-indigo-700 font-medium transition-all duration-150 flex items-center"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        View Details
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  } else {
    // Fallback for individual accounts that shouldn't access this page
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-xl shadow-md p-8 border border-gray-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 text-gray-400 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Access Restricted
          </h2>
          <p className="text-gray-600 mb-6">
            This page is only available for subaccounts and admins.
          </p>
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-sm hover:from-blue-700 hover:to-indigo-700 font-medium transition-all duration-150 inline-flex items-center"
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
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }
}
