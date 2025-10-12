import { AlertCircle, CheckCircle, Eye, EyeOff, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { supabase } from "~/lib/supabaseClient";
import type { Route } from "./+types/reset-password";

// Types
interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

// Constants
const VALIDATION_RULES = {
  MIN_PASSWORD_LENGTH: 6,
} as const;

// Utility functions
function validatePassword(password: string): string | null {
  if (!password) {
    return "Password is required";
  }
  if (password.length < VALIDATION_RULES.MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${VALIDATION_RULES.MIN_PASSWORD_LENGTH} characters`;
  }
  return null;
}

function validatePasswordConfirmation(
  password: string,
  confirmPassword: string
): string | null {
  if (!confirmPassword) {
    return "Please confirm your password";
  }
  if (password !== confirmPassword) {
    return "Passwords do not match";
  }
  return null;
}

function validateResetForm(formData: ResetPasswordFormData): string | null {
  const passwordError = validatePassword(formData.password);
  if (passwordError) return passwordError;

  const confirmPasswordError = validatePasswordConfirmation(
    formData.password,
    formData.confirmPassword
  );
  if (confirmPasswordError) return confirmPasswordError;

  return null;
}

// Meta function
export function meta({}: Route.MetaArgs) {
  return [
    { title: "Reset Password - HelpDesk" },
    {
      name: "description",
      content: "Create a new password for your HelpDesk account",
    },
  ];
}

// Component: Error Display
function ErrorDisplay({ error }: { error: string }) {
  return (
    <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span>{error}</span>
    </div>
  );
}

// Component: Success Display
function SuccessDisplay({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
      <CheckCircle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// Component: Password Input
function PasswordInput({
  id,
  name,
  value,
  onChange,
  placeholder,
  required,
  disabled,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
        aria-label={showPassword ? "Hide password" : "Show password"}
        disabled={disabled}
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

// Component: Reset Password Form
function ResetPasswordForm({
  formData,
  error,
  success,
  loading,
  onSubmit,
  onChange,
}: {
  formData: ResetPasswordFormData;
  error: string;
  success: string;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <ErrorDisplay error={error} />}
      {success && <SuccessDisplay message={success} />}

      <div className="space-y-2">
        <Label htmlFor="password">New Password</Label>
        <PasswordInput
          id="password"
          name="password"
          value={formData.password}
          onChange={onChange}
          placeholder="Enter your new password"
          required
          disabled={loading || !!success}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={onChange}
          placeholder="Confirm your new password"
          required
          disabled={loading || !!success}
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading || !!success}>
        {loading ? "Updating Password..." : "Update Password"}
      </Button>
    </form>
  );
}

// Custom hook for reset password logic
function useResetPassword() {
  const [formData, setFormData] = useState<ResetPasswordFormData>({
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check if we have valid reset tokens on mount
  useEffect(() => {
    const checkTokens = async () => {
      const accessToken = searchParams.get("access_token");
      const refreshToken = searchParams.get("refresh_token");
      const type = searchParams.get("type");
      const code = searchParams.get("code");

      // Handle PKCE flow (newer Supabase Auth)
      if (code) {
        try {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            throw exchangeError;
          }

          setIsValidToken(true);
          return;
        } catch (err: any) {
          console.error("Code exchange error:", err);
          setIsValidToken(false);
          setError(
            "Invalid or expired reset link. Please request a new password reset."
          );
          return;
        }
      }

      // Handle legacy flow (older Supabase Auth)
      if (!accessToken || !refreshToken || type !== "recovery") {
        setIsValidToken(false);
        setError(
          "Invalid or expired reset link. Please request a new password reset."
        );
        return;
      }

      try {
        // Set the session with the tokens from the URL
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          throw sessionError;
        }

        setIsValidToken(true);
      } catch (err: any) {
        console.error("Token validation error:", err);
        setIsValidToken(false);
        setError(
          "Invalid or expired reset link. Please request a new password reset."
        );
      }
    };

    checkTokens();
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
    if (success) setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Client-side validation
    const validationError = validateResetForm(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess("Password updated successfully! Redirecting to login...");

      // Sign out the user and redirect to login after a delay
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate("/login");
      }, 2000);
    } catch (err: any) {
      console.error("Password update error:", err);

      let errorMessage = "An error occurred while updating your password";

      if (err.message?.includes("New password should be different")) {
        errorMessage =
          "New password must be different from your current password";
      } else if (err.message?.includes("Password should be at least")) {
        errorMessage = "Password does not meet security requirements";
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    error,
    success,
    loading,
    isValidToken,
    handleChange,
    handleSubmit,
  };
}

// Main component
export default function ResetPasswordPage() {
  const {
    formData,
    error,
    success,
    loading,
    isValidToken,
    handleChange,
    handleSubmit,
  } = useResetPassword();

  // Show loading state while checking token validity
  if (isValidToken === null) {
    return (
      <div className="flex min-h-screen bg-background">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">
                    Validating reset link...
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Show error state for invalid tokens
  if (isValidToken === false) {
    return (
      <div className="flex min-h-screen bg-background">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <CardTitle className="text-2xl font-bold">
                  Invalid Reset Link
                </CardTitle>
                <CardDescription>
                  This password reset link is invalid or has expired
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ErrorDisplay error={error} />
                <div className="mt-6 text-center">
                  <Link
                    to="/forgot-password"
                    className="font-medium text-primary hover:underline"
                  >
                    Request a new password reset
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">
                Reset Password
              </CardTitle>
              <CardDescription>Enter your new password below</CardDescription>
            </CardHeader>
            <CardContent>
              <ResetPasswordForm
                formData={formData}
                error={error}
                success={success}
                loading={loading}
                onSubmit={handleSubmit}
                onChange={handleChange}
              />

              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">
                  Remember your password?{" "}
                </span>
                <Link
                  to="/login"
                  className="font-medium text-primary hover:underline"
                >
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
