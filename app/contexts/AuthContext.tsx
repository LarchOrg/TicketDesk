import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "~/lib/supabaseClient";
import type { Profile } from "~/lib/types";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Fetch user profile from database
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }

      return data as Profile;
    } catch (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
  };

  // Initialize auth state ONCE
  useEffect(() => {
    // Skip if already initialized
    if (initialized) return;

    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log("🔐 Initializing authentication...");

        // Get initial session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (mounted) {
          if (session?.user) {
            console.log("✅ User session found:", session.user.email);
            setUser(session.user);
            const userProfile = await fetchProfile(session.user.id);
            setProfile(userProfile);
          } else {
            console.log("❌ No user session found");
            setUser(null);
            setProfile(null);
          }
          setLoading(false);
          setInitialized(true);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes (login/logout only)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔄 Auth state changed:", event);

      // Only update on actual auth events, not on token refresh
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED"
      ) {
        if (mounted) {
          if (session?.user) {
            console.log("✅ User signed in:", session.user.email);
            setUser(session.user);
            const userProfile = await fetchProfile(session.user.id);
            setProfile(userProfile);
          } else {
            console.log("❌ User signed out");
            setUser(null);
            setProfile(null);
          }
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [initialized]);

  // Sign out function
  const signOut = async () => {
    try {
      console.log("🚪 Signing out...");
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  // Refresh session function
  const refreshSession = async () => {
    try {
      console.log("🔄 Refreshing session...");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);
        const userProfile = await fetchProfile(session.user.id);
        setProfile(userProfile);
      }
    } catch (error) {
      console.error("Error refreshing session:", error);
    }
  };

  const value = {
    user,
    profile,
    loading,
    signOut,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
