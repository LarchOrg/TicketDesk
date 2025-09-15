import { AlertCircle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "~/auth";
import { AuthGuard } from "~/components/AuthGuard";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { supabase } from "~/lib/supabaseClient";
import type { Route } from "./+types/login";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Login - TicketDesk" },
    { name: "description", content: "Sign in to your account" },
  ];
}

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshSession } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    console.log("🚀 Starting login for:", formData.email);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

      if (authError) {
        console.error("❌ Login error:", authError);
        setError(authError.message);
        return;
      }

      if (!authData.session) {
        setError("Failed to establish session");
        return;
      }

      console.log("✅ Login successful for:", authData.user.email);
      console.log("🍪 Session stored in cookies");

      // The session is now automatically stored in cookies by the Supabase client
      // Refresh the auth context and redirect
      await refreshSession();
      console.log("🎉 Redirecting to dashboard...");
      navigate("/dashboard");
    } catch (error) {
      console.error("❌ Login exception:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <AuthGuard requireAuth={false}>
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
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium">
                      Password
                    </label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : "Sign in"}
                  </Button>
                </form>

                <div className="mt-6 text-center text-sm">
                  <span className="text-muted-foreground">
                    Don't have an account?{" "}
                  </span>
                  <a
                    href="/signup"
                    className="font-medium text-primary hover:underline"
                  >
                    Sign up
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
