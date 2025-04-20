"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { authService } from "@/services/api";
import { Toaster } from "react-hot-toast";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }

    setUser(currentUser);
  }, [router]);

  const handleLogout = () => {
    authService.logout();
    router.push("/login");
  };

  // Helper function to determine if a link is active
  const isActive = (path) => {
    return pathname === path;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Determine if user is a subaccount
  const isSubaccount = user.accountType === "subaccount";

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" />

      <div className="flex">
        {/* Sidebar for desktop */}
        <aside className="w-64 bg-white shadow-md fixed h-full overflow-y-auto">
          <div className="p-6">
            <Link href="/dashboard" className="text-xl font-bold text-blue-600">
              Auto Social Media Bot Manager
            </Link>
          </div>
          <nav className="mt-5">
            <div className="px-3 space-y-1">
              {/* Dashboard Link - For Everyone */}
              <Link
                href="/dashboard"
                className={`group flex items-center px-4 py-3 text-sm font-medium rounded-md ${
                  isActive("/dashboard")
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <svg
                  className={`mr-3 h-5 w-5 ${
                    isActive("/dashboard") ? "text-blue-500" : "text-gray-500"
                  }`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Dashboard
              </Link>

              {/* Submissions Link - For Subaccounts and Admins */}
              {(isSubaccount || user.accountType === "admin") && (
                <Link
                  href="/dashboard/submissions"
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-md ${
                    isActive("/dashboard/submissions") ||
                    pathname.startsWith("/dashboard/submissions/")
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <svg
                    className={`mr-3 h-5 w-5 ${
                      isActive("/dashboard/submissions") ||
                      pathname.startsWith("/dashboard/submissions/")
                        ? "text-blue-500"
                        : "text-gray-500"
                    }`}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  {isSubaccount ? "Submissions" : "Review Submissions"}
                </Link>
              )}

              {/* Schedule Link - Only for Admins and Individual users */}
              {!isSubaccount && (
                <Link
                  href="/dashboard/schedule"
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-md ${
                    isActive("/dashboard/schedule")
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <svg
                    className={`mr-3 h-5 w-5 ${
                      isActive("/dashboard/schedule")
                        ? "text-blue-500"
                        : "text-gray-500"
                    }`}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Schedule
                </Link>
              )}

              {/* Platforms heading - Only for Admins and Individual users */}
              {!isSubaccount && (
                <>
                  <div className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Platforms
                  </div>

                  <Link
                    href="/dashboard/twitter"
                    className={`group flex items-center px-4 py-3 text-sm font-medium rounded-md ${
                      isActive("/dashboard/twitter")
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <svg
                      className={`mr-3 h-5 w-5 ${
                        isActive("/dashboard/twitter")
                          ? "text-blue-500"
                          : "text-gray-500"
                      }`}
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    Twitter
                  </Link>
                  <Link
                    href="/dashboard/discord"
                    className={`group flex items-center px-4 py-3 text-sm font-medium rounded-md ${
                      isActive("/dashboard/discord")
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <svg
                      className={`mr-3 h-5 w-5 ${
                        isActive("/dashboard/discord")
                          ? "text-blue-500"
                          : "text-gray-500"
                      }`}
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                      />
                    </svg>
                    Discord
                  </Link>
                  <Link
                    href="/dashboard/telegram"
                    className={`group flex items-center px-4 py-3 text-sm font-medium rounded-md ${
                      isActive("/dashboard/telegram")
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <svg
                      className={`mr-3 h-5 w-5 ${
                        isActive("/dashboard/telegram")
                          ? "text-blue-500"
                          : "text-gray-500"
                      }`}
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                    Telegram
                  </Link>
                </>
              )}
            </div>
          </nav>

          <div className="absolute bottom-0 w-full border-t border-gray-200 p-4 bg-white">
            <div className="flex items-center">
              <div className="flex-1">
                <Link href="/dashboard/profile" className="hover:underline">
                  <p className="text-sm font-medium text-gray-700">
                    {user.username}
                  </p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </Link>
                {/* Show account type badge */}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                  {user.accountType === "admin"
                    ? "Admin"
                    : user.accountType === "subaccount"
                    ? "Subaccount"
                    : "Individual"}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="ml-auto inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none"
              >
                Logout
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="pl-64 flex-1">
          <div className="py-6 px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
