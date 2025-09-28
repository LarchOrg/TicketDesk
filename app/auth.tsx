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

  const profileCache = useRef<Map<string, Profile>>(new Map());
  const loadingProfile = useRef<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    if (loadingProfile.current === userId) {
      return;
    }

    const cachedProfile = profileCache.current.get(userId);
    if (cachedProfile) {
      setProfile(cachedProfile);
      return;
    }

    loadingProfile.current = userId;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          console.log(
            "📝 Profile not found, this might be expected for new users"
          );
        }
        setProfile(null);
      } else {
        console.log("✅ Profile loaded successfully:", data);
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

  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
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
      setUser(null);
      setProfile(null);
      setSession(null);
    }
  }, [loadProfile ]);

  const signOut = useCallback(async () => {
    try {
      setUser(null);
      setProfile(null);
      setSession(null);
      setLoading(false);

      profileCache.current.clear();
      loadingProfile.current = null;

      await supabase.auth.signOut();
    } catch (error) {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          setLoading(false);
          return;
        }

        if (data.session) {
          setUser(data.session.user);
          setSession(data.session);
          await loadProfile(data.session.user.id);
        } 
      } catch (error) {
        console.error("❌ Auth initialization exception:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {

      switch (event) {
        case "SIGNED_IN":
        case "TOKEN_REFRESHED":
          if (session) {
            console.log(`✅ ${event}: Session available`);
            setUser(session.user);
            setSession(session);
            if (!profile || profile.id !== session.user.id) {
              await loadProfile(session.user.id);
            }
           
          }
          setLoading(false);
          break;

        case "SIGNED_OUT":
          setUser(null);
          setProfile(null);
          setSession(null);
          profileCache.current.clear();
          loadingProfile.current = null;
          setLoading(false);
          break;

        case "USER_UPDATED":
          if (session) {
            setUser(session.user);
            setSession(session);
          }
          setLoading(false);
          break;

        default:
          setLoading(false);
          break;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadProfile, profile,]);

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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
