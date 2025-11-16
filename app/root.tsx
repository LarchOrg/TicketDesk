import { useCallback, useEffect } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  useLocation,
  useNavigate,
} from "react-router";
import type { Route } from "./+types/root";
import "./app.css";
import { Navbar } from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SidebarProvider, useSidebar } from "./contexts/SidebarContext";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";

function AppLayout() {
  const { user, loading } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const { sidebarOpen, toggleSidebar } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthPage =
    /^\/(login|signup|forgot-password|reset-password)(\/|$)/.test(
      location.pathname
    );

  const handleCreateTicket = useCallback(
    () => navigate("/newtickets"),
    [navigate]
  );

  useEffect(() => {
    if (!loading && !user && !isAuthPage) {
      console.log("🔒 Not authenticated, redirecting to login");
      navigate("/login", { replace: true });
    }
  }, [loading, user, isAuthPage, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-background">
        <Outlet />
      </div>
    );
  }

  if (!user) {
    return null;
  }
  const logoSrc = darkMode === true ? "/dark_larch.jpg" : "/larch.png";

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <div
          className={`${
            sidebarOpen ? "w-72" : "w-16"
          } transition-all duration-300 ease-in-out flex-shrink-0 hidden lg:block`}
        >
          <div className="h-full">
            <Sidebar collapsed={!sidebarOpen} />
          </div>
        </div>

        <div
          className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out lg:hidden ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="h-full bg-card shadow-xl">
            <Sidebar collapsed={false} />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Navbar */}
          <div className="flex-shrink-0">
            <Navbar
              darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
              onCreateTicket={handleCreateTicket}
              sidebarOpen={sidebarOpen}
              onToggleSidebar={toggleSidebar}
            />
          </div>

          {/* Main content */}
          <main className="flex-1 overflow-auto bg-background">
            <div className="max-w-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-40"
          onClick={toggleSidebar}
        />
      )}
    </div>
  );
}

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <ScrollToTop />
        <AuthProvider>
          <AppLayout />
        </AuthProvider>
      </SidebarProvider>
    </ThemeProvider>
  );
}

// Enhanced Error Boundary with better UX
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const navigate = useNavigate();
  const location = useLocation();

  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;
  let statusCode: number | undefined;

  if (isRouteErrorResponse(error)) {
    statusCode = error.status;
    message = error.status === 404 ? "Page Not Found" : `Error ${error.status}`;
    details =
      error.status === 404
        ? "The page you're looking for doesn't exist."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  // Check if we're on an auth page
  const isAuthPage = /^\/(login|signup)(\/|$)/.test(location.pathname);

  const errorContent = (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-destructive"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{message}</h1>
          <p className="text-muted-foreground">{details}</p>
          {statusCode && (
            <p className="text-sm text-muted-foreground">
              Status Code: {statusCode}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-input rounded-md hover:bg-accent transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Go Home
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-input rounded-md hover:bg-accent transition-colors"
          >
            Refresh
          </button>
        </div>

        {stack && import.meta.env.DEV && (
          <details className="text-left">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
              Error Details (Development)
            </summary>
            <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-auto max-h-40 text-left">
              <code>{stack}</code>
            </pre>
          </details>
        )}

        <p className="text-xs text-muted-foreground">
          If this problem persists, please contact support with the error
          details above.
        </p>
      </div>
    </div>
  );

  if (isAuthPage) {
    return errorContent;
  }

  return (
    <ThemeProvider>
      <SidebarProvider>
        <AuthProvider>{errorContent}</AuthProvider>
      </SidebarProvider>
    </ThemeProvider>
  );
}
