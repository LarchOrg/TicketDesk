import type { Session, User } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Profile = {
  id: string;
  name?: string;
  email: string;
  role?: string;
  created_at: string;
  updated_at?: string;
};

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Auth Provider Component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Load user profile
  const loadProfile = async (userId: string) => {
    try {
      console.log("Loading profile for user:", userId);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading profile:", error);
        return;
      }

      console.log("Profile loaded:", data);
      setProfile(data || null);
    } catch (error) {
      console.error("Profile loading exception:", error);
      setProfile(null);
    }
  };

  // Refresh session
  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Session refresh error:", error);
        setUser(null);
        setProfile(null);
        setSession(null);
        return;
      }

      if (data.session) {
        setUser(data.session.user);
        setSession(data.session);
        await loadProfile(data.session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setSession(null);
      }
    } catch (error) {
      console.error("Session refresh exception:", error);
      setUser(null);
      setProfile(null);
      setSession(null);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setSession(null);
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initialize auth and listen for changes
  useEffect(() => {
    let mounted = true;

    // Skip if already initialized
    if (initialized) return;

    // Get initial session
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error("Initial session error:", error);
        } else if (session) {
          setUser(session.user);
          setSession(session);
          await loadProfile(session.user.id);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      switch (event) {
        case "SIGNED_IN":
        case "TOKEN_REFRESHED":
          if (session) {
            setUser(session.user);
            setSession(session);
            await loadProfile(session.user.id);
          }
          setLoading(false);
          break;
        case "SIGNED_OUT":
          setUser(null);
          setProfile(null);
          setSession(null);
          setLoading(false);
          break;
        default:
          setLoading(false);
          break;
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [initialized]); // Add initialized as dependency

  const value = {
    user,
    profile,
    session,
    loading,
    signOut,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
