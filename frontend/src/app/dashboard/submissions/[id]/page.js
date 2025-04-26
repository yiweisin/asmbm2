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

  // Get background gradient by status
  const getStatusGradient = (status) => {
    switch (status) {
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
  // Get platform icon
  const getPlatformIcon = (platform) => {
    switch (platform) {
      case "twitter":
        return "fab fa-twitter text-blue-400";
      case "discord":
        return "fab fa-discord text-purple-500";
      case "telegram":
        return "fab fa-telegram text-blue-500";
      default:
        return "fas fa-globe text-teal-500";
    }
  };
  // Get status color class
  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-800 border border-amber-300";
      case "approved":
        return "bg-emerald-100 text-emerald-800 border border-emerald-300";
      case "rejected":
        return "bg-rose-100 text-rose-800 border border-rose-300";
      default:
        return "bg-slate-100 text-slate-800 border border-slate-300";
    }
  };

  // Check if user is logged in and load submission
  useEffect(() => {
    setIsLoading(true);
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
      loadSubmission(submissionId, user);
    } else {
      toast.error("Invalid submission ID");
      router.push("/dashboard/submissions");
    }
  }, [submissionId, router]);

  // Load submission details (keep existing loadSubmission function)
  const loadSubmission = async (id, user) => {
    try {
      const data = await submissionService.getSubmission(id);
      setSubmission(data);
      console.log("Submission data:", data);

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

  // Render loading state
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Render submission not found
  if (!submission) {
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
              d="M9.172 16.172a4 4 0 005.656 0m-5.656 0a4 4 0 115.656 0m-5.656 0L4.343 13.657m5.657 2.515a4 4 0 005.656 0M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Submission Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            The submission you're looking for doesn't exist or has been deleted.
          </p>
          <Link
            href="/dashboard/submissions"
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
            Back to Submissions
          </Link>
        </div>
      </div>
    );
  }

  // Render submission details for subaccount
  if (currentUser?.accountType === "subaccount") {
    return (
      <div className="max-w-6xl mx-auto px-4">
        {/* Page Header with Gradient Background */}
        <div
          className={`bg-gradient-to-r ${getStatusGradient(
            submission.status
          )} rounded-xl p-6 mb-8 shadow-lg`}
        >
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Submission Details
              </h1>
              <p className="text-white/80">
                Details of your content submission
              </p>
            </div>
            <Link
              href="/dashboard/submissions"
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
              Back to Submissions
            </Link>
          </div>
        </div>

        {/* Submission Content Area */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
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

              {submission.reviewTime && submission.status !== "pending" && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Reviewed
                  </h3>
                  <p>{formatDate(submission.reviewTime)}</p>
                </div>
              )}
            </div>

            {submission.status === "rejected" && submission.rejectionReason && (
              <div className="mt-6 flex items-start p-3 bg-rose-50 border border-rose-200 rounded-lg">
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
                  <p className="text-rose-700">{submission.rejectionReason}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render submission details for admin
  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* Page Header with Gradient Background */}
      <div
        className={`bg-gradient-to-r ${getStatusGradient(
          submission.status
        )} rounded-xl p-6 mb-8 shadow-lg`}
      >
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Review Submission</h1>
            <p className="text-white/80">Detailed view of content submission</p>
          </div>
          <Link
            href="/dashboard/submissions"
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
            Back to Submissions
          </Link>
        </div>
      </div>

      {/* Submission Content Area */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
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
                  className={`${getPlatformIcon(submission.platform)} text-xl`}
                ></i>
              </div>
              <div>
                <div className="font-medium text-gray-800">
                  {getPlatformName(submission.platform)}
                </div>
                <div className="text-sm text-gray-500">
                  From: {submission.submitterUsername}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span
                className={`px-3 py-1 rounded-full text-xs flex items-center ${getStatusColor(
                  submission.status
                )}`}
              >
                {submission.status.charAt(0).toUpperCase() +
                  submission.status.slice(1)}
              </span>
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

            {submission.reviewTime && submission.status !== "pending" && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Reviewed</h3>
                <p>{formatDate(submission.reviewTime)}</p>
              </div>
            )}
          </div>

          {submission.status === "rejected" && submission.rejectionReason && (
            <div className="mt-6 flex items-start p-3 bg-rose-50 border border-rose-200 rounded-lg">
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
                <p className="text-rose-700">{submission.rejectionReason}</p>
              </div>
            </div>
          )}

          {/* Action buttons for admin */}
          {submission.status === "pending" && (
            <div className="mt-8 flex justify-end space-x-4">
              <button
                onClick={() => setShowRejectModal(true)}
                className="px-6 py-3 border border-rose-300 text-rose-600 rounded-lg hover:bg-rose-50 transition-all duration-150 flex items-center"
                disabled={isProcessing}
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Reject
              </button>
              <button
                onClick={() => setShowApproveModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-700 text-white rounded-lg shadow-sm hover:from-emerald-700 hover:to-green-800 transition-all duration-150 flex items-center"
                disabled={isProcessing}
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Approve
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="bg-gradient-to-r from-rose-500 to-pink-600 text-white p-4 -mx-6 -mt-6 mb-4 rounded-t-lg">
              <h3 className="text-lg font-bold flex items-center">
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
                Reject Submission
              </h3>
              <p className="text-white/80 text-sm">
                Provide a reason for rejecting this submission
              </p>
            </div>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection"
              className="w-full border border-gray-300 rounded-md p-2 mb-4 focus:ring-rose-500 focus:border-rose-500"
              rows="4"
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
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-pink-700 text-white rounded hover:from-rose-700 hover:to-pink-800"
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
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white p-4 -mx-6 -mt-6 mb-4 rounded-t-lg">
              <h3 className="text-lg font-bold flex items-center">
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
                Approve Submission
              </h3>
              <p className="text-white/80 text-sm">
                Choose when and where to post this submission
              </p>
            </div>

            {/* Platform-specific posting options */}
            {submission.platform === "discord" && account && (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Server
                </label>
                <select
                  id="server-select"
                  value={selectedServer?.id || ""}
                  onChange={handleServerChange}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md mb-4"
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

                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Channel
                </label>
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
              </>
            )}

            {submission.platform === "telegram" && account && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telegram Chat ID
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md p-2"
                  placeholder="Enter Telegram Chat ID"
                  onChange={(e) => setChatId(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={postImmediately}
                  onChange={(e) => setPostImmediately(e.target.checked)}
                  className="mr-2 rounded focus:ring-emerald-500"
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
                  {" "}
                  All times are in UTC+8 timezone.
                </p>
              </div>
            )}

            {submission.platform === "twitter" && account && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Twitter Account
                </label>
                <div className="p-2 bg-blue-50 rounded-md border border-blue-100">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center text-white mr-3">
                      <i className="fab fa-twitter"></i>
                    </div>
                    <div>
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
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-700 text-white rounded hover:from-emerald-700 hover:to-green-800"
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
