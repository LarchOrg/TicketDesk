import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "~/lib/supabaseClient";
import type { Profile } from "~/lib/types";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  refreshProfile: () => Promise<void>; // Add this
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

  const initialized = useRef(false);
  const profileCache = useRef<{ [userId: string]: Profile }>({});

  const fetchProfile = async (userId: string, forceRefresh = false) => {
    try {
      if (!forceRefresh && profileCache.current[userId]) {
        return profileCache.current[userId];
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }

      if (data) {
        profileCache.current[userId] = data as Profile;
      }

      return data as Profile;
    } catch (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
  };

  useEffect(() => {
    if (initialized.current) return;

    let mounted = true;

    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          const userProfile = await fetchProfile(session.user.id);
          if (mounted) {
            setProfile(userProfile);
          }
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error("Error initializing auth:", err);
      } finally {
        if (mounted) {
          setLoading(false);
          initialized.current = true;
        }
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change:", event, session?.user?.id);

      // Only handle significant auth events
      if (event === "SIGNED_IN") {
        if (session?.user) {
          setUser(session.user);
          const userProfile = await fetchProfile(session.user.id);
          setProfile(userProfile);
        }
        setLoading(false);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        // Clear profile cache on sign out
        profileCache.current = {};
        setLoading(false);
      } else if (event === "TOKEN_REFRESHED") {
        // Don't refetch profile on token refresh, just update user
        if (session?.user) {
          setUser(session.user);
        }
      }
      // Ignore other events like USER_UPDATED to prevent unnecessary re-renders
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array - only run once

  // Sign out function
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      // Clear profile cache
      profileCache.current = {};
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };
  const refreshProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error refreshing profile:", error);
    }
  };

  const refreshSession = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);
        // Force refresh profile when explicitly requested
        const userProfile = await fetchProfile(session.user.id, true);
        setProfile(userProfile);
      } else {
        setUser(null);
        setProfile(null);
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
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
