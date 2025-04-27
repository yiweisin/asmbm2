"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authService } from "@/services/api";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    accountType: "individual", // Default to individual
  });
  const [errors, setErrors] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    accountType: "",
    general: "",
  });
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const accountTypes = [
    {
      id: "individual",
      title: "Individual",
      description: "For personal use and individual creators",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-blue-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
      features: [
        "Manage your social media accounts",
        "Schedule posts",
        "Analytics dashboard",
      ],
    },
    {
      id: "admin",
      title: "Business",
      description: "For businesses and agencies",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-indigo-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ),
      features: [
        "All individual features",
        "Create and manage subaccounts",
        "Team collaboration",
      ],
    },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing in the field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      accountType: "",
      general: "",
    });
    setSuccess(false);

    // Validate password length
    if (formData.password.length < 8) {
      setErrors((prev) => ({
        ...prev,
        password: "Password must be at least 8 characters long",
      }));
      setIsLoading(false);
      return;
    }

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: "Passwords do not match",
      }));
      setIsLoading(false);
      return;
    }

    try {
      await authService.register(
        formData.username,
        formData.email,
        formData.password,
        formData.accountType
      );

      // Show success message
      setSuccess(true);
      toast.success("Registration successful! Redirecting to login...");

      // Redirect after a short delay to allow the user to see the success message
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error) {
      console.error("Registration error:", error);

      // Check different possible error formats
      const errorMessage =
        error.error ||
        error.response?.data?.error ||
        (typeof error === "string"
          ? error
          : "Registration failed. Please try again.");

      // Log the exact error message to help debug
      console.log("Error message received:", errorMessage);

      // Handle specific error messages
      if (errorMessage.toLowerCase().includes("username is already taken")) {
        setErrors((prev) => ({
          ...prev,
          username: "This username is already taken",
        }));
      } else if (
        errorMessage.toLowerCase().includes("email is already in use")
      ) {
        setErrors((prev) => ({
          ...prev,
          email: "This email is already registered",
        }));
      } else {
        // For any other errors, show as general error
        setErrors((prev) => ({
          ...prev,
          general: errorMessage,
        }));
      }

      // Always set isLoading to false to prevent button from staying in loading state
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-br from-purple-300/20 to-indigo-300/20 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-gradient-to-tr from-blue-300/20 to-cyan-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-2/3 right-1/2 w-96 h-96 bg-gradient-to-br from-pink-300/20 to-purple-300/20 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      <div className="max-w-3xl w-full z-10 space-y-8">
        <div className="text-center">
          {/* Logo */}
          <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </div>

          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Create Your Account
          </h2>
          <p className="mt-3 text-center text-gray-600">
            Sign up today to start managing your social media presence
          </p>
          <div className="flex justify-center mt-2">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                Sign in here →
              </Link>
            </p>
          </div>
        </div>

        <div className="bg-white py-8 px-10 shadow-xl rounded-2xl border border-gray-100 backdrop-blur-sm bg-white/80">
          {success && (
            <div className="rounded-xl bg-emerald-50 p-5 mb-6 border border-emerald-100 flex items-start">
              <div className="flex-shrink-0 bg-emerald-100 rounded-full p-2">
                <svg
                  className="h-6 w-6 text-emerald-600"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-emerald-800">
                  Registration successful!
                </h3>
                <div className="mt-2 text-sm text-emerald-700">
                  <p>
                    Your account has been created. Redirecting to login page...
                  </p>
                </div>
              </div>
            </div>
          )}

          {errors.general && (
            <div className="rounded-xl bg-rose-50 p-5 mb-6 border border-rose-100 flex items-start">
              <div className="flex-shrink-0 bg-rose-100 rounded-full p-2">
                <svg
                  className="h-6 w-6 text-rose-600"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-rose-800">
                  Registration failed
                </h3>
                <p className="mt-1 text-sm text-rose-700">{errors.general}</p>
              </div>
            </div>
          )}

          <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    className={`appearance-none block w-full pl-10 px-3 py-3 border ${
                      errors.username
                        ? "border-rose-300 text-rose-900 placeholder-rose-300 focus:outline-none focus:ring-rose-500 focus:border-rose-500"
                        : "border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    } rounded-xl shadow-sm focus:outline-none focus:ring-2 transition-all duration-200 sm:text-sm`}
                    placeholder="Choose a username"
                    value={formData.username}
                    onChange={handleChange}
                    aria-invalid={errors.username ? "true" : "false"}
                    aria-describedby={
                      errors.username ? "username-error" : undefined
                    }
                  />
                </div>
                {errors.username && (
                  <p className="mt-2 text-sm text-rose-600" id="username-error">
                    {errors.username}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className={`appearance-none block w-full pl-10 px-3 py-3 border ${
                      errors.email
                        ? "border-rose-300 text-rose-900 placeholder-rose-300 focus:outline-none focus:ring-rose-500 focus:border-rose-500"
                        : "border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    } rounded-xl shadow-sm focus:outline-none focus:ring-2 transition-all duration-200 sm:text-sm`}
                    placeholder="Your email address"
                    value={formData.email}
                    onChange={handleChange}
                    aria-invalid={errors.email ? "true" : "false"}
                    aria-describedby={errors.email ? "email-error" : undefined}
                  />
                </div>
                {errors.email && (
                  <p className="mt-2 text-sm text-rose-600" id="email-error">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength="8"
                    className={`appearance-none block w-full pl-10 px-3 py-3 border ${
                      errors.password
                        ? "border-rose-300 text-rose-900 placeholder-rose-300 focus:outline-none focus:ring-rose-500 focus:border-rose-500"
                        : "border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    } rounded-xl shadow-sm focus:outline-none focus:ring-2 transition-all duration-200 sm:text-sm`}
                    placeholder="Create a password (min. 8 characters)"
                    value={formData.password}
                    onChange={handleChange}
                    aria-invalid={errors.password ? "true" : "false"}
                    aria-describedby={
                      errors.password ? "password-error" : undefined
                    }
                  />
                </div>
                {errors.password && (
                  <p className="mt-2 text-sm text-rose-600" id="password-error">
                    {errors.password}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Must be at least 8 characters long
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength="8"
                    className={`appearance-none block w-full pl-10 px-3 py-3 border ${
                      errors.confirmPassword
                        ? "border-rose-300 text-rose-900 placeholder-rose-300 focus:outline-none focus:ring-rose-500 focus:border-rose-500"
                        : "border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    } rounded-xl shadow-sm focus:outline-none focus:ring-2 transition-all duration-200 sm:text-sm`}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    aria-invalid={errors.confirmPassword ? "true" : "false"}
                    aria-describedby={
                      errors.confirmPassword
                        ? "confirm-password-error"
                        : undefined
                    }
                  />
                </div>
                {errors.confirmPassword && (
                  <p
                    className="mt-2 text-sm text-rose-600"
                    id="confirm-password-error"
                  >
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-8">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Account Type
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {accountTypes.map((type) => (
                  <div
                    key={type.id}
                    className={`relative rounded-xl border-2 ${
                      formData.accountType === type.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    } p-5 cursor-pointer transition-all duration-200 shadow-sm hover:shadow`}
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, accountType: type.id }))
                    }
                  >
                    <div className="absolute top-4 right-4">
                      <div
                        className={`h-5 w-5 rounded-full flex items-center justify-center ${
                          formData.accountType === type.id
                            ? "bg-blue-500 border-2 border-blue-200"
                            : "border-2 border-gray-300"
                        }`}
                      >
                        {formData.accountType === type.id && (
                          <div className="h-2 w-2 rounded-full bg-white"></div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start mb-4">
                      <div
                        className={`${
                          formData.accountType === type.id
                            ? "text-blue-600"
                            : "text-gray-500"
                        }`}
                      >
                        {type.icon}
                      </div>
                      <div className="ml-4">
                        <label
                          htmlFor={`account-type-${type.id}`}
                          className={`font-bold text-lg ${
                            formData.accountType === type.id
                              ? "text-blue-800"
                              : "text-gray-800"
                          }`}
                        >
                          {type.title}
                        </label>
                        <p
                          className={`text-sm ${
                            formData.accountType === type.id
                              ? "text-blue-700"
                              : "text-gray-600"
                          }`}
                        >
                          {type.description}
                        </p>
                      </div>
                    </div>

                    <ul className="space-y-2 mt-2">
                      {type.features.map((feature, index) => (
                        <li
                          key={index}
                          className={`flex items-center text-sm ${
                            formData.accountType === type.id
                              ? "text-blue-700"
                              : "text-gray-600"
                          }`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-4 w-4 mr-2 ${
                              formData.accountType === type.id
                                ? "text-blue-500"
                                : "text-gray-400"
                            }`}
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
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <input
                      id={`account-type-${type.id}`}
                      name="accountType"
                      type="radio"
                      className="sr-only"
                      checked={formData.accountType === type.id}
                      onChange={handleChange}
                      value={type.id}
                    />
                  </div>
                ))}
              </div>
              {errors.accountType && (
                <p
                  className="mt-2 text-sm text-rose-600"
                  id="account-type-error"
                >
                  {errors.accountType}
                </p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || success}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Creating account...
                  </div>
                ) : success ? (
                  <div className="flex items-center">
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
                    Account created!
                  </div>
                ) : (
                  <div className="flex items-center">
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
                        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                      />
                    </svg>
                    Create account
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
