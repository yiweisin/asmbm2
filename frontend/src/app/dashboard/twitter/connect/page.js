"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { twitterService } from "@/services/api";
import toast from "react-hot-toast";
import { Twitter, ArrowLeft, CheckCircle, XCircle, Loader } from "lucide-react";

export default function TwitterConnectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("idle"); // idle, loading, success, error

  // Generate a code verifier and code challenge for PKCE
  const generateCodeVerifier = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) =>
      ("0" + (byte & 0xff).toString(16)).slice(-2)
    ).join("");
  };

  const sha256 = async (plain) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((byte) => String.fromCharCode(byte)).join("");
  };

  const base64URLEncode = (str) => {
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  };

  const generateCodeChallenge = async (verifier) => {
    const hash = await sha256(verifier);
    return base64URLEncode(hash);
  };

  // Initialize OAuth flow
  const initiateTwitterAuth = async () => {
    setConnectionStatus("loading");

    // Generate and store code verifier
    const codeVerifier = generateCodeVerifier();
    localStorage.setItem("twitter_code_verifier", codeVerifier);

    // Generate code challenge
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Twitter OAuth URL
    const clientId = process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID;
    const redirectUri =
      process.env.NEXT_PUBLIC_TWITTER_REDIRECT_URI ||
      `${window.location.origin}/dashboard/twitter/connect`;
    const scope = "tweet.read tweet.write users.read offline.access";

    const twitterAuthUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${encodeURIComponent(
      scope
    )}&state=state&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    window.location.href = twitterAuthUrl;
  };

  // Check for code parameter in URL (OAuth callback)
  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      handleOAuthCallback(code);
    }
  }, [searchParams]);

  // Handle the OAuth callback
  const handleOAuthCallback = async (code) => {
    setIsConnecting(true);
    setConnectionStatus("loading");

    // Retrieve the code verifier we stored before redirecting to Twitter
    const codeVerifier = localStorage.getItem("twitter_code_verifier");

    const redirectUri =
      process.env.NEXT_PUBLIC_TWITTER_REDIRECT_URI ||
      `${window.location.origin}/dashboard/twitter/connect`;

    try {
      await twitterService.connect(code, redirectUri, codeVerifier);
      setConnectionStatus("success");
      toast.success("Twitter account connected successfully!");

      // Redirect after a short delay to show success state
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (error) {
      console.log("Error connecting Twitter account:", error);
      setConnectionStatus("error");

      // Check for specific error messages
      if (error.includes && error.includes("authorization code was invalid")) {
        toast.error("Authorization expired. Please try connecting again.");
      } else {
        toast.error("Failed to connect Twitter account. Please try again.");
      }
    } finally {
      setIsConnecting(false);
      localStorage.removeItem("twitter_code_verifier");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 py-6">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-blue-300/20 to-indigo-300/20 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-gradient-to-tr from-cyan-300/20 to-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-2/3 right-1/2 w-96 h-96 bg-gradient-to-br from-purple-300/20 to-pink-300/20 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 z-10 relative">
        {/* Page Header with Gradient Background */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-xl p-6 mb-8 shadow-lg">
          <div className="flex items-center">
            <Link
              href="/dashboard"
              className="mr-4 bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors duration-200"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center">
                <Twitter className="h-6 w-6 mr-2" />
                Connect Twitter Account
              </h1>
              <p className="text-blue-100 text-sm mt-1">
                Link your Twitter profile to enable posting and analytics
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white py-10 px-8 shadow-xl rounded-2xl border border-gray-100 backdrop-blur-sm bg-white/90">
          {connectionStatus === "success" ? (
            <div className="text-center">
              <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg mb-6">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Connection Successful!
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Your Twitter account has been successfully connected.
              </p>
              <p className="text-gray-500">Redirecting to dashboard...</p>
              <div className="mt-4 flex justify-center">
                <span className="animate-pulse inline-block h-2 w-2 rounded-full bg-indigo-600 mr-1"></span>
                <span
                  className="animate-pulse inline-block h-2 w-2 rounded-full bg-indigo-600 mr-1"
                  style={{ animationDelay: "0.2s" }}
                ></span>
                <span
                  className="animate-pulse inline-block h-2 w-2 rounded-full bg-indigo-600"
                  style={{ animationDelay: "0.4s" }}
                ></span>
              </div>
            </div>
          ) : connectionStatus === "error" ? (
            <div className="text-center">
              <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-rose-500 to-red-500 flex items-center justify-center shadow-lg mb-6">
                <XCircle className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Connection Failed
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                There was an issue connecting your Twitter account.
              </p>
              <button
                type="button"
                onClick={initiateTwitterAuth}
                className="inline-flex items-center px-6 py-3 border border-transparent text-lg font-medium rounded-lg shadow-md text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:-translate-y-0.5"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg mb-6">
                <Twitter className="h-12 w-12 text-white" />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Connect to Twitter
              </h2>

              <p className="text-lg text-gray-600 max-w-xl mx-auto mb-6">
                Linking your Twitter account allows you to post tweets directly,
                analyze performance, and track growth metrics.
              </p>

              <div className="bg-blue-50 rounded-xl p-5 max-w-lg mx-auto mb-8 border border-blue-100">
                <h3 className="font-medium text-blue-800 mb-2">
                  You'll be able to:
                </h3>
                <ul className="text-left text-blue-700 space-y-2">
                  <li className="flex items-start">
                    <svg
                      className="h-5 w-5 text-blue-500 mr-2 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Post tweets directly from the dashboard
                  </li>
                  <li className="flex items-start">
                    <svg
                      className="h-5 w-5 text-blue-500 mr-2 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    View engagement metrics and follower growth
                  </li>
                  <li className="flex items-start">
                    <svg
                      className="h-5 w-5 text-blue-500 mr-2 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Schedule tweets for optimal posting times
                  </li>
                  <li className="flex items-start">
                    <svg
                      className="h-5 w-5 text-blue-500 mr-2 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Analyze your best-performing content
                  </li>
                </ul>
              </div>

              <div className="mt-8">
                <button
                  type="button"
                  onClick={initiateTwitterAuth}
                  disabled={isConnecting || connectionStatus === "loading"}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-lg font-medium rounded-lg shadow-md text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200 transform hover:-translate-y-0.5"
                >
                  {connectionStatus === "loading" ? (
                    <>
                      <Loader className="animate-spin h-5 w-5 mr-3" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Twitter className="h-5 w-5 mr-2" />
                      Connect Twitter Account
                    </>
                  )}
                </button>
              </div>

              <p className="mt-4 text-sm text-gray-500">
                We use secure OAuth authentication. Your credentials are never
                stored.
              </p>
            </div>
          )}
        </div>

        {/* Information Section */}
        <div className="mt-8 bg-white rounded-xl p-6 shadow-md border border-gray-100">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            About Twitter Account Connection
          </h3>
          <div className="prose prose-blue max-w-none">
            <p>
              To provide the best Twitter management experience, we need
              permission to access certain aspects of your Twitter account.
              Here's what you should know:
            </p>
            <ul>
              <li>
                We request read and write permissions to allow both analysis and
                posting
              </li>
              <li>
                All communication is secured using industry-standard OAuth 2.0
                protocol
              </li>
              <li>
                You can revoke access at any time from your Twitter settings or
                our dashboard
              </li>
              <li>We never store your Twitter credentials on our servers</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
