"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { Input } from "@openai/apps-sdk-ui/components/Input";
import { Alert } from "@openai/apps-sdk-ui/components/Alert";
import { ShieldCheck } from "@openai/apps-sdk-ui/components/Icon";

export default function LoginForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    console.log("Login page loaded. OAuth Parameters:", {
      client_id: searchParams.get("client_id"),
      response_type: searchParams.get("response_type"),
      redirect_uri: searchParams.get("redirect_uri"),
      state: searchParams.get("state"),
      scope: searchParams.get("scope"),
      code_challenge: searchParams.get("code_challenge"),
      code_challenge_method: searchParams.get("code_challenge_method"),
      resource: searchParams.get("resource"),
    });
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;
      const name = formData.get("name") as string;

      console.log("Submitting form data:", {
        email,
        password: password ? "***" : undefined,
        name,
        showSignup
      });

      const endpoint = showSignup ? "/api/auth/sign-up/email" : "/api/auth/sign-in/email";

      // Build the request body
      const body: Record<string, string> = {
        email,
        password,
      };

      // Add name for signup (required by Better Auth)
      if (showSignup) {
        body.name = name || email.split("@")[0]; // Default to email prefix if no name
      }

      // Don't pass callbackURL to Better Auth - we'll handle the OAuth redirect manually
      // This prevents Better Auth from redirecting directly to ChatGPT without going through /authorize

      console.log("Sending request to:", endpoint, "with body:", { ...body, password: "***" });

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        credentials: "include",
        redirect: "manual", // Don't follow redirects automatically - prevents CORS errors
      });

      console.log("Response status:", response.status, "type:", response.type);

      // Check if this is an OAuth flow (has client_id parameter)
      const isOAuthFlow = searchParams.has("client_id");
      const oauthAuthorizeUrl = isOAuthFlow
        ? `/api/auth/mcp/authorize?${searchParams.toString()}`
        : null;

      // Handle opaque redirects (status 0, type 'opaqueredirect')
      // This happens when redirect: 'manual' is set and server returns a 3xx redirect
      if (response.type === "opaqueredirect") {
        console.log("Opaque redirect detected - Better Auth tried to redirect");
        // Since we didn't pass callbackURL, Better Auth shouldn't be redirecting
        // This likely means there was an error or unexpected behavior
        // Proceed to handle OAuth flow manually
        if (oauthAuthorizeUrl) {
          console.log("Redirecting to OAuth authorize:", oauthAuthorizeUrl);
          window.location.href = oauthAuthorizeUrl;
        } else {
          window.location.reload();
        }
        return;
      }

      // Handle explicit redirects (3xx status codes)
      if (response.status >= 300 && response.status < 400) {
        const redirectUrl = response.headers.get("Location");
        if (redirectUrl) {
          console.log("Server redirect to:", redirectUrl);
          window.location.href = redirectUrl;
          return;
        }
      }

      // For non-redirect responses, parse JSON
      const data = await response.json().catch(() => ({}));
      console.log("Response data:", data);

      if (!response.ok) {
        throw new Error(data.message || `${showSignup ? "Sign up" : "Sign in"} failed`);
      }

      // Handle successful authentication
      console.log("Authentication successful!");

      if (oauthAuthorizeUrl) {
        // OAuth flow - redirect to authorization endpoint
        console.log("Redirecting to OAuth authorize:", oauthAuthorizeUrl);
        router.push(oauthAuthorizeUrl);
      } else if (data.url) {
        // Better Auth provided a redirect URL
        console.log("Redirecting to:", data.url);
        window.location.href = data.url;
      } else {
        // Regular sign in - redirect to home
        console.log("Redirecting to home");
        router.push("/");
      }
    } catch (err) {
      console.error("Form submission error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center heading-lg text-default">
            {showSignup ? "Create your account" : "Sign in to your account"}
          </h2>
          <p className="mt-2 text-center text-sm text-secondary">
            Continue to AskMyMoney
          </p>
        </div>

        <form
          ref={formRef}
          className="mt-8 space-y-6"
          onSubmit={handleSubmit}
        >
          {error && (
            <Alert
              color="danger"
              description={error}
            />
          )}

          <div className="space-y-4">
            {showSignup && (
              <div>
                <label htmlFor="name" className="sr-only">
                  Full name
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Full name (optional)"
                  disabled={loading}
                  size="lg"
                />
              </div>
            )}
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <Input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="Email address"
                disabled={loading}
                size="lg"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={showSignup ? "new-password" : "current-password"}
                required
                placeholder="Password"
                disabled={loading}
                minLength={8}
                size="lg"
              />
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={loading}
              loading={loading}
              color="primary"
              size="xl"
              block
            >
              {showSignup ? "Sign up" : "Sign in"}
            </Button>
          </div>

          <div className="text-center">
            <Button
              type="button"
              onClick={() => {
                setShowSignup(!showSignup);
                setError("");
                // Reset the form when switching modes
                formRef.current?.reset();
              }}
              variant="ghost"
              color="secondary"
              disabled={loading}
            >
              {showSignup
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </Button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-subtle" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-surface text-secondary flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Connect your financial accounts securely
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
