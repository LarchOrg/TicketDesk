import { createServerClient } from "@supabase/ssr";

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
  const { supabase } = createSupabaseServerClient(request);

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("❌ Server user error:", error);
      return null;
    }

    return user;
  } catch (error) {
    console.error("❌ Server user exception:", error);
    return null;
  }
}

export async function getSupabaseSession(request: Request) {
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
  const user = await getSupabaseUser(request);

  if (!user) {
    throw new Response("Unauthorized", {
      status: 401,
      headers: {
        Location: "/login",
      },
    });
  }

  return user;
}
