import {
  Crown,
  MoreHorizontal,
  Search,
  Shield,
  Trash2,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { redirect, useNavigate, useRevalidator, useSubmit } from "react-router";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { getRoleColor, getRoleDisplayName } from "../lib/role-utils";
import { createSupabaseServerClient } from "../lib/supabase-server";
import type { Profile } from "../lib/types";
import { createServices } from "../services";
import type { Route } from "./+types/admin.users";

interface AdminUsersLoaderData {
  users: Profile[];
  total: number;
  error?: string;
}

interface AdminUsersActionData {
  success?: boolean;
  error?: string;
  message?: string;
}

export async function loader({
  request,
}: Route.LoaderArgs): Promise<AdminUsersLoaderData> {
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

    const services = createServices(supabase);
    const users = await services.users.getAllUsers();

    return {
      users: users || [],
      total: users?.length || 0,
    };
  } catch (error) {
    // If it's a redirect, re-throw it
    if (error instanceof Response) {
      throw error;
    }

    console.error("Error loading users:", error);
    return {
      users: [],
      total: 0,
      error: "Failed to load users",
    };
  }
}

export async function action({
  request,
}: Route.ActionArgs): Promise<AdminUsersActionData> {
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
    const actionType = formData.get("action") as string;
    const userId = formData.get("userId") as string;

    const services = createServices(supabase);

    switch (actionType) {
      case "updateRole": {
        const newRole = formData.get("role") as string;
        const result = await services.users.updateUserProfile(userId, {
          role: newRole,
        });

        if (result?.success) {
          return { success: true, message: "User role updated successfully" };
        } else {
          return { error: result?.error || "Failed to update user role" };
        }
      }

      case "deleteUser": {
        const result = await services.users.deleteUserProfile(userId);

        if (result?.success) {
          return { success: true, message: "User deleted successfully" };
        } else {
          return { error: result?.error || "Failed to delete user" };
        }
      }

      default:
        return { error: "Invalid action" };
    }
  } catch (error) {
    // If it's a redirect response, re-throw it
    if (error instanceof Response) {
      throw error;
    }

    console.error("Error in admin users action:", error);
    return { error: "An error occurred while processing your request" };
  }
}

export const meta = () => {
  return [
    { title: "User Management - Admin Portal" },
    { name: "description", content: "Manage users and their roles" },
  ];
};

function UserRoleBadge({ role }: { role: string }) {
  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return Crown;
      case "agent":
        return Shield;
      case "user":
      default:
        return User;
    }
  };

  const Icon = getRoleIcon(role);
  const color = getRoleColor(role as any);

  return (
    <Badge variant="outline" className={`${color} border-current`}>
      <Icon className="w-3 h-3 mr-1" />
      {getRoleDisplayName(role as any)}
    </Badge>
  );
}

function UserActionsMenu({
  user,
  onUpdateRole,
  onDeleteUser,
}: {
  user: Profile;
  onUpdateRole: (userId: string, role: string) => void;
  onDeleteUser: (userId: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onUpdateRole(user.id, "admin")}>
          <Crown className="mr-2 h-4 w-4" />
          Make Admin
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onUpdateRole(user.id, "agent")}>
          <Shield className="mr-2 h-4 w-4" />
          Make Agent
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onUpdateRole(user.id, "user")}>
          <User className="mr-2 h-4 w-4" />
          Make User
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onDeleteUser(user.id)}
          className="text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete User
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AdminUsers({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { users, total, error } = loaderData;
  const navigate = useNavigate();
  const submit = useSubmit();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const revalidator = useRevalidator();

  useEffect(() => {
    if (actionData?.success) {
      try {
        revalidator.revalidate();
      } catch (e) {
        console.error("Failed to revalidate after action:", e);
      }
    }
    // Only re-run when the success flag changes
  }, [actionData?.success, revalidator]);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleUpdateRole = (userId: string, role: string) => {
    if (
      confirm(
        `Are you sure you want to change this user's role to ${getRoleDisplayName(role as any)}?`
      )
    ) {
      const formData = new FormData();
      formData.append("action", "updateRole");
      formData.append("userId", userId);
      formData.append("role", role);
      submit(formData, { method: "post" });
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (
      confirm(
        "Are you sure you want to delete this user? This action cannot be undone."
      )
    ) {
      const formData = new FormData();
      formData.append("action", "deleteUser");
      formData.append("userId", userId);
      submit(formData, { method: "post" });
    }
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <Users className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Error Loading Users</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-2">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground">
              Manage users and their roles ({total} total users)
            </p>
          </div>
          <Button onClick={() => navigate("/admin/users/new")}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
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

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
                <SelectItem value="agent">Agents</SelectItem>
                <SelectItem value="user">Users</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || roleFilter !== "all"
                  ? "No users match your filters"
                  : "No users found"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.name || "N/A"}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <UserRoleBadge role={user.role || "user"} />
                    </TableCell>
                    <TableCell>
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {user.updated_at
                        ? new Date(user.updated_at).toLocaleDateString()
                        : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <UserActionsMenu
                        user={user}
                        onUpdateRole={handleUpdateRole}
                        onDeleteUser={handleDeleteUser}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
