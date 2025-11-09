import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "./ui/card";

// Loading fallback component for Suspense
export function LoadingFallback({
  message = "Loading...",
}: {
  message?: string;
}) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{message}</span>
      </div>
    </div>
  );
}

// Enhanced loading skeleton for tickets
export function TicketListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-5 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                </div>
                <div className="flex gap-2">
                  <div className="h-6 bg-muted rounded w-16"></div>
                  <div className="h-6 bg-muted rounded w-16"></div>
                </div>
              </div>
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
              <div className="h-3 bg-muted rounded w-1/3"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Loading skeleton for ticket details
export function TicketDetailsSkeleton() {
  return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <div className="w-full max-w-md space-y-6 animate-pulse">

        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-6 bg-muted rounded w-full"></div>
            </div>
          ))}
        </div>


      </div>
    </div>
  );
}

// Form loading skeleton
export function FormSkeleton() {
  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="h-6 bg-muted rounded w-48 animate-pulse"></div>
      </CardHeader>
      <CardContent className="space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
            <div className="h-10 bg-muted rounded w-full animate-pulse"></div>
          </div>
        ))}
        <div className="flex justify-between pt-4">
          <div className="h-10 bg-muted rounded w-24 animate-pulse"></div>
          <div className="h-10 bg-muted rounded w-32 animate-pulse"></div>
        </div>
      </CardContent>
    </Card>
  );
}

// Dashboard loading skeleton
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8 animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-2"></div>
          <div className="h-4 bg-muted rounded w-96"></div>
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-20"></div>
                <div className="h-4 w-4 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                <div className="h-3 bg-muted rounded w-24"></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-8 space-y-6">
            {/* Tabs/Ticket Queue Section */}
            <Card className="animate-pulse">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="h-6 bg-muted rounded w-32"></div>
                  <div className="flex space-x-2">
                    <div className="h-8 bg-muted rounded w-20"></div>
                    <div className="h-8 bg-muted rounded w-20"></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {/* Search Bar */}
                <div className="mb-6">
                  <div className="h-10 bg-muted rounded w-full"></div>
                </div>

                {/* Ticket List */}
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="h-5 bg-muted rounded w-3/4"></div>
                          <div className="h-4 bg-muted rounded w-1/4"></div>
                        </div>
                        <div className="flex gap-2">
                          <div className="h-6 bg-muted rounded w-16"></div>
                          <div className="h-6 bg-muted rounded w-16"></div>
                        </div>
                      </div>
                      <div className="h-4 bg-muted rounded w-full"></div>
                      <div className="h-4 bg-muted rounded w-2/3"></div>
                      <div className="flex items-center justify-between">
                        <div className="h-3 bg-muted rounded w-1/3"></div>
                        <div className="h-3 bg-muted rounded w-1/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Quick Actions Card */}
            <Card className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-32"></div>
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 bg-muted rounded w-full"></div>
                ))}
              </CardContent>
            </Card>

            {/* System Overview / Performance Card */}
            <Card className="animate-pulse">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 bg-muted rounded"></div>
                  <div className="h-6 bg-muted rounded w-32"></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-full bg-muted w-8 h-8"></div>
                      <div className="h-4 bg-muted rounded w-20"></div>
                    </div>
                    <div className="h-6 bg-muted rounded w-8"></div>
                  </div>
                ))}
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-muted rounded w-24"></div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-muted rounded-full"></div>
                      <div className="h-4 bg-muted rounded w-20"></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Activity Section (Full Width) */}
        <div className="mt-8">
          <Card className="animate-pulse">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 bg-muted rounded"></div>
                  <div className="h-6 bg-muted rounded w-32"></div>
                </div>
                <div className="h-4 bg-muted rounded w-20"></div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-muted rounded-full"></div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="h-4 bg-muted rounded w-3/4"></div>
                          <div className="h-5 bg-muted rounded w-16"></div>
                        </div>
                        <div className="h-3 bg-muted rounded w-full"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                        <div className="flex items-center gap-3">
                          <div className="h-3 bg-muted rounded w-20"></div>
                          <div className="h-3 bg-muted rounded w-16"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Route skeleton for page transitions
export function RouteSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="animate-pulse">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="space-y-2">
                <div className="h-8 bg-muted rounded w-48"></div>
                <div className="h-4 bg-muted rounded w-64"></div>
              </div>
              <div className="h-10 bg-muted rounded w-32"></div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="h-6 bg-muted rounded w-1/3"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-full"></div>
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Navigation loading skeleton
export function NavigationSkeleton() {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="flex items-center gap-2 text-muted-foreground"></div>
    </div>
  );
}

// Stats Cards Skeleton
export function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 bg-muted rounded w-20"></div>
            <div className="h-4 w-4 bg-muted rounded"></div>
          </CardHeader>
          <CardContent>
            <div className="h-8 bg-muted rounded w-16 mb-2"></div>
            <div className="h-3 bg-muted rounded w-24"></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Activity Feed Skeleton
export function ActivityFeedSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 bg-muted rounded"></div>
            <div className="h-6 bg-muted rounded w-32"></div>
          </div>
          <div className="h-4 bg-muted rounded w-20"></div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-muted rounded-full"></div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-5 bg-muted rounded w-16"></div>
                  </div>
                  <div className="h-3 bg-muted rounded w-full"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="flex items-center gap-3">
                    <div className="h-3 bg-muted rounded w-20"></div>
                    <div className="h-3 bg-muted rounded w-16"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Quick Actions Skeleton
export function QuickActionsSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-6 bg-muted rounded w-32"></div>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 bg-muted rounded w-full"></div>
        ))}
      </CardContent>
    </Card>
  );
}

// System Overview Skeleton
export function SystemOverviewSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 bg-muted rounded"></div>
          <div className="h-6 bg-muted rounded w-32"></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-muted w-8 h-8"></div>
              <div className="h-4 bg-muted rounded w-20"></div>
            </div>
            <div className="h-6 bg-muted rounded w-8"></div>
          </div>
        ))}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-muted rounded w-24"></div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-muted rounded-full"></div>
              <div className="h-4 bg-muted rounded w-20"></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Ticket Queue Skeleton
export function TicketQueueSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-muted rounded w-32"></div>
          <div className="h-8 bg-muted rounded w-24"></div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="h-10 bg-muted rounded w-full"></div>
        </div>

        {/* Ticket List */}
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-5 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                </div>
                <div className="flex gap-2">
                  <div className="h-6 bg-muted rounded w-16"></div>
                  <div className="h-6 bg-muted rounded w-16"></div>
                </div>
              </div>
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
              <div className="flex items-center justify-between">
                <div className="h-3 bg-muted rounded w-1/3"></div>
                <div className="h-3 bg-muted rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Performance Card Skeleton
export function PerformanceCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 bg-muted rounded"></div>
          <div className="h-6 bg-muted rounded w-32"></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
          >
            <div className="h-4 bg-muted rounded w-20"></div>
            <div className="h-6 bg-muted rounded w-8"></div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
