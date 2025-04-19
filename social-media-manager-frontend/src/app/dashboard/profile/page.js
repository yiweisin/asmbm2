"use client";

import { useState, useEffect } from "react";
import {
  twitterService,
  discordService,
  telegramService,
  authService,
} from "@/services/api";
import toast from "react-hot-toast";
import ProfileDetails from "@/components/ProfileDetails";
import PasswordChange from "@/components/PasswordChange";
import ConnectedPlatforms from "@/components/ConnectedPlatforms";
import SubaccountManager from "@/components/SubaccountManager";

export default function Profile() {
  const [accounts, setAccounts] = useState({
    twitter: [],
    discord: [],
    telegram: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);

        const [twitterAccounts, discordAccounts, telegramAccounts] =
          await Promise.all([
            twitterService.getAccounts(),
            discordService.getAccounts(),
            telegramService.getAccounts(),
          ]);

        setAccounts({
          twitter: twitterAccounts,
          discord: discordAccounts,
          telegram: telegramAccounts,
        });
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load user data");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const disconnectAccount = async (service, accountId) => {
    try {
      let success = false;

      switch (service) {
        case "twitter":
          await twitterService.deleteAccount(accountId);
          success = true;
          break;
        case "discord":
          await discordService.deleteAccount(accountId);
          success = true;
          break;
        case "telegram":
          await telegramService.deleteAccount(accountId);
          success = true;
          break;
      }

      if (success) {
        setAccounts((prev) => ({
          ...prev,
          [service]: prev[service].filter(
            (account) => account.id !== accountId
          ),
        }));
        toast.success(
          `${
            service.charAt(0).toUpperCase() + service.slice(1)
          } account disconnected`
        );
      }
    } catch (error) {
      toast.error("Failed to disconnect account");
    }
  };

  const saveProfileChanges = async (formData) => {
    try {
      const response = await authService.updateProfile(formData);
      setUser(response.user);
      localStorage.setItem("user", JSON.stringify(response.user));
      toast.success("Profile updated successfully");
      return true;
    } catch (error) {
      toast.error(error.error || "Failed to update profile");
      return false;
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await authService.changePassword(currentPassword, newPassword);
      toast.success("Password changed successfully");
      return true;
    } catch (error) {
      toast.error(error.error || "Failed to change password");
      return false;
    }
  };

  return (
    <div>
      <div className="pb-5 border-b border-gray-200 mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Profile Details */}
          <ProfileDetails user={user} onSave={saveProfileChanges} />

          {/* Subaccount Manager (only for admin users) */}
          {user?.accountType === "admin" && <SubaccountManager />}

          {/* Connected Platforms */}
          <ConnectedPlatforms
            accounts={accounts}
            onDisconnect={disconnectAccount}
          />

          {/* Password Change */}
          <PasswordChange onChangePassword={changePassword} />
        </div>
      )}
    </div>
  );
}
