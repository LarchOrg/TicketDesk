import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Edit3,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Save,
  Shield,
  UserCheck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
import { Separator } from "~/components/ui/separator";
import { useAuth } from "~/contexts/AuthContext";
import { getRoleColor, getRoleDisplayName } from "~/lib/role-utils";
import { supabase } from "~/lib/supabaseClient";
import type { Route } from "./+types/profile";

// Types
interface ProfileFormData {
  name: string;
  email: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Constants
const VALIDATION_RULES = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  MIN_PASSWORD_LENGTH: 6,
} as const;

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
  if (password !== confirmPassword) {
    return "Passwords do not match";
  }
  return null;
}

// Meta function
export function meta({}: Route.MetaArgs) {
  return [
    { title: "Profile - HelpDesk" },
    {
      name: "description",
      content: "Manage your profile and account settings",
    },
  ];
}

// Component: Error Display
function ErrorDisplay({ error }: { error: string }) {
  return (
    <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span>{error}</span>
    </div>
  );
}

// Component: Success Display
function SuccessDisplay({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 p-3 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
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
        className="pr-10 cursor-pointer"
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50 cursor-pointer transition-colors"
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

function ProfileHeader({ user, profile }: { user: any; profile: any }) {
  const userRole = profile?.role as "admin" | "agent" | "user" | undefined;
  const joinDate = new Date(
    profile?.created_at || user?.created_at
  ).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email?.charAt(0)?.toUpperCase() || "U";
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="w-4 h-4" />;
      case "agent":
        return <UserCheck className="w-4 h-4" />;
      default:
        return <UserCheck className="w-4 h-4" />;
    }
  };

  const getRoleGradient = (role: string) => {
    switch (role) {
      case "admin":
        return "from-red-500 to-red-600";
      case "agent":
        return "from-primary to-primary/80";
      default:
        return "from-green-500 to-green-600";
    }
  };

  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      {/* Simple Background */}
      <CardContent className="px-6 pb-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-end gap-6">
          {/* Avatar Section */}
          <div className="flex-shrink-0">
            <div
              className={`w-28 h-28 bg-gradient-to-br ${getRoleGradient(userRole || "user")} rounded-2xl flex items-center justify-center shadow-2xl border-4 border-white dark:border-gray-800 transform hover:scale-105 transition-transform duration-200`}
            >
              <span className="text-5xl font-bold text-white">
                {getInitials(profile?.name, user?.email)}
              </span>
            </div>
          </div>

          {/* User Info Section */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Name and Role */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground truncate">
                  {profile?.name || user?.email?.split("@")[0] || "User"}
                </h1>
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${getRoleColor(userRole || "user")} shadow-sm`}
                >
                  {getRoleIcon(userRole || "user")}
                  {getRoleDisplayName(userRole || "user")}
                </div>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{user?.email}</span>
              </div>
            </div>

            {/* Stats Row */}
            <div className="flex flex-wrap gap-6 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-muted-foreground">Active</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Joined {joinDate}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-muted-foreground">Verified</span>
              </div>
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}

// Component: Profile Form
function ProfileForm({
  formData,
  error,
  success,
  loading,
  hasChanges,
  onSubmit,
  onChange,
}: {
  formData: ProfileFormData;
  error: string;
  success: string;
  loading: boolean;
  hasChanges: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit3 className="w-5 h-5" />
          Personal Information
        </CardTitle>
        <CardDescription>
          Update your personal details and profile information Update your name
          and personal details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          {error && <ErrorDisplay error={error} />}
          {success && <SuccessDisplay message={success} />}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Full Name *
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={onChange}
                placeholder="Enter your full name"
                required
                disabled={loading}
                className="cursor-pointer transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                placeholder="Enter your email"
                disabled={true}
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed. Contact support if you need to update
                your email.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={loading || !hasChanges}
              className="cursor-pointer px-6 transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Component: Password Change Form
function PasswordChangeForm({
  formData,
  error,
  success,
  loading,
  hasChanges,
  onSubmit,
  onChange,
}: {
  formData: PasswordFormData;
  error: string;
  success: string;
  loading: boolean;
  hasChanges: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Change Password
        </CardTitle>
        <CardDescription>
          Update your password to keep your account secure. Use a strong
          password with at least 6 characters.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          {error && <ErrorDisplay error={error} />}
          {success && <SuccessDisplay message={success} />}

          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-sm font-medium">
              Current Password *
            </Label>
            <PasswordInput
              id="currentPassword"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={onChange}
              placeholder="Enter your current password"
              required
              disabled={loading}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-medium">
                New Password *
              </Label>
              <PasswordInput
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={onChange}
                placeholder="Enter your new password"
                required
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Minimum {VALIDATION_RULES.MIN_PASSWORD_LENGTH} characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm New Password *
              </Label>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={onChange}
                placeholder="Confirm your new password"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={loading || !hasChanges}
              className="cursor-pointer px-6 transition-colors"
            >
              <Lock className="w-4 h-4 mr-2" />
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Custom hooks
function useProfileForm() {
  const { user, profile, refreshProfile } = useAuth();
  const [formData, setFormData] = useState<ProfileFormData>({
    name: "",
    email: "",
  });
  const [initialData, setInitialData] = useState<ProfileFormData>({
    name: "",
    email: "",
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile && user) {
      const data = { name: profile.name || "", email: user.email || "" };
      setFormData(data);
      setInitialData(data);
      setHasChanges(false);
    }
  }, [profile, user]);

  const checkForChanges = useCallback(() => {
    const changed =
      formData.name.trim() !== initialData.name.trim() ||
      formData.email.trim() !== initialData.email.trim();
    setHasChanges(changed);
  }, [formData.name, formData.email, initialData.name, initialData.email]);

  useEffect(() => {
    checkForChanges();
  }, [checkForChanges]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value } = target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
    if (success) setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges || loading) return;

    setError("");
    setSuccess("");

    const nameError = validateName(formData.name);
    if (nameError) {
      setError(nameError);
      return;
    }

    setLoading(true);

    try {
      const trimmedName = formData.name.trim();
      
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          name: trimmedName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user?.id);

      if (updateError) {
        throw updateError;
      }

      const updatedData = { ...formData, name: trimmedName };
      setInitialData(updatedData);
      setFormData(updatedData);
      setHasChanges(false);
      
      if (refreshProfile) {
        await refreshProfile();
      }

      setSuccess("Profile updated successfully!");
      
      setTimeout(() => setSuccess(""), 3000);

    } catch (err: any) {
      console.error("Profile update error:", err);
      setError(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    error,
    success,
    loading,
    hasChanges,
    handleChange,
    handleSubmit,
  };
}

function usePasswordForm() {
  const { user } = useAuth();
  const [formData, setFormData] = useState<PasswordFormData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const changed = Object.values(formData).some((v) => v.trim() !== "");
    setHasChanges(changed);
  }, [formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
    if (success) setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) return;
    setError("");
    setSuccess("");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email!,
      password: formData.currentPassword,
    });

    if (signInError) {
      setError("Incorrect current password. Please try again.");
      return
    }
    const currentPasswordError = validatePassword(formData.currentPassword);
    if (currentPasswordError) {
      setError("Current " + currentPasswordError.toLowerCase());
      return;
    }

    const newPasswordError = validatePassword(formData.newPassword);
    if (newPasswordError) {
      setError("New " + newPasswordError.toLowerCase());
      return;
    }

    const confirmPasswordError = validatePasswordConfirmation(
      formData.newPassword,
      formData.confirmPassword
    );
    if (confirmPasswordError) {
      setError(confirmPasswordError);
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError("New password must be different from current password");
      return;
    }

    setLoading(true);

    try {
      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess("Password updated successfully!");
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setHasChanges(false);
    } catch (err: any) {
      console.error("Password update error:", err);
      setError(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    error,
    success,
    loading,
    hasChanges,
    handleChange,
    handleSubmit,
  };
}

// Main component
export default function ProfilePage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const profileForm = useProfileForm();
  const passwordForm = usePasswordForm();

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  if (!user || !profile) {
    return (
      <div className="flex min-h-screen bg-background">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Page Header */}
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="cursor-pointer hover:bg-muted p-2 rounded-lg transition-colors"
              title="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Profile Settings
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage your account settings and preferences
              </p>
            </div>
          </div>

          {/* Profile Header */}
          <ProfileHeader user={user} profile={profile} />

          {/* Profile Form */}
          <ProfileForm
            formData={profileForm.formData}
            error={profileForm.error}
            success={profileForm.success}
            loading={profileForm.loading}
            hasChanges={profileForm.hasChanges}
            onSubmit={profileForm.handleSubmit}
            onChange={profileForm.handleChange}
          />

          {/* Password Change Form */}
          <PasswordChangeForm
            formData={passwordForm.formData}
            error={passwordForm.error}
            success={passwordForm.success}
            loading={passwordForm.loading}
            hasChanges={passwordForm.hasChanges}
            onSubmit={passwordForm.handleSubmit}
            onChange={passwordForm.handleChange}
          />
        </div>
      </div>
    </div>
  );
}
