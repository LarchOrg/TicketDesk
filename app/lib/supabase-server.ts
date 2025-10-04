import { createServerClient } from "@supabase/ssr";
import { redirect } from "react-router";

export function createSupabaseServerClient(request: Request) {
  const response = new Response();

  // Use environment variables that work in server context
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const cookieHeader = request.headers.get("Cookie");
        if (!cookieHeader) return [];

        return cookieHeader
          .split(";")
          .map((cookie) => cookie.trim())
          .filter((cookie) => cookie.length > 0)
          .map((cookie) => {
            const [name, ...rest] = cookie.split("=");
            const value = rest.join("=");
            return { name: name || "", value: value || "" };
          });
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          let cookieString = `${name}=${value}`;

          if (options?.maxAge) {
            cookieString += `; Max-Age=${options.maxAge}`;
          }

          if (options?.expires) {
            cookieString += `; Expires=${options.expires.toUTCString()}`;
          }

          if (options?.path) {
            cookieString += `; Path=${options.path}`;
          } else {
            cookieString += `; Path=/`;
          }

          if (options?.domain) {
            cookieString += `; Domain=${options.domain}`;
          }

          if (options?.secure) {
            cookieString += `; Secure`;
          }

          if (options?.httpOnly) {
            cookieString += `; HttpOnly`;
          }

          if (options?.sameSite) {
            cookieString += `; SameSite=${options.sameSite}`;
          }

          response.headers.append("Set-Cookie", cookieString);
        });
      },
    },
  });

  return { supabase, response };
}

export async function getSupabaseUser(request: Request) {
  const { supabase, response } = createSupabaseServerClient(request);

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("❌ Server user error:", error);
      return { user: null, response };
    }

    return { user, response };
  } catch (error) {
    console.error("❌ Server user exception:", error);
    return { user: null, response };
  }
}

// DEPRECATED: Use getSupabaseUser() instead
// getSession() reads from storage and may not be authentic
// This function is kept for backward compatibility but should not be used
export async function getSupabaseSession(request: Request) {
  console.warn("⚠️ getSupabaseSession() is deprecated. Use getSupabaseUser() instead for secure authentication.");
  const { supabase } = createSupabaseServerClient(request);

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("❌ Server session error:", error);
      return null;
    }

    return session;
  } catch (error) {
    console.error("❌ Server session exception:", error);
    return null;
  }
}

export async function requireAuth(request: Request) {
  const { supabase, response } = createSupabaseServerClient(request);

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      throw redirect("/login", {
        headers: response.headers,
      });
    }

    return { user, response };
  } catch (error) {
    // If it's already a redirect, re-throw it
    if (error instanceof Response) {
      throw error;
    }

    // Otherwise, redirect to login
    throw redirect("/login", {
      headers: response.headers,
    });
  }
}

export async function requireAuthWithProfile(request: Request) {
  const { user, response } = await requireAuth(request);
  const { supabase } = createSupabaseServerClient(request);

  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("❌ Profile fetch error:", error);
      return { user, profile: null, response };
    }

    return { user, profile, response };
  } catch (error) {
    console.error("❌ Profile fetch exception:", error);
    return { user, profile: null, response };
  }
}
