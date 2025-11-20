import { AlertCircle, CheckCircle, Mail } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
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
import type { Route } from "./+types/forgot-password";

// Types
interface ForgotPasswordFormData {
  email: string;
}

// Constants
const VALIDATION_RULES = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

// Utility functions
function validateEmail(email: string): string | null {
  if (!email.trim()) {
    return "Email is required";
  }
  if (!VALIDATION_RULES.EMAIL_REGEX.test(email)) {
    return "Please enter a valid email address";
  }
  return null;
}

// Meta function
export function meta({}: Route.MetaArgs) {
  return [
    { title: "Larch HelpDesk" },
    { name: "description", content: "Reset your HelpDesk account password" },
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

// Component: Forgot Password Form
function ForgotPasswordForm({
  formData,
  error,
  success,
  loading,
  onSubmit,
  onChange,
}: {
  formData: ForgotPasswordFormData;
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
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={onChange}
          placeholder="Enter your email address"
          required
          autoComplete="email"
          disabled={loading || !!success}
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading || !!success}>
        {loading ? "Sending..." : "Send Reset Link"}
      </Button>
    </form>
  );
}

// Custom hook for forgot password logic
function useForgotPassword() {
  const [formData, setFormData] = useState<ForgotPasswordFormData>({
    email: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

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
    const validationError = validateEmail(formData.email);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        formData.email.trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (resetError) {
        throw resetError;
      }

      setSuccess(
        "Password reset link has been sent to your email address. Please check your inbox and follow the instructions to reset your password."
      );
    } catch (err: any) {
      console.error("Password reset error:", err);

      let errorMessage = "An error occurred while sending the reset link";

      if (err.message?.includes("User not found")) {
        errorMessage = "No account found with this email address";
      } else if (err.message?.includes("Email rate limit exceeded")) {
        errorMessage =
          "Too many reset requests. Please wait before trying again";
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
    handleChange,
    handleSubmit,
  };
}

// Main component
export default function ForgotPasswordPage() {
  const { formData, error, success, loading, handleChange, handleSubmit } =
    useForgotPassword();

  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">
                Forgot Password?
              </CardTitle>
              <CardDescription>
                Enter your email address and we'll send you a link to reset your
                password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ForgotPasswordForm
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
