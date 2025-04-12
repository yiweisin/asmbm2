"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { twitterService } from "@/services/api";
import toast from "react-hot-toast";

export default function TwitterConnectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isConnecting, setIsConnecting] = useState(false);

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

    // Retrieve the code verifier we stored before redirecting to Twitter
    const codeVerifier = localStorage.getItem("twitter_code_verifier");

    const redirectUri =
      process.env.NEXT_PUBLIC_TWITTER_REDIRECT_URI ||
      `${window.location.origin}/dashboard/twitter/connect`;

    try {
      await twitterService.connect(code, redirectUri, codeVerifier);
      toast.success("Twitter account connected successfully!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Error connecting Twitter account:", error);

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
    <div>
      <div className="mb-5 pb-5 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Connect Twitter</h1>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
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
              Connect your Twitter account
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Connect your Twitter account to post tweets, read your timeline,
              and more.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={initiateTwitterAuth}
                disabled={isConnecting}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isConnecting ? "Connecting..." : "Connect Twitter Account"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
