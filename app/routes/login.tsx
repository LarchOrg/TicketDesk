import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
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
import { useAuth } from "~/contexts/AuthContext";
import { supabase } from "~/lib/supabaseClient";
import type { Route } from "./+types/login";

// Types
interface LoginFormData {
  email: string;
  password: string;
}

// Constants
const VALIDATION_RULES = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  MIN_PASSWORD_LENGTH: 6,
} as const;

const ROLE_REDIRECTS = {
  admin: "/",
  agent: "/tickets",
  user: "/tickets",
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

function validatePassword(password: string): string | null {
  if (!password) {
    return "Password is required";
  }
  if (password.length < VALIDATION_RULES.MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${VALIDATION_RULES.MIN_PASSWORD_LENGTH} characters`;
  }
  return null;
}

function validateLoginForm(formData: LoginFormData): string | null {
  const emailError = validateEmail(formData.email);
  if (emailError) return emailError;

  const passwordError = validatePassword(formData.password);
  if (passwordError) return passwordError;

  return null;
}

function getRedirectPath(role: string): string {
  return ROLE_REDIRECTS[role as keyof typeof ROLE_REDIRECTS] || "/";
}

// Meta function
export function meta({}: Route.MetaArgs) {
  return [
    { title: "Login - HelpDesk" },
    { name: "description", content: "Sign in to your HelpDesk account" },
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

// Component: Password Input
function PasswordInput({
  id,
  name,
  value,
  onChange,
  placeholder,
  required,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  required?: boolean;
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
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label={showPassword ? "Hide password" : "Show password"}
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

// Component: Login Form
function LoginForm({
  formData,
  error,
  loading,
  onSubmit,
  onChange,
}: {
  formData: LoginFormData;
  error: string;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <ErrorDisplay error={error} />}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={onChange}
          placeholder="Enter your email"
          required
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          name="password"
          value={formData.password}
          onChange={onChange}
          placeholder="Enter your password"
          required
        />
      </div>

      <Button
        type="submit"
        className="w-full cursor-pointer"
        disabled={loading}
      >
        {loading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}

// Custom hook for login logic
function useLogin() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshSession } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    const validationError = validateLoginForm(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      // Sign in with Supabase
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: formData.email.trim(),
          password: formData.password,
        });

      if (signInError) {
        throw signInError;
      }

      if (!data.user) {
        throw new Error("Login failed - no user data received");
      }

      // Refresh the auth session
      await refreshSession();

      // Fetch user profile to determine redirect
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, name")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        // Default redirect if profile fetch fails
        navigate("/");
        return;
      }

      // Redirect based on user role
      const redirectPath = getRedirectPath(profile.role);
      navigate(redirectPath);
    } catch (err: any) {
      console.error("Login error:", err);

      // Handle specific error types
      let errorMessage = "An error occurred during login";

      if (err.message?.includes("Invalid login credentials")) {
        errorMessage = "Invalid email or password";
      } else if (err.message?.includes("Email not confirmed")) {
        errorMessage = "Please check your email and confirm your account";
      } else if (err.message?.includes("Too many requests")) {
        errorMessage = "Too many login attempts. Please try again later";
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
    loading,
    handleChange,
    handleSubmit,
  };
}

// Main component
export default function LoginPage() {
  const { formData, error, loading, handleChange, handleSubmit } = useLogin();

  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
              <CardDescription>
                Sign in to your account to continue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoginForm
                formData={formData}
                error={error}
                loading={loading}
                onSubmit={handleSubmit}
                onChange={handleChange}
              />

              <div className="mt-6 space-y-4">
                <div className="text-center text-sm">
                  <Link
                    to="/forgot-password"
                    className="font-medium text-primary hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>

                <div className="text-center text-sm">
                  <span className="text-muted-foreground">
                    Don't have an account?{" "}
                  </span>
                  <Link
                    to="/signup"
                    className="font-medium text-primary hover:underline"
                  >
                    Sign up
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
