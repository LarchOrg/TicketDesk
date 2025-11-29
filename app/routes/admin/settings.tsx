import {
  Bell,
  Database,
  Globe,
  Mail,
  Save,
  Settings,
  Shield,
} from "lucide-react";
import { useState } from "react";
import { redirect, useSubmit } from "react-router";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Textarea } from "../../components/ui/textarea";
import { createSupabaseServerClient } from "../../lib/supabase-server";
import type { Route } from "./+types/settings";

interface SystemSettings {
  siteName: string;
  siteDescription: string;
  supportEmail: string;
  autoAssignment: boolean;
  emailNotifications: boolean;
  slaHours: number;
  maxFileSize: number;
  allowedFileTypes: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  defaultUserRole: string;
  ticketPrefix: string;
}

interface AdminSettingsLoaderData {
  settings: SystemSettings;
  error?: string;
}

interface AdminSettingsActionData {
  success?: boolean;
  error?: string;
  message?: string;
}

// Default settings
const DEFAULT_SETTINGS: SystemSettings = {
  siteName: "Larch HelpDesk",
  siteDescription: "Customer Support and Ticket Management System",
  supportEmail: "support@company.com",
  autoAssignment: false,
  emailNotifications: true,
  slaHours: 24,
  maxFileSize: 10,
  allowedFileTypes: "pdf,doc,docx,txt,png,jpg,jpeg,gif",
  maintenanceMode: false,
  registrationEnabled: true,
  defaultUserRole: "user",
  ticketPrefix: "TKT",
};

export async function loader({
  request,
}: Route.LoaderArgs): Promise<AdminSettingsLoaderData> {
  try {
    const { supabase, response } = createSupabaseServerClient(request);

    // Use getUser() instead of getSession() for security
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw redirect("/login", {
        headers: response.headers,
      });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      throw redirect("/dashboard");
    }

    // In a real app, you would fetch settings from a database table
    // For now, we'll use default settings
    return {
      settings: DEFAULT_SETTINGS,
    };
  } catch (error) {
    // If it's a redirect response, re-throw it so the framework can handle it
    if (error instanceof Response) {
      throw error;
    }

    console.error("Error loading settings:", error);
    return {
      settings: DEFAULT_SETTINGS,
      error: "Failed to load settings",
    };
  }
}

export async function action({
  request,
}: Route.ActionArgs): Promise<AdminSettingsActionData> {
  try {
    const { supabase, response } = createSupabaseServerClient(request);

    // Use getUser() instead of getSession() for security
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw redirect("/login", {
        headers: response.headers,
      });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return { error: "Unauthorized" };
    }

    const formData = await request.formData();
    const settings = Object.fromEntries(formData.entries());

    // In a real app, you would save these settings to a database
    console.log("Saving settings:", settings);

    return {
      success: true,
      message: "Settings saved successfully",
    };
  } catch (error) {
    // If it's a redirect response, re-throw it so the framework can handle it
    if (error instanceof Response) {
      throw error;
    }

    console.error("Error saving settings:", error);
    return { error: "Failed to save settings" };
  }
}

export const meta = () => {
  return [
    { title: "Larch HelpDesk" },
    { name: "description", content: "Configure system-wide settings" },
  ];
};

function GeneralSettings({ settings }: { settings: SystemSettings }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="mr-2 h-5 w-5" />
            Site Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="siteName">Site Name</Label>
            <Input
              id="siteName"
              name="siteName"
              defaultValue={settings.siteName}
              placeholder="Larch HelpDesk"
            />
          </div>
          <div>
            <Label htmlFor="siteDescription">Site Description</Label>
            <Textarea
              id="siteDescription"
              name="siteDescription"
              defaultValue={settings.siteDescription}
              placeholder="Customer Support and Ticket Management System"
            />
          </div>
          <div>
            <Label htmlFor="supportEmail">Support Email</Label>
            <Input
              id="supportEmail"
              name="supportEmail"
              type="email"
              defaultValue={settings.supportEmail}
              placeholder="support@company.com"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            Access Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="registrationEnabled">User Registration</Label>
              <p className="text-sm text-muted-foreground">
                Allow new users to register
              </p>
            </div>
            <Switch
              id="registrationEnabled"
              name="registrationEnabled"
              defaultChecked={settings.registrationEnabled}
            />
          </div>
          <div>
            <Label htmlFor="defaultUserRole">Default User Role</Label>
            <Select
              name="defaultUserRole"
              defaultValue={settings.defaultUserRole}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
              <p className="text-sm text-muted-foreground">
                Temporarily disable the system
              </p>
            </div>
            <Switch
              id="maintenanceMode"
              name="maintenanceMode"
              defaultChecked={settings.maintenanceMode}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TicketSettings({ settings }: { settings: SystemSettings }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Ticket Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="ticketPrefix">Ticket ID Prefix</Label>
            <Input
              id="ticketPrefix"
              name="ticketPrefix"
              defaultValue={settings.ticketPrefix}
              placeholder="TKT"
              className="w-32"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Prefix for ticket IDs (e.g., TKT-001)
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="autoAssignment">Auto Assignment</Label>
              <p className="text-sm text-muted-foreground">
                Automatically assign tickets to agents
              </p>
            </div>
            <Switch
              id="autoAssignment"
              name="autoAssignment"
              defaultChecked={settings.autoAssignment}
            />
          </div>
          <div>
            <Label htmlFor="slaHours">SLA Response Time (Hours)</Label>
            <Input
              id="slaHours"
              name="slaHours"
              type="number"
              defaultValue={settings.slaHours}
              min="1"
              max="168"
              className="w-32"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="mr-2 h-5 w-5" />
            File Upload Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="maxFileSize">Maximum File Size (MB)</Label>
            <Input
              id="maxFileSize"
              name="maxFileSize"
              type="number"
              defaultValue={settings.maxFileSize}
              min="1"
              max="100"
              className="w-32"
            />
          </div>
          <div>
            <Label htmlFor="allowedFileTypes">Allowed File Types</Label>
            <Input
              id="allowedFileTypes"
              name="allowedFileTypes"
              defaultValue={settings.allowedFileTypes}
              placeholder="pdf,doc,docx,txt,png,jpg,jpeg,gif"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Comma-separated list of allowed file extensions
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationSettings({ settings }: { settings: SystemSettings }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bell className="mr-2 h-5 w-5" />
          Notification Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="emailNotifications">Email Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Send email notifications for ticket updates
            </p>
          </div>
          <Switch
            id="emailNotifications"
            name="emailNotifications"
            defaultChecked={settings.emailNotifications}
          />
        </div>

        <div className="space-y-2">
          <Label>Email Templates</Label>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• New ticket created</p>
            <p>• Ticket status updated</p>
            <p>• New comment added</p>
            <p>• Ticket assigned</p>
          </div>
          <Button variant="outline" size="sm">
            <Mail className="mr-2 h-4 w-4" />
            Customize Templates
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminSettings({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { settings, error } = loaderData;
  const submit = useSubmit();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    submit(event.currentTarget, { method: "post" });
    setTimeout(() => setIsSubmitting(false), 1000);
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <Settings className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Error Loading Settings</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-2">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">System Settings</h1>
        <p className="text-muted-foreground">
          Configure system-wide settings and preferences
        </p>
      </div>

      {/* Action Messages */}
      {actionData?.success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">{actionData.message}</p>
        </div>
      )}
      {actionData?.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{actionData.error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <GeneralSettings settings={settings} />
          </TabsContent>

          <TabsContent value="tickets">
            <TicketSettings settings={settings} />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationSettings settings={settings} />
          </TabsContent>

          <div className="flex justify-end pt-6">
            <Button type="submit" disabled={isSubmitting}>
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </Tabs>
      </form>
    </div>
  );
}
