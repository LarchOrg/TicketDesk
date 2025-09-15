import type { Session, User } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "./lib/supabaseClient";

type Profile = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  created_at: string;
};

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Use refs to track loading states and prevent unnecessary API calls
  const isInitialized = useRef(false);
  const profileCache = useRef<Map<string, Profile>>(new Map());
  const loadingProfile = useRef<string | null>(null);

  // Enhanced logging for debugging
  const logAuthState = useCallback((context: string, data: any) => {
    if (import.meta.env.DEV) {
      console.log(`🔐 [${context}]`, {
        hasUser: !!data.user,
        hasSession: !!data.session,
        hasProfile: !!data.profile,
        loading: data.loading,
        userId: data.user?.id,
        ...data,
      });
    }
  }, []);

  // Memoized profile loader with caching
  const loadProfile = useCallback(async (userId: string) => {
    // Prevent duplicate profile loading
    if (loadingProfile.current === userId) {
      console.log("🔄 Profile already loading for user:", userId);
      return;
    }

    // Check cache first
    const cachedProfile = profileCache.current.get(userId);
    if (cachedProfile) {
      console.log("📋 Using cached profile for user:", userId);
      setProfile(cachedProfile);
      return;
    }

    loadingProfile.current = userId;
    console.log("🔍 Loading profile for user:", userId);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("❌ Profile error:", error);
        // If profile doesn't exist, create a basic one
        if (error.code === "PGRST116") {
          console.log(
            "📝 Profile not found, this might be expected for new users"
          );
        }
        setProfile(null);
      } else {
        console.log("✅ Profile loaded successfully:", data);
        // Cache the profile
        profileCache.current.set(userId, data);
        setProfile(data);
      }
    } catch (error) {
      console.error("❌ Profile exception:", error);
      setProfile(null);
    } finally {
      loadingProfile.current = null;
    }
  }, []);

  // Optimized session refresh
  const refreshSession = useCallback(async () => {
    console.log("🔄 Refreshing session...");
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("❌ Session refresh error:", error);
        setUser(null);
        setProfile(null);
        setSession(null);
        logAuthState("Session Refresh Error", { error, loading: false });
        return;
      }

      if (data.session) {
        console.log("✅ Session refreshed successfully");
        setUser(data.session.user);
        setSession(data.session);
        await loadProfile(data.session.user.id);
        logAuthState("Session Refreshed", {
          user: data.session.user,
          session: data.session,
          loading: false,
        });
      } else {
        console.log("ℹ️ No active session found");
        setUser(null);
        setProfile(null);
        setSession(null);
        logAuthState("No Session", { loading: false });
      }
    } catch (error) {
      console.error("❌ Session refresh exception:", error);
      setUser(null);
      setProfile(null);
      setSession(null);
      logAuthState("Session Refresh Exception", { error, loading: false });
    }
  }, [loadProfile, logAuthState]);

  const signOut = useCallback(async () => {
    console.log("🚪 Signing out...");
    try {
      // Clear state immediately for instant UI feedback
      setUser(null);
      setProfile(null);
      setSession(null);
      setLoading(false);

      // Clear profile cache
      profileCache.current.clear();
      loadingProfile.current = null;

      // Call Supabase signOut in background
      await supabase.auth.signOut();
      console.log("✅ Sign out successful");
      logAuthState("Signed Out", { loading: false });
    } catch (error) {
      console.error("❌ Sign out exception:", error);
      setLoading(false);
    }
  }, [logAuthState]);

  useEffect(() => {
    // Prevent multiple initializations
    if (isInitialized.current) {
      console.log("⚠️ Auth already initialized, skipping...");
      return;
    }

    isInitialized.current = true;
    console.log("🚀 Initializing authentication...");

    // Initialize client-side authentication
    const initializeAuth = async () => {
      try {
        console.log("🔍 Getting initial session...");
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("❌ Initial session error:", error);
          logAuthState("Init Session Error", { error, loading: false });
          setLoading(false);
          return;
        }

        if (data.session) {
          console.log("✅ Initial session found");
          setUser(data.session.user);
          setSession(data.session);
          await loadProfile(data.session.user.id);
          logAuthState("Init Session Found", {
            user: data.session.user,
            session: data.session,
            loading: false,
          });
        } else {
          console.log("ℹ️ No initial session found");
          logAuthState("Init No Session", { loading: false });
        }
      } catch (error) {
        console.error("❌ Auth initialization exception:", error);
        logAuthState("Init Exception", { error, loading: false });
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes with optimized handling
    console.log("👂 Setting up auth state listener...");
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔄 Auth state change event:", event);

      // Skip processing if we're in the middle of initialization
      if (!isInitialized.current) {
        console.log("⚠️ Skipping auth change during initialization");
        return;
      }

      // Handle different auth events efficiently
      switch (event) {
        case "SIGNED_IN":
        case "TOKEN_REFRESHED":
          if (session) {
            console.log(`✅ ${event}: Session available`);
            setUser(session.user);
            setSession(session);
            // Only load profile if we don't have it cached or user changed
            if (!profile || profile.id !== session.user.id) {
              await loadProfile(session.user.id);
            }
            logAuthState(event, {
              user: session.user,
              session,
              profile,
              loading: false,
            });
          }
          setLoading(false);
          break;

        case "SIGNED_OUT":
          console.log("🚪 SIGNED_OUT: Clearing auth state");
          setUser(null);
          setProfile(null);
          setSession(null);
          profileCache.current.clear();
          loadingProfile.current = null;
          setLoading(false);
          logAuthState("SIGNED_OUT", { loading: false });
          break;

        case "USER_UPDATED":
          if (session) {
            console.log("👤 USER_UPDATED: Updating user data");
            setUser(session.user);
            setSession(session);
            logAuthState("USER_UPDATED", {
              user: session.user,
              session,
              loading: false,
            });
          }
          setLoading(false);
          break;

        default:
          console.log(`ℹ️ ${event}: Other auth event`);
          // For other events, just ensure loading is false
          setLoading(false);
          logAuthState(event, { loading: false });
          break;
      }
    });

    return () => {
      console.log("🧹 Cleaning up auth subscription");
      subscription.unsubscribe();
    };
  }, [loadProfile, profile, logAuthState]);

  const value = {
    user,
    profile,
    session,
    loading,
    signOut,
    refreshSession,
  };

  // Log current auth state periodically in development
  useEffect(() => {
    if (import.meta.env.DEV) {
      const interval = setInterval(() => {
        logAuthState("Periodic Check", value);
      }, 10000); // Every 10 seconds

      return () => clearInterval(interval);
    }
  }, [value, logAuthState]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
