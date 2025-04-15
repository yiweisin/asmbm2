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
import SubscriptionPlan from "@/components/SubscriptionPlan";
import PasswordChange from "@/components/PasswordChange";
import ConnectedPlatforms from "@/components/ConnectedPlatforms";

export default function Profile() {
  const [accounts, setAccounts] = useState({
    twitter: [],
    discord: [],
    telegram: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Account plan configuration
  const accountTypes = {
    basic: {
      title: "Basic",
      description: "For influencers and content creators",
      features: [
        "Connect up to 3 social accounts",
        "Basic scheduling",
        "Analytics dashboard",
      ],
      limit: 3,
    },
    business: {
      title: "Business",
      description: "For small business owners",
      features: [
        "Connect up to 10 social accounts",
        "Advanced scheduling",
        "Detailed analytics",
        "Content suggestions",
      ],
      limit: 10,
    },
    premium: {
      title: "Premium",
      description: "For social media managers",
      features: [
        "Unlimited social accounts",
        "Team collaboration",
        "Advanced analytics",
        "API access",
        "Priority support",
      ],
      limit: "Unlimited",
    },
  };

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
          [service]: [],
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

  const upgradePlan = async (selectedPlan) => {
    try {
      const response = await authService.updateAccountType(selectedPlan);
      setUser(response.user);
      localStorage.setItem("user", JSON.stringify(response.user));
      toast.success(
        `Successfully upgraded to ${accountTypes[selectedPlan].title} plan`
      );
      return true;
    } catch (error) {
      toast.error(error.error || "Failed to upgrade plan");
      return false;
    }
  };

  const getTotalAccountsCount = () => {
    return (
      accounts.twitter.length +
      accounts.discord.length +
      accounts.telegram.length
    );
  };

  const getAccountLimit = () => {
    const currentType = user?.accountType || "basic";
    return accountTypes[currentType].limit;
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
          {/* Profile Details at the top as requested */}
          <ProfileDetails
            user={user}
            onSave={saveProfileChanges}
            accountTypes={accountTypes}
            totalAccountsCount={getTotalAccountsCount()}
            accountLimit={getAccountLimit()}
          />

          <SubscriptionPlan
            user={user}
            accountTypes={accountTypes}
            onUpgrade={upgradePlan}
            totalAccountsCount={getTotalAccountsCount()}
            accountLimit={getAccountLimit()}
          />

          <PasswordChange onChangePassword={changePassword} />

          <ConnectedPlatforms
            accounts={accounts}
            onDisconnect={disconnectAccount}
          />
        </div>
      )}
    </div>
  );
}
