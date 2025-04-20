"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { discordService } from "@/services/api";
import toast from "react-hot-toast";

export default function DiscordConnectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isConnecting, setIsConnecting] = useState(false);

  // The Discord OAuth URL - ADD GUILDS SCOPE
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  const redirectUri =
    process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI ||
    `${window.location.origin}/dashboard/discord/connect`;
  const scope = "identify guilds bot messages.read"; // Added 'guilds' scope
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${encodeURIComponent(scope)}`;

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
    try {
      await discordService.connect(code, redirectUri);
      toast.success("Discord account connected successfully!");
      router.push("/dashboard");
    } catch (error) {
      console.log("Error connecting Discord account:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  // Redirect to Discord OAuth
  const initiateDiscordAuth = () => {
    window.location.href = discordAuthUrl;
  };

  return (
    <div>
      <div className="mb-5 pb-5 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Connect Discord</h1>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mx-auto h-12 w-12 text-indigo-500"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Connect your Discord account
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Connect your Discord account to manage servers, channels, and send
              messages.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={initiateDiscordAuth}
                disabled={isConnecting}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isConnecting ? "Connecting..." : "Connect Discord Account"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
