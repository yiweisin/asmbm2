"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  submissionService,
  authService,
  twitterService,
  discordService,
  telegramService,
  scheduleService,
} from "@/services/api";
import toast from "react-hot-toast";
import { use } from "react";
import { sub } from "date-fns";

export default function SubmissionDetail({ params }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const submissionId = unwrappedParams?.id;
  const [submission, setSubmission] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentUser, setCurrentUser] = useState({});
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [postImmediately, setPostImmediately] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("");
  const [platformAccounts, setPlatformAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [account, setAccount] = useState(null);
  const [servers, setServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [chatId, setChatId] = useState("");

  // Check if user is logged in and load submission
  useEffect(() => {
    setIsLoading(true);
    if (!authService.isLoggedIn()) {
      router.push("/login");
      return;
    }

    const user = authService.getCurrentUser();
    // Only admins and subaccounts can access submission details
    if (user.accountType !== "admin" && user.accountType !== "subaccount") {
      router.push("/dashboard");
      return;
    }

    if (submissionId) {
      loadSubmission(submissionId, user);
    } else {
      toast.error("Invalid submission ID");
      router.push("/dashboard/submissions");
    }
  }, [submissionId, router]);

  // Load submission details
  const loadSubmission = async (id, user) => {
    try {
      const data = await submissionService.getSubmission(id);
      setSubmission(data);
      console.log("Submission data:", data);
      console.log("hi");
      // Load platform accounts if admin
      if (user?.accountType === "admin") {
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

  // Load platform accounts function
  const loadPlatformAccounts = async (platform) => {
    try {
      let accounts = [];

      // Get accounts based on platform
      if (platform == "twitter") {
        try {
          const data = await twitterService.getAccounts();
          if (data.length > 0) {
            setAccount(data[0]);
          } else {
            throw new Error("No Twitter accounts found");
          }
        } catch (error) {
          console.error(error);
          toast.error("No Twitter accounts found");
          setIsLoading(false);
          router.push("/dashboard/submissions");
        }
      } else if (platform == "discord") {
        async function loadInitialData() {
          try {
            // Load accounts
            const data = await discordService.getAccounts();
            setAccount(data);

            if (data && data.length > 0) {
              await loadServers();
            } else {
              // Redirect to the connect page if no accounts found
              router.push("/dashboard/submissions");
            }
          } catch (error) {
            console.error("Error loading Discord data:", error);
            toast.error("Failed to load Discord data");
            router.push("/dashboard/submissions");
          }
        }

        loadInitialData();

        const loadServers = async () => {
          setServers([]);
          setSelectedServer(null);
          setChannels([]);
          setSelectedChannel(null);

          try {
            const data = await discordService.getServers();
            setServers(data);

            // Select the first server by default if available
            if (data.length > 0) {
              setSelectedServer(data[0]);
              loadChannels(data[0].id);
            }
          } catch (error) {
            console.log("Error loading Discord servers:", error);
          } finally {
          }
        };

        // Load channels for the selected server
        const loadChannels = async (serverId) => {
          setChannels([]);
          setSelectedChannel(null);

          try {
            const data = await discordService.getChannels(serverId);
            setChannels(data);

            // Select the first channel by default if available
            if (data.length > 0) {
              setSelectedChannel(data[0]);
            }
          } catch (error) {
            console.error("Error loading Discord channels:", error);
            toast.error("Failed to load Discord channels");
          } finally {
            setIsLoading(false);
          }
        };
      } else if (platform == "telegram") {
        try {
          const data = await telegramService.getAccounts();
          setAccount(data[0]);
          console.log("Accounts loaded:", data);

          // If user has no accounts, redirect to connect page
          if (data.length === 0) {
            toast.error("Please connect a Telegram accounts");
            throw new Error("Please connect a Telegram accounts");
          }
        } catch (err) {
          router.push("/dashboard/submissions");
        } finally {
          setIsLoading(false);
        }
      }

      setPlatformAccounts(accounts);
    } catch (error) {
      console.error(`Failed to load ${platform} accounts:`, error);
      toast.error(`Failed to load ${platform} accounts`);
    }
  };

  // Handle server selection change
  const handleServerChange = (event) => {
    const serverId = event.target.value;
    const server = servers.find((s) => s.id === serverId);
    setSelectedServer(server);
  };

  // Handle channel selection change
  const handleChannelChange = (event) => {
    const channelId = event.target.value;
    const channel = channels.find((c) => c.id === channelId);
    setSelectedChannel(channel);
  };

  // Handle approving a submission
  const handleApproveSubmission = async () => {
    console.log("Approving submission...");
    try {
      setIsProcessing(true);

      // Check if submission exists and has an ID before proceeding
      if (!submission || !submission.id) {
        throw new Error("Invalid submission data");
      }

      // Make sure we have the necessary data for posting
      if (submission.platform === "twitter" && !account) {
        throw new Error("No Twitter account found for posting");
      } else if (
        submission.platform === "discord" &&
        (!selectedChannel || !selectedServer)
      ) {
        throw new Error("Please select both a Discord server and channel");
      } else if (submission.platform === "telegram" && (!account || !chatId)) {
        throw new Error("Please provide a valid Telegram chat ID");
      }

      // Prepare approval data
      const approvalData = {
        action: "approve",
        rejectionReason: "NA",
        postImmediately: postImmediately,
      };

      // Handle posting based on platform and whether it's immediate or scheduled
      if (postImmediately) {
        // Post immediately to the selected platform
        if (submission.platform === "twitter") {
          try {
            // Make sure account is defined and has an id
            if (!account || !account.id) {
              throw new Error("Twitter account not properly selected");
            }
            await twitterService.postTweet(account.id, submission.content);
            toast.success("Tweet posted successfully!");
          } catch (error) {
            console.error("Error posting tweet:", error);
            throw new Error(
              "Failed to post tweet: " + (error.message || "Unknown error")
            );
          }
        } else if (submission.platform === "discord") {
          try {
            if (!selectedChannel || !selectedChannel.id) {
              throw new Error("Discord channel not properly selected");
            }
            await discordService.sendMessage(
              selectedChannel.id,
              submission.content
            );
            toast.success("Discord message sent successfully!");
          } catch (error) {
            console.error("Error sending Discord message:", error);
            throw new Error(
              "Failed to send Discord message: " +
                (error.message || "Unknown error")
            );
          }
        } else if (submission.platform === "telegram") {
          try {
            if (!account || !account.id || !chatId) {
              throw new Error(
                "Telegram account or chat ID not properly selected"
              );
            }
            await telegramService.sendMessage(
              account.id,
              chatId,
              submission.content
            );
            toast.success("Telegram message sent successfully!");
          } catch (error) {
            console.error("Error sending Telegram message:", error);
            throw new Error(
              "Failed to send Telegram message: " +
                (error.message || "Unknown error")
            );
          }
        }
      } else {
        // Schedule the post for later
        // Create a properly formatted scheduled post object
        let schedulePostData = {
          platform: submission.platform,
          content: submission.content,
          scheduledTime: scheduledTime || submission.scheduledTime,
        };

        // Add platform-specific fields
        if (submission.platform === "twitter") {
          schedulePostData.platformAccountId = account.id;
          schedulePostData.targetId = ""; // Twitter doesn't need a target ID
        } else if (submission.platform === "discord") {
          schedulePostData.platformAccountId = account[0].id;
          schedulePostData.targetId = selectedChannel.id;
        } else if (submission.platform === "telegram") {
          schedulePostData.platformAccountId = account.id;
          schedulePostData.targetId = chatId;
        }

        try {
          await scheduleService.createScheduledPost(schedulePostData);
          toast.success("Post scheduled successfully!");
        } catch (error) {
          console.error("Error scheduling post:", error);
          throw new Error(
            "Failed to schedule post: " + (error.message || "Unknown error")
          );
        }
      }

      // Complete the approval in the backend
      await submissionService.reviewSubmission(submission.id, approvalData);

      toast.success("Submission approved");
      setShowApproveModal(false);
      router.push("/dashboard/submissions");
    } catch (error) {
      console.error("Failed to approve submission:", error);
      toast.error(
        "Failed to approve submission: " + (error.message || "Unknown error")
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

  function formatDateTimeForInput(date) {
    return date.toISOString().slice(0, 16); // Format: "YYYY-MM-DDTHH:MM"
  }

  function formatDateTime(dateTimeString) {
    const date = new Date(dateTimeString);

    // Get components and pad with zeros where needed
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-based
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // Format date for display, correctly handling UTC+8 dates from backend
  const formatDate = (dateString) => {
    try {
      if (!dateString) return "N/A";

      // Parse the date string into a Date object
      const date = new Date(dateString);

      // Format the date using the browser's locale settings
      // The backend is already providing dates in UTC+8, so we don't need to adjust
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      });
    } catch (error) {
      console.error("Date formatting error:", error);
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
                onClick={() => {
                  setShowApproveModal(true);
                }}
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

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium mb-4">Approve Submission</h3>
            <p className="text-gray-600 mb-4">
              Choose when to post this submission.
            </p>
            {submission.platform === "discord" && account && (
              <select
                id="server-select"
                value={selectedServer?.id || ""}
                onChange={handleServerChange}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="" disabled>
                  Select a server
                </option>
                {servers.map((server) => (
                  <option key={server.id} value={server.id}>
                    {server.name}
                  </option>
                ))}
              </select>
            )}
            {submission.platform === "discord" && account && (
              <select
                id="channel-select"
                value={selectedChannel?.id || ""}
                onChange={handleChannelChange}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                disabled={!selectedServer || channels.length === 0}
              >
                <option value="" disabled>
                  Select a channel
                </option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    #{channel.name}
                  </option>
                ))}
              </select>
            )}
            {submission.platform === "telegram" && account && (
              <input
                type="text"
                className="flex-1 border p-2 rounded"
                placeholder="Chat ID"
                onChange={(e) => setChatId(e.target.value)}
                required
              />
            )}
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={postImmediately}
                  onChange={(e) => setPostImmediately(e.target.checked)}
                  className="mr-2"
                />
                <span>Post immediately</span>
              </label>
            </div>

            {!postImmediately && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule for later (UTC+8)
                </label>
                <input
                  type="datetime-local"
                  value={formatDateTime(submission.scheduledTime)}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2"
                  min={formatDateTimeForInput(new Date())}
                />
                <p className="text-xs text-gray-500 mt-1">
                  All times are in UTC+8 timezone.
                </p>
              </div>
            )}

            {submission.platform === "twitter" && account && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Twitter Account
                </label>
                <div className="p-2 bg-blue-50 rounded-md">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center text-white">
                      <i className="fab fa-twitter"></i>
                    </div>
                    <div className="ml-2">
                      <div className="text-sm font-medium">
                        {account.username}
                      </div>
                      <div className="text-xs text-gray-500">
                        @{account.handle}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {platformAccounts && platformAccounts.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Account
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2"
                >
                  <option value="">Select an account</option>
                  {platformAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name || account.username || account.id}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleApproveSubmission}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                disabled={isProcessing}
              >
                {isProcessing ? "Approving..." : "Approve Submission"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
