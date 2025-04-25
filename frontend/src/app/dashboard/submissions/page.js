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

  // Get status color class
  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
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
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My Submissions</h1>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => setShowCreateModal(true)}
          >
            New Submission
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            <button
              className={`py-4 px-1 ${
                activeTab === "pending"
                  ? "border-b-2 border-blue-500 font-medium text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("pending")}
            >
              Pending
            </button>
            <button
              className={`py-4 px-1 ${
                activeTab === "approved"
                  ? "border-b-2 border-blue-500 font-medium text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("approved")}
            >
              Approved
            </button>
            <button
              className={`py-4 px-1 ${
                activeTab === "rejected"
                  ? "border-b-2 border-blue-500 font-medium text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("rejected")}
            >
              Rejected
            </button>
          </nav>
        </div>

        {/* Submissions list */}
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <p className="text-lg">No {activeTab} submissions found</p>
            <button
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={() => setShowCreateModal(true)}
            >
              Create your first submission
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <div key={submission.id} className="bg-white p-4 rounded shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <i
                      className={`${getPlatformIcon(
                        submission.platform
                      )} text-xl mr-3`}
                    ></i>
                    <div>
                      <div className="font-medium">
                        {getPlatformName(submission.platform)}
                      </div>
                      {/* Don't show targetId even if present and not a placeholder */}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${getStatusColor(
                      submission.status
                    )}`}
                  >
                    {submission.status}
                  </span>
                </div>

                <div className="mt-3 text-gray-700 whitespace-pre-wrap">
                  {submission.content}
                </div>

                <div className="mt-3 text-sm text-gray-500">
                  <div>
                    Submitted on: {formatDate(submission.submissionTime)}
                  </div>
                  {submission.scheduledTime && (
                    <div>
                      Scheduled for: {formatDate(submission.scheduledTime)}
                    </div>
                  )}
                  {submission.status === "rejected" &&
                    submission.rejectionReason && (
                      <div className="mt-2 text-red-500">
                        <strong>Reason for rejection:</strong>{" "}
                        {submission.rejectionReason}
                      </div>
                    )}
                </div>

                {/* Add View Details button for subaccounts */}
                <div className="mt-4 flex justify-end space-x-2">
                  <Link
                    href={`/dashboard/submissions/${submission.id}`}
                    className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Submission Modal - Simplified to remove targetId input fields */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-lg w-full mx-4 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-lg font-medium">Create New Submission</h3>
              </div>

              <form onSubmit={handleCreateSubmission}>
                <div className="p-4 space-y-4">
                  {/* Platform Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Platform
                    </label>
                    <select
                      name="platform"
                      value={newSubmission.platform}
                      onChange={(e) => handlePlatformChange(e.target.value)}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="twitter">Twitter</option>
                      <option value="discord">Discord</option>
                      <option value="telegram">Telegram</option>
                    </select>
                    {(newSubmission.platform === "discord" ||
                      newSubmission.platform === "telegram") && (
                      <p className="text-xs text-gray-500 mt-1">
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
                      rows="4"
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="What do you want to post?"
                      maxLength={
                        newSubmission.platform === "twitter" ? 280 : 2000
                      }
                    ></textarea>
                    <div className="mt-1">
                      <AITextGenerator
                        onTextGenerated={handleAIGenerated}
                        platform={newSubmission.platform}
                      />
                    </div>
                    {newSubmission.platform === "twitter" && (
                      <div className="text-xs text-right mt-1 text-gray-500">
                        {newSubmission.content.length}/280
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
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Your admin will have final approval of posting time.
                    </p>
                    <p className="text-xs text-gray-500">
                      All times are in UTC+8 timezone.
                    </p>
                  </div>
                </div>

                <div className="px-4 py-3 bg-gray-50 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border rounded-md text-gray-700 bg-white mr-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
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
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Review Submissions</h1>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            <button
              className={`py-4 px-1 ${
                activeTab === "pending"
                  ? "border-b-2 border-blue-500 font-medium text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("pending")}
            >
              Pending
            </button>
            <button
              className={`py-4 px-1 ${
                activeTab === "approved"
                  ? "border-b-2 border-blue-500 font-medium text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("approved")}
            >
              Approved
            </button>
            <button
              className={`py-4 px-1 ${
                activeTab === "rejected"
                  ? "border-b-2 border-blue-500 font-medium text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("rejected")}
            >
              Rejected
            </button>
          </nav>
        </div>

        {/* Submissions list */}
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <p className="text-lg">No {activeTab} submissions found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <div key={submission.id} className="bg-white p-4 rounded shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <i
                      className={`${getPlatformIcon(
                        submission.platform
                      )} text-xl mr-3`}
                    ></i>
                    <div>
                      <div className="font-medium">
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
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${getStatusColor(
                        submission.status
                      )}`}
                    >
                      {submission.status}
                    </span>
                    <div className="text-sm text-gray-500">
                      From: {submission.submitterUsername}
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-gray-700 whitespace-pre-wrap">
                  {submission.content}
                </div>

                <div className="mt-3 text-sm text-gray-500">
                  <div>
                    Submitted on: {formatDate(submission.submissionTime)}
                  </div>
                  {submission.scheduledTime && (
                    <div>
                      Suggested for: {formatDate(submission.scheduledTime)}
                    </div>
                  )}
                  {submission.status === "rejected" &&
                    submission.rejectionReason && (
                      <div className="mt-2 text-red-500">
                        <strong>Reason for rejection:</strong>{" "}
                        {submission.rejectionReason}
                      </div>
                    )}
                </div>

                {/* For admins, we show different buttons based on status */}
                <div className="mt-4 flex justify-end space-x-2">
                  {submission.status === "pending" ? (
                    <Link
                      href={`/dashboard/submissions/${submission.id}`}
                      className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Review
                    </Link>
                  ) : (
                    <Link
                      href={`/dashboard/submissions/${submission.id}`}
                      className="px-3 py-1.5 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      View Details
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  } else {
    // Fallback for individual accounts that shouldn't access this page
    return (
      <div className="text-center py-10">
        <p>This page is only available for subaccounts and admins.</p>
      </div>
    );
  }
}
