// app/dashboard/twitter/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { twitterService } from "@/services/api";
import toast from "react-hot-toast";

export default function TwitterDashboard() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [tweets, setTweets] = useState([]);
  const [tweetText, setTweetText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const router = useRouter();

  // Load Twitter accounts
  useEffect(() => {
    async function loadAccounts() {
      try {
        const data = await twitterService.getAccounts();
        setAccounts(data);

        // Select the first account by default if available
        if (data.length > 0) {
          setSelectedAccount(data[0]);
          loadTweets(data[0].id);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error loading Twitter accounts:", error);
        toast.error("Failed to load Twitter accounts");
        setIsLoading(false);
      }
    }

    loadAccounts();
  }, []);

  // Load tweets for the selected account
  const loadTweets = async (accountId) => {
    setIsLoading(true);
    try {
      const data = await twitterService.getTimeline(accountId);
      if (data && data.data) {
        setTweets(data.data);
      } else {
        setTweets([]);
      }
    } catch (error) {
      console.error("Error loading tweets:", error);
      toast.error("Failed to load tweets");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle account selection change
  const handleAccountChange = (event) => {
    const accountId = parseInt(event.target.value);
    const account = accounts.find((acc) => acc.id === accountId);
    setSelectedAccount(account);
    if (account) {
      loadTweets(account.id);
    }
  };

  // Handle tweet submission
  const handleTweetSubmit = async (e) => {
    e.preventDefault();

    if (!selectedAccount) {
      toast.error("Please select a Twitter account");
      return;
    }

    if (!tweetText.trim()) {
      toast.error("Tweet cannot be empty");
      return;
    }

    setIsPosting(true);
    try {
      await twitterService.postTweet(selectedAccount.id, tweetText);
      toast.success("Tweet posted successfully!");
      setTweetText("");

      // Refresh the timeline
      await loadTweets(selectedAccount.id);
    } catch (error) {
      console.error("Error posting tweet:", error);
      toast.error("Failed to post tweet. Please try again.");
    } finally {
      setIsPosting(false);
    }
  };

  // Format a tweet's created date
  const formatTweetDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="pb-5 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Twitter Dashboard</h1>
      </div>

      {accounts.length === 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
          <div className="text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mx-auto h-12 w-12 text-blue-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M22.162 5.656a8.384 8.384 0 0 1-2.402.658A4.196 4.196 0 0 0 21.6 4c-.82.488-1.719.83-2.656 1.015a4.182 4.182 0 0 0-7.126 3.814 11.874 11.874 0 0 1-8.62-4.37 4.168 4.168 0 0 0-.566 2.103c0 1.45.738 2.731 1.86 3.481a4.168 4.168 0 0 1-1.894-.523v.052a4.185 4.185 0 0 0 3.355 4.101 4.21 4.21 0 0 1-1.89.072A4.185 4.185 0 0 0 7.97 16.65a8.394 8.394 0 0 1-6.191 1.732 11.83 11.83 0 0 0 6.41 1.88c7.693 0 11.9-6.373 11.9-11.9 0-.18-.005-.362-.013-.54a8.496 8.496 0 0 0 2.087-2.165z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No Twitter accounts connected
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Connect your Twitter account to post tweets and view your
              timeline.
            </p>
            <div className="mt-6">
              <Link
                href="/dashboard/twitter/connect"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Connect Twitter Account
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Account selector */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
            <label
              htmlFor="account-select"
              className="block text-sm font-medium text-gray-700"
            >
              Select Twitter Account
            </label>
            <select
              id="account-select"
              value={selectedAccount?.id || ""}
              onChange={handleAccountChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  @{account.username}
                </option>
              ))}
            </select>
          </div>

          {/* Post new tweet */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Post a Tweet
            </h2>
            <form onSubmit={handleTweetSubmit}>
              <div>
                <label htmlFor="tweet-text" className="sr-only">
                  Tweet
                </label>
                <textarea
                  id="tweet-text"
                  name="tweet-text"
                  rows={3}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md"
                  placeholder="What's happening?"
                  value={tweetText}
                  onChange={(e) => setTweetText(e.target.value)}
                  maxLength={280}
                />
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

          {/* Timeline */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900">
                Your Timeline
              </h2>
            </div>
            <div className="border-t border-gray-200">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : tweets.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {tweets.map((tweet) => (
                    <li key={tweet.id} className="px-4 py-5 sm:px-6">
                      <div className="text-sm text-gray-900">{tweet.text}</div>
                      {tweet.created_at && (
                        <div className="mt-1 text-xs text-gray-500">
                          {formatTweetDate(tweet.created_at)}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-5 sm:px-6 text-center text-gray-500">
                  No tweets found. Post your first tweet!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
