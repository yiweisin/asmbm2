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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  // Helper to check if a path is active or is a subpath
  const isActiveOrSubpath = (path) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  // Determine if user is a subaccount
  const isSubaccount = user.accountType === "subaccount";

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      <div className="flex">
        {/* Enhanced Sidebar with light, premium look */}
        <aside
          className={`${
            sidebarCollapsed ? "w-20" : "w-72"
          } bg-gradient-to-b from-white via-gray-50 to-gray-100 shadow-lg fixed h-full overflow-y-auto transition-all duration-300 z-10 border-r border-gray-200`}
        >
          {/* Toggle button for sidebar */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute right-4 top-6 text-white bg-teal-500 hover:bg-teal-600 p-1 rounded-full shadow-md"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {sidebarCollapsed ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              )}
            </svg>
          </button>

          <div
            className={`p-6 flex items-center ${
              sidebarCollapsed ? "justify-center" : "justify-start"
            }`}
          >
            <Link
              href="/dashboard"
              className={`${
                sidebarCollapsed ? "text-xl" : "text-xl"
              } font-bold text-gray-800`}
            >
              {sidebarCollapsed ? (
                <span className="font-bold text-2xl text-teal-600">SMB</span>
              ) : (
                <div className="flex flex-col">
                  <span className="font-bold tracking-tight text-teal-600">
                    ASMBM
                  </span>
                  <span className="text-sm text-gray-500 -mt-1">
                    Auto Social Media Bot Manager
                  </span>
                </div>
              )}
            </Link>
          </div>

          <nav className="mt-8">
            <div className="px-3 space-y-2">
              {/* Dashboard Link - For Everyone */}
              <Link
                href="/dashboard"
                className={`group flex items-center ${
                  sidebarCollapsed ? "justify-center" : "justify-start"
                } px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive("/dashboard")
                    ? "bg-teal-50 text-teal-700 border-l-4 border-teal-500 shadow-sm"
                    : "text-gray-600 hover:bg-gray-100 hover:text-teal-600"
                }`}
              >
                <svg
                  className={`${sidebarCollapsed ? "" : "mr-3"} h-5 w-5 ${
                    isActive("/dashboard")
                      ? "text-teal-500"
                      : "text-gray-500 group-hover:text-teal-500"
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
                {!sidebarCollapsed && <span>Dashboard</span>}
              </Link>

              {/* Submissions Link - For Subaccounts and Admins */}
              {(isSubaccount || user.accountType === "admin") && (
                <Link
                  href="/dashboard/submissions"
                  className={`group flex items-center ${
                    sidebarCollapsed ? "justify-center" : "justify-start"
                  } px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActiveOrSubpath("/dashboard/submissions")
                      ? "bg-teal-50 text-teal-700 border-l-4 border-teal-500 shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 hover:text-teal-600"
                  }`}
                >
                  <svg
                    className={`${sidebarCollapsed ? "" : "mr-3"} h-5 w-5 ${
                      isActiveOrSubpath("/dashboard/submissions")
                        ? "text-teal-500"
                        : "text-gray-500 group-hover:text-teal-500"
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
                  {!sidebarCollapsed &&
                    (isSubaccount ? "Submissions" : "Review Submissions")}
                </Link>
              )}

              {/* Schedule Link - Only for Admins and Individual users */}
              {!isSubaccount && (
                <Link
                  href="/dashboard/schedule"
                  className={`group flex items-center ${
                    sidebarCollapsed ? "justify-center" : "justify-start"
                  } px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive("/dashboard/schedule")
                      ? "bg-teal-50 text-teal-700 border-l-4 border-teal-500 shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 hover:text-teal-600"
                  }`}
                >
                  <svg
                    className={`${sidebarCollapsed ? "" : "mr-3"} h-5 w-5 ${
                      isActive("/dashboard/schedule")
                        ? "text-teal-500"
                        : "text-gray-500 group-hover:text-teal-500"
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
                  {!sidebarCollapsed && "Schedule"}
                </Link>
              )}

              {/* Platforms heading - Only for Admins and Individual users */}
              {!isSubaccount && (
                <>
                  {!sidebarCollapsed && (
                    <div className="px-3 mt-8 mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Platforms
                    </div>
                  )}
                  {sidebarCollapsed && (
                    <div className="border-t border-gray-200 my-4 opacity-70"></div>
                  )}

                  <Link
                    href="/dashboard/twitter"
                    className={`group flex items-center ${
                      sidebarCollapsed ? "justify-center" : "justify-start"
                    } px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive("/dashboard/twitter")
                        ? "bg-teal-50 text-teal-700 border-l-4 border-teal-500 shadow-sm"
                        : "text-gray-600 hover:bg-gray-100 hover:text-teal-600"
                    }`}
                  >
                    <svg
                      className={`${sidebarCollapsed ? "" : "mr-3"} h-5 w-5 ${
                        isActive("/dashboard/twitter")
                          ? "text-teal-500"
                          : "text-gray-500 group-hover:text-teal-500"
                      }`}
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"
                        fill="currentColor"
                      />
                    </svg>
                    {!sidebarCollapsed && "Twitter"}
                  </Link>
                  <Link
                    href="/dashboard/discord"
                    className={`group flex items-center ${
                      sidebarCollapsed ? "justify-center" : "justify-start"
                    } px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive("/dashboard/discord")
                        ? "bg-teal-50 text-teal-700 border-l-4 border-teal-500 shadow-sm"
                        : "text-gray-600 hover:bg-gray-100 hover:text-teal-600"
                    }`}
                  >
                    <svg
                      className={`${sidebarCollapsed ? "" : "mr-3"} h-5 w-5 ${
                        isActive("/dashboard/discord")
                          ? "text-teal-500"
                          : "text-gray-500 group-hover:text-teal-500"
                      }`}
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09-.01-.02-.04-.03-.07-.03-1.5.26-2.93.71-4.27 1.33-.01 0-.02.01-.03.02-2.72 4.07-3.47 8.03-3.1 11.95 0 .02.01.04.03.05 1.8 1.32 3.53 2.12 5.24 2.65.03.01.06 0 .07-.02.4-.55.76-1.13 1.07-1.74.02-.04 0-.08-.04-.09-.57-.22-1.11-.48-1.64-.78-.04-.02-.04-.08-.01-.11.11-.08.22-.17.33-.25.02-.02.05-.02.07-.01 3.44 1.57 7.15 1.57 10.55 0 .02-.01.05-.01.07.01.11.09.22.17.33.26.04.03.04.09-.01.11-.52.31-1.07.56-1.64.78-.04.01-.05.06-.04.09.32.61.68 1.19 1.07 1.74.03.02.06.03.09.02 1.72-.53 3.45-1.33 5.25-2.65.02-.01.03-.03.03-.05.44-4.53-.73-8.46-3.1-11.95-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.83 2.12-1.89 2.12z"
                        fill="currentColor"
                      />
                    </svg>
                    {!sidebarCollapsed && "Discord"}
                  </Link>
                  <Link
                    href="/dashboard/telegram"
                    className={`group flex items-center ${
                      sidebarCollapsed ? "justify-center" : "justify-start"
                    } px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive("/dashboard/telegram")
                        ? "bg-teal-50 text-teal-700 border-l-4 border-teal-500 shadow-sm"
                        : "text-gray-600 hover:bg-gray-100 hover:text-teal-600"
                    }`}
                  >
                    <svg
                      className={`${sidebarCollapsed ? "" : "mr-3"} h-5 w-5 ${
                        isActive("/dashboard/telegram")
                          ? "text-teal-500"
                          : "text-gray-500 group-hover:text-teal-500"
                      }`}
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"
                        fill="currentColor"
                      />
                    </svg>
                    {!sidebarCollapsed && "Telegram"}
                  </Link>
                </>
              )}
            </div>
          </nav>

          <div
            className={`absolute bottom-0 w-full border-t border-gray-200 ${
              sidebarCollapsed ? "p-2" : "p-4"
            } bg-gray-50 backdrop-blur-sm`}
          >
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white font-medium shadow-sm">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <button
                  onClick={handleLogout}
                  className="mt-2 inline-flex items-center justify-center p-1 w-8 h-8 rounded-full bg-rose-500 hover:bg-rose-600 shadow-sm transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center text-white font-medium shadow-sm">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <Link href="/dashboard/profile" className="hover:underline">
                    <p className="text-sm font-medium text-gray-700">
                      {user.username}
                    </p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </Link>
                  {/* Show account type badge */}
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 
                    ${
                      user.accountType === "admin"
                        ? "bg-amber-100 text-amber-800"
                        : user.accountType === "subaccount"
                        ? "bg-teal-100 text-teal-800"
                        : "bg-indigo-100 text-indigo-800"
                    }`}
                  >
                    {user.accountType === "admin"
                      ? "Admin"
                      : user.accountType === "subaccount"
                      ? "Subaccount"
                      : "Individual"}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-auto flex items-center px-2 py-1 border border-rose-300 text-xs font-medium rounded-md text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors duration-200"
                >
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
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main
          className={`${
            sidebarCollapsed ? "pl-20" : "pl-72"
          } flex-1 transition-all duration-300`}
        >
          <div className="py-6 px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
