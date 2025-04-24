"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { submissionService, authService, twitterService } from "@/services/api";
import toast from "react-hot-toast";
import { use } from "react";

export default function SubmissionDetail({ params }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const submissionId = unwrappedParams?.id;
  const [submission, setSubmission] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [postImmediately, setPostImmediately] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("");
  const [platformAccounts, setPlatformAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [account, setAccount] = useState(null);

  // Check if user is logged in and load submission
  useEffect(() => {
    if (!authService.isLoggedIn()) {
      router.push("/login");
      return;
    }

    const user = authService.getCurrentUser();
    setCurrentUser(user);

    // Only admins and subaccounts can access submission details
    if (user.accountType !== "admin" && user.accountType !== "subaccount") {
      router.push("/dashboard");
      return;
    }

    if (submissionId) {
      loadSubmission(submissionId);
    } else {
      toast.error("Invalid submission ID");
      router.push("/dashboard/submissions");
    }
  }, [submissionId, router]);

  // Load submission details
  const loadSubmission = async (id) => {
    try {
      setIsLoading(true);
      const data = await submissionService.getSubmission(id);
      setSubmission(data);

      // Set default scheduled time for approval form (if available)
      if (data.scheduledTime) {
        setScheduledTime(formatDateTimeForInput(new Date(data.scheduledTime)));
      } else {
        setScheduledTime(getTomorrowDateTime());
      }

      // Load platform accounts if admin
      if (currentUser?.accountType === "admin" && data.platform) {
        loadPlatformAccounts(data.platform);
      }
    } catch (error) {
      console.error("Failed to load submission:", error);
      toast.error("Failed to load submission");
      router.push("/dashboard/submissions");
    } finally {
      setIsLoading(false);
    }
  };

  // Load Twitter account
  useEffect(() => {
    async function loadAccount() {
      try {
        const data = await twitterService.getAccounts();

        // Take the first account or null if none exists
        if (data.length > 0) {
          setAccount(data[0]);
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

  const handleApproveSubmission = async () => {
    try {
      setIsProcessing(true);

      // First, review the submission
      try {
        await submissionService.reviewSubmission(submission.id, {
          action: "approve",
        });
      } catch (error) {
        toast.error("approval failed");
      }

      // If it's a Twitter submission and an account exists
      if (account && submission.platform === "twitter") {
        await twitterService.postTweet(account.id, submission.content);
        toast.success("Tweet posted successfully!");
      }

      toast.success("Submission approved successfully!");
      router.push("/dashboard/submissions");
    } catch (error) {
      console.error("Failed to approve submission:", error);
      toast.error(
        "Failed to approve submission: " +
          (error.message || error.error || "Unknown error")
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle rejecting a submission
  const handleRejectSubmission = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    try {
      setIsProcessing(true);

      // Check if submission exists and has an ID before proceeding
      if (!submission || !submission.id) {
        throw new Error("Invalid submission data");
      }

      await submissionService.reviewSubmission(submission.id, {
        action: "reject",
        rejectionReason: rejectionReason,
      });

      toast.success("Submission rejected");
      router.push("/dashboard/submissions");
    } catch (error) {
      console.error("Failed to reject submission:", error);
      toast.error(
        "Failed to reject submission: " +
          (error.message || error.error || "Unknown error")
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Get tomorrow's date at current time
  function getTomorrowDateTime() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateTimeForInput(tomorrow);
  }

  // Format date for datetime-local input
  function formatDateTimeForInput(date) {
    try {
      return new Date(date).toISOString().slice(0, 16); // Format: "YYYY-MM-DDTHH:MM"
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  }

  // Format date for display
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);

      // Format with the browser's locale
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      });
    } catch (error) {
      return dateString || "N/A";
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

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="text-center py-10 text-gray-500">
        <p className="text-lg">Submission not found</p>
        <Link
          href="/dashboard/submissions"
          className="text-blue-500 hover:underline mt-2 inline-block"
        >
          Back to submissions
        </Link>
      </div>
    );
  }

  // For subaccounts, show a read-only view
  if (currentUser?.accountType === "subaccount") {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Submission Details</h1>
          <Link
            href="/dashboard/submissions"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Back to Submissions
          </Link>
        </div>

        <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <i
                  className={`${getPlatformIcon(
                    submission.platform
                  )} text-2xl mr-3`}
                ></i>
                <div>
                  <h2 className="text-xl font-semibold">
                    {submission.platform.charAt(0).toUpperCase() +
                      submission.platform.slice(1)}
                  </h2>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                  submission.status
                )}`}
              >
                {submission.status}
              </span>
            </div>

            <div className="mt-6">
              <h3 className="text-md font-medium mb-2">Content</h3>
              <div className="p-4 bg-gray-50 rounded-md whitespace-pre-wrap">
                {submission.content}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Submitted</h3>
                <p>{formatDate(submission.submissionTime)}</p>
              </div>

              {submission.scheduledTime && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Suggested Time
                  </h3>
                  <p>{formatDate(submission.scheduledTime)}</p>
                </div>
              )}

              {submission.reviewTime && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Reviewed
                  </h3>
                  <p>{formatDate(submission.reviewTime)}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  Submitted By
                </h3>
                <p>{submission.submitterUsername}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  Reviewed By
                </h3>
                <p>
                  {submission.status === "pending"
                    ? "Pending Review"
                    : submission.adminUsername || "N/A"}
                </p>
              </div>
            </div>

            {submission.status === "rejected" && submission.rejectionReason && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-red-500">
                  Reason for Rejection
                </h3>
                <p className="p-4 bg-red-50 rounded-md mt-1 text-red-700">
                  {submission.rejectionReason}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // For admins, show a review interface
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Review Submission</h1>
        <Link
          href="/dashboard/submissions"
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Back to Submissions
        </Link>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center">
              <i
                className={`${getPlatformIcon(
                  submission.platform
                )} text-2xl mr-3`}
              ></i>
              <div>
                <h2 className="text-xl font-semibold">
                  {submission.platform.charAt(0).toUpperCase() +
                    submission.platform.slice(1)}
                </h2>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                submission.status
              )}`}
            >
              {submission.status}
            </span>
          </div>

          <div className="mt-2">
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-blue-100 text-blue-800">
              From: {submission.submitterUsername}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-md font-medium mb-2">Content</h3>
            <div className="p-4 bg-gray-50 rounded-md whitespace-pre-wrap">
              {submission.content}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Submitted</h3>
              <p>{formatDate(submission.submissionTime)}</p>
            </div>

            {submission.scheduledTime && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  Suggested Time
                </h3>
                <p>{formatDate(submission.scheduledTime)}</p>
              </div>
            )}
          </div>

          {submission.status === "pending" && (
            <div className="mt-8 flex justify-end space-x-4">
              <button
                onClick={() => setShowRejectModal(true)}
                className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50"
                disabled={isProcessing}
              >
                Reject
              </button>
              <button
                onClick={handleApproveSubmission}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                disabled={isProcessing}
              >
                Approve
              </button>
            </div>
          )}

          {submission.status !== "pending" && (
            <div className="mt-6 p-4 bg-gray-100 rounded-md">
              <p className="text-center text-gray-700">
                This submission has already been {submission.status}.
              </p>

              {submission.status === "rejected" &&
                submission.rejectionReason && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-red-500">
                      Reason for Rejection
                    </h3>
                    <p className="p-3 bg-red-50 rounded-md mt-1 text-red-700">
                      {submission.rejectionReason}
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium mb-4">Reject Submission</h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for rejecting this submission.
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection"
              className="w-full border border-gray-300 rounded-md p-2 mb-4"
              rows="3"
            ></textarea>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmission}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                disabled={isProcessing || !rejectionReason.trim()}
              >
                {isProcessing ? "Rejecting..." : "Reject Submission"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
