import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useAuth } from "~/contexts/AuthContext";
import { supabase } from "~/lib/supabaseClient";
import { createServices } from "~/services";
import type { Route } from "./+types/signup";

// Types
interface SignupFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: "user" | "agent" | "admin";
}

interface ValidationErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  role?: string;
}

// Constants
const VALIDATION_RULES = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  MIN_PASSWORD_LENGTH: 6,
  MAX_PASSWORD_LENGTH: 128,
} as const;

const DEFAULT_ROLE = "user" as const;

// Utility functions
function validateName(name: string): string | null {
  if (!name.trim()) {
    return "Name is required";
  }
  if (name.trim().length < VALIDATION_RULES.NAME_MIN_LENGTH) {
    return `Name must be at least ${VALIDATION_RULES.NAME_MIN_LENGTH} characters`;
  }
  if (name.trim().length > VALIDATION_RULES.NAME_MAX_LENGTH) {
    return `Name must be less than ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`;
  }
  return null;
}

function validateEmail(email: string): string | null {
  if (!email.trim()) {
    return "Email is required";
  }
  if (!VALIDATION_RULES.EMAIL_REGEX.test(email.trim())) {
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
  if (password.length > VALIDATION_RULES.MAX_PASSWORD_LENGTH) {
    return `Password must be less than ${VALIDATION_RULES.MAX_PASSWORD_LENGTH} characters`;
  }
  return null;
}

function validateConfirmPassword(
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

function validateSignupForm(formData: SignupFormData): ValidationErrors {
  const errors: ValidationErrors = {};

  const nameError = validateName(formData.name);
  if (nameError) errors.name = nameError;

  const emailError = validateEmail(formData.email);
  if (emailError) errors.email = emailError;

  const passwordError = validatePassword(formData.password);
  if (passwordError) errors.password = passwordError;

  const confirmPasswordError = validateConfirmPassword(
    formData.password,
    formData.confirmPassword
  );
  if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;

  return errors;
}

// Meta function
export function meta({}: Route.MetaArgs) {
  return [
    { title: "Sign Up - TicketDesk" },
    { name: "description", content: "Create your TicketDesk account" },
  ];
}

// Component: Error Display
function ErrorDisplay({ error }: { error: string }) {
  return (
    <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
      <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
    </div>
  );
}

// Component: Password Input
function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  required,
  showPassword,
  onToggleVisibility,
  error,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  showPassword: boolean;
  onToggleVisibility: () => void;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={error ? "border-red-500 focus:border-red-500" : ""}
        />
        <button
          type="button"
          onClick={onToggleVisibility}
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
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// Component: Form Field
function FormField({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  error,
  helpText,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  error?: string;
  helpText?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={error ? "border-red-500 focus:border-red-500" : ""}
        autoComplete={id === "email" ? "email" : id === "name" ? "name" : "off"}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {helpText && !error && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
}

// Component: Loading Button
function LoadingButton({
  loading,
  children,
}: {
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button type="submit" className="w-full" disabled={loading}>
      {loading ? (
        <div className="flex items-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Creating Account...</span>
        </div>
      ) : (
        children
      )}
    </Button>
  );
}

// Custom hook for signup logic
function useSignup() {
  const [formData, setFormData] = useState<SignupFormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: DEFAULT_ROLE,
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { refreshSession } = useAuth();

  const handleChange = (field: keyof SignupFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setErrors({});

    // Client-side validation
    const validationErrors = validateSignupForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      // Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp(
        {
          email: formData.email.trim(),
          password: formData.password,
          options: {
            data: {
              full_name: formData.name.trim(),
            },
          },
        }
      );

      if (signUpError) {
        throw signUpError;
      }

      if (!authData.user) {
        throw new Error("Failed to create user account");
      }

      // Handle profile creation/update
      const services = createServices(supabase);
      await handleProfileCreation(services, authData.user.id, formData);

      // Refresh session
      await refreshSession();

      // Handle email confirmation
      if (!authData.session) {
        setError(
          "Please check your email and click the confirmation link to complete your registration."
        );
        return;
      }

      // Navigate to dashboard on success
      navigate("/");
    } catch (err: any) {
      console.error("Signup error:", err);

      // Handle specific error types
      let errorMessage = "An error occurred during signup";

      if (err.message?.includes("User already registered")) {
        errorMessage = "An account with this email already exists";
      } else if (err.message?.includes("Password should be at least")) {
        errorMessage =
          "Password is too weak. Please choose a stronger password";
      } else if (err.message?.includes("Invalid email")) {
        errorMessage = "Please enter a valid email address";
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
    errors,
    error,
    loading,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    handleChange,
    handleSubmit,
  };
}

// Helper function for profile creation
async function handleProfileCreation(
  services: any,
  userId: string,
  formData: SignupFormData
): Promise<void> {
  try {
    const existingProfile = await services.users.getUserById(userId);

    if (existingProfile) {
      console.log("Profile already exists, updating with name");
      const updateResult = await services.users.updateUserProfile(userId, {
        name: formData.name.trim(),
      });

      if (!updateResult.success) {
        console.error("Failed to update profile:", updateResult.error);
        throw new Error("Failed to update user profile");
      }
    } else {
      console.log("Creating new user profile");
      const createResult = await services.users.createUserProfile({
        id: userId,
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: DEFAULT_ROLE,
      });

      if (!createResult.success) {
        console.error("Failed to create profile:", createResult.error);
        throw new Error("Failed to create user profile");
      }
    }
  } catch (error) {
    console.error("Profile creation/update error:", error);
    throw error;
  }
}

// Main component
export default function SignupPage() {
  const {
    formData,
    errors,
    error,
    loading,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    handleChange,
    handleSubmit,
  } = useSignup();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Create Account
            </CardTitle>
            <p className="text-sm text-muted-foreground text-center">
              Join TicketDesk to manage support tickets
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <ErrorDisplay error={error} />}

              <FormField
                id="name"
                label="Full Name"
                value={formData.name}
                onChange={(value) => handleChange("name", value)}
                placeholder="Enter your full name"
                required
                error={errors.name}
              />

              <FormField
                id="email"
                label="Email"
                type="email"
                value={formData.email}
                onChange={(value) => handleChange("email", value)}
                placeholder="Enter your email"
                required
                error={errors.email}
              />

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  value={formData.password}
                  onChange={(value) => handleChange("password", value)}
                  placeholder="Enter your password"
                  required
                  showPassword={showPassword}
                  onToggleVisibility={() => setShowPassword(!showPassword)}
                  error={errors.password}
                />
                {!errors.password && (
                  <p className="text-xs text-muted-foreground">
                    Must be at least {VALIDATION_RULES.MIN_PASSWORD_LENGTH}{" "}
                    characters
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <PasswordInput
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={(value) => handleChange("confirmPassword", value)}
                  placeholder="Confirm your password"
                  required
                  showPassword={showConfirmPassword}
                  onToggleVisibility={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  error={errors.confirmPassword}
                />
              </div>

              <LoadingButton loading={loading}>Create Account</LoadingButton>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="font-medium text-primary hover:underline"
                  >
                    Sign in here
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
