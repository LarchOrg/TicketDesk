import {
  Crown,
  MoreHorizontal,
  Search,
  Shield,
  Trash2,
  User,
  UserIcon,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { redirect, useNavigate, useSubmit } from "react-router";
import { ConfirmDialog } from "~/components/ConfirmationModal";
import { ToastContainer, useToast } from "~/components/Toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { getRoleColor, getRoleDisplayName } from "../../lib/role-utils";
import { createSupabaseServerClient } from "../../lib/supabase-server";
import type { Profile } from "../../lib/types";
import { createServices } from "../../services";
import type { Route } from "../admin/+types/users";

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
    console.log("first actionType:", actionType, "userId:", userId);

    switch (actionType) {
      case "createUser": {
        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const role = formData.get("role") as string;

        const services = createServices(supabase);

        const { data: authData, error: authError } = await supabase.auth.signUp(
          {
            email,
            password: "Larch123",
            options: {
              data: {
                name,
                role,
              },
            },
          }
        );

        if (authError || !authData.user) {
          console.error("Error creating auth user:", authError);
          return { error: authError?.message || "Failed to create auth user" };
        }

        const userId = authData.user.id;

        const result = await services.users.createUserProfile({
          id: userId,
          name,
          email,
          role,
        });

        if (result?.success) {
          return { success: true, message: "User created successfully" };
        } else {
          return { error: result?.error || "Failed to create user profile" };
        }
      }

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
interface UserActionsMenuProps {
  user: Profile;
  currentUserRole?: string;
  onUpdateRole: (userId: string, role: string) => void;
  onDeleteUser: (userId: string) => void;
}

export function UserActionsMenu({
  user,
  onUpdateRole,
  onDeleteUser,
}: UserActionsMenuProps) {
  const role = user.role;

  const getRoleActions = () => {
    switch (role) {
      case "user":
        return [
          {
            label: "Make Agent",
            role: "agent",
            icon: <Shield className="mr-2 h-4 w-4" />,
          },
          {
            label: "Make Admin",
            role: "admin",
            icon: <Crown className="mr-2 h-4 w-4" />,
          },
        ];
      case "agent":
        return [
          {
            label: "Make Admin",
            role: "admin",
            icon: <Crown className="mr-2 h-4 w-4" />,
          },
          {
            label: "Make User",
            role: "user",
            icon: <UserIcon className="mr-2 h-4 w-4" />,
          },
        ];
      case "admin":
        return [
          {
            label: "Make Agent",
            role: "agent",
            icon: <Shield className="mr-2 h-4 w-4" />,
          },
          {
            label: "Make User",
            role: "user",
            icon: <UserIcon className="mr-2 h-4 w-4" />,
          },
        ];
      default:
        return [];
    }
  };

  const roleActions = getRoleActions();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {roleActions.map((action) => (
          <DropdownMenuItem
            key={action.role}
            onClick={() => onUpdateRole(user.id, action.role)}
          >
            {action.icon}
            {action.label}
          </DropdownMenuItem>
        ))}

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
  const { users, total } = loaderData;
  const navigate = useNavigate();
  const submit = useSubmit();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toasts, removeToast, success, error } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{
    action: "updateRole" | "deleteUser" | null;
    userId?: string;
    role?: string;
    title?: string;
    description?: string;
  }>({ action: null });
  useEffect(() => {
    if (actionData?.success) {
      success(actionData.message || "Success");
    } else if (actionData?.error) {
      error(actionData.error);
    }
  }, [actionData]);

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const createForm = new FormData();
      createForm.append("action", "createUser");
      createForm.append("name", formData.get("name") as string);
      createForm.append("email", formData.get("email") as string);
      createForm.append("role", formData.get("role") as string);

      submit(createForm, { method: "post" });
      setOpen(false);
    });
  };
  const filteredUsers = users.filter((user: Profile) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      user.name?.toLowerCase().includes(q) ||
      user.email?.toLowerCase().includes(q);
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleUpdateRole = (userId: string, role: string) => {
    setConfirmData({
      action: "updateRole",
      userId,
      role,
      title: "Change User Role",
      description: `Are you sure you want to change this user's role to ${getRoleDisplayName(role as any)}?`,
    });
    setConfirmOpen(true);
  };

  const handleDeleteUser = (userId: string) => {
    setConfirmData({
      action: "deleteUser",
      userId,
      title: "Delete User",
      description:
        "Are you sure you want to delete this user? This action cannot be undone.",
    });
    setConfirmOpen(true);
  };

  if (loaderData.error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <Users className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Error Loading Users</h1>
          <p className="text-muted-foreground mb-4">{loaderData.error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-2">
      <div className="mb-4">
        <div className="flex items-center justify-between py-4 px-2">
          <div>
            <h1 className="text-2xl font-bold">User Management</h1>
            <p className="text-muted-foreground">
              Manage users and their roles ({total} total users)
            </p>
          </div>
          <Button onClick={() => setOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent>
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
                {filteredUsers.map((user: Profile) => (
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader className="mb-4">
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-4">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select name="role" defaultValue="user">
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create User"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <ConfirmDialog
        open={confirmOpen}
        title={confirmData.title || ""}
        description={confirmData.description || ""}
        destructive={confirmData.action === "deleteUser"}
        onCancel={() => {
          setConfirmOpen(false);
          setConfirmData({ action: null });
        }}
        onConfirm={() => {
          if (!confirmData.userId || !confirmData.action) return;
          const formData = new FormData();
          formData.append("action", confirmData.action);
          formData.append("userId", confirmData.userId);
          if (confirmData.action === "updateRole" && confirmData.role) {
            formData.append("role", confirmData.role);
          }
          submit(formData, { method: "post" });
          setConfirmOpen(false);
        }}
      />
    </div>
  );
}
