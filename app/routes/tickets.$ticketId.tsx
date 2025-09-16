import {
  ArrowLeft,
  Calendar,
  Clock,
  Edit,
  MessageSquare,
  Paperclip,
  Save,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Form, useNavigate, useSubmit } from "react-router";
import PriorityBadge from "~/components/PriorityBadge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { useAuth } from "~/contexts/AuthContext";
import { useRolePermissions } from "~/lib/role-utils";
import { createSupabaseServerClient } from "~/lib/supabase-server";
import type { TicketPriority, TicketStatus } from "~/lib/types";
import { getStatusColor } from "~/lib/utils";
import type { Route } from "./+types/tickets.$ticketId";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Ticket #${params.ticketId} - TicketDesk` },
    { name: "description", content: "View and manage ticket details" },
  ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { supabase: serverSupabase, response } =
    createSupabaseServerClient(request);

  try {
    // Get authenticated user (more secure than getSession)
    const {
      data: { user },
      error: userError,
    } = await serverSupabase.auth.getUser();

    if (userError || !user) {
      throw new Response("Unauthorized", {
        status: 401,
        headers: { Location: "/login" },
      });
    }

    // Fetch ticket with related data
    const { data: ticket, error: ticketError } = await serverSupabase
      .from("tickets")
      .select(
        `
        *,
        created_by_profile:profiles!tickets_created_by_fkey(id, name, email, avatar_url, role),
        assigned_to_profile:profiles!tickets_assigned_to_fkey(id, name, email, avatar_url, role)
      `
      )
      .eq("id", params.ticketId)
      .single();

    if (ticketError || !ticket) {
      throw new Response("Ticket not found", { status: 404 });
    }

    // Fetch comments with author profiles
    const { data: comments } = await serverSupabase
      .from("comments")
      .select(
        `
        *,
        author:profiles!comments_user_id_fkey(id, name, email, avatar_url, role)
      `
      )
      .eq("ticket_id", params.ticketId)
      .order("created_at", { ascending: true });

    // Fetch attachments
    const { data: attachments } = await serverSupabase
      .from("attachments")
      .select("*")
      .eq("ticket_id", params.ticketId)
      .order("created_at", { ascending: false });

    // Fetch assignable users (agents and admins)
    const { data: assignableUsers } = await serverSupabase
      .from("profiles")
      .select("id, name, email, avatar_url, role")
      .in("role", ["agent", "admin"])
      .order("name");

    return {
      ticket,
      comments: comments || [],
      attachments: attachments || [],
      assignableUsers: assignableUsers || [],
    };
  } catch (error) {
    console.error("Loader error:", error);
    if (error instanceof Response) {
      throw error;
    }
    throw new Response("Internal server error", { status: 500 });
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const { supabase: serverSupabase, response } =
    createSupabaseServerClient(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;

  try {
    // Verify authentication
    const {
      data: { user },
      error: userError,
    } = await serverSupabase.auth.getUser();

    if (userError || !user) {
      return Response.json(
        { success: false, message: "Authentication required" },
        { status: 401, headers: response.headers }
      );
    }

    if (actionType === "updateTicket") {
      const updates = {
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        status: formData.get("status") as TicketStatus,
        priority: formData.get("priority") as TicketPriority,
        assigned_to: (formData.get("assigned_to") as string) || null,
      };

      const { error } = await serverSupabase
        .from("tickets")
        .update(updates)
        .eq("id", params.ticketId);

      if (error) throw error;

      return Response.json(
        { success: true, message: "Ticket updated successfully" },
        { headers: response.headers }
      );
    }

    if (actionType === "addComment") {
      const commentData = {
        ticket_id: params.ticketId,
        user_id: user.id,
        content: formData.get("content") as string,
        comment_type: (formData.get("comment_type") as string) || "comment",
        is_internal: formData.get("is_internal") === "true",
      };

      const { error } = await serverSupabase
        .from("comments")
        .insert([commentData]);

      if (error) throw error;

      return Response.json(
        { success: true, message: "Comment added successfully" },
        { headers: response.headers }
      );
    }

    return Response.json(
      { success: false, message: "Invalid action" },
      { status: 400, headers: response.headers }
    );
  } catch (error: any) {
    console.error("Action error:", error);
    return Response.json(
      {
        success: false,
        message: error.message || "An error occurred",
      },
      { status: 500, headers: response.headers }
    );
  }
}

export default function TicketDetailsPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { ticket, comments, attachments, assignableUsers } = loaderData;
  const { user } = useAuth();
  const permissions = useRolePermissions();
  const navigate = useNavigate();
  const submit = useSubmit();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    assigned_to: ticket.assigned_to || "unassigned",
  });
  const [newComment, setNewComment] = useState("");
  const [commentType, setCommentType] = useState<"comment" | "internal_note">(
    "comment"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canEdit =
    permissions.isAdmin ||
    permissions.isAgent ||
    ticket.created_by === user?.id;
  const canAssign = permissions.isAdmin || permissions.isAgent;

  // Handle action results
  useEffect(() => {
    if (actionData) {
      const typedActionData = actionData as {
        success?: boolean;
        message?: string;
      };
      if (typedActionData.success) {
        if (typedActionData.message) {
          // Show success message (you can replace with a toast notification)
          console.log("✅ Success:", typedActionData.message);
        }

        // Clear comment form if it was a comment submission
        if (typedActionData.message?.includes("Comment added")) {
          setNewComment("");
          setCommentType("comment");
        }

        // Refresh the page to show updated data
        window.location.reload();
      } else if (typedActionData.message) {
        // Show error message
        alert(typedActionData.message);
      }
    }
  }, [actionData]);

  const handleSaveTicket = async () => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("actionType", "updateTicket");
      formData.append("title", editData.title);
      formData.append("description", editData.description);
      formData.append("status", editData.status);
      formData.append("priority", editData.priority);
      formData.append(
        "assigned_to",
        editData.assigned_to === "unassigned" ? "" : editData.assigned_to
      );

      // Use React Router's submit instead of fetch
      submit(formData, { method: "POST" });

      // Note: The response will be handled by the action and page will reload
      setIsEditing(false);
    } catch (error) {
      console.error("Update error:", error);
      alert("Failed to update ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/tickets")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Tickets</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Ticket #{ticket.id.slice(-8)}
              </h1>
              <p className="text-sm text-muted-foreground">
                Created {formatDate(ticket.created_at)}
              </p>
            </div>
          </div>

          {canEdit && (
            <div className="flex items-center space-x-2">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    disabled={isSubmitting}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveTicket}
                    disabled={isSubmitting}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Ticket
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ticket Details */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {isEditing ? (
                      <Input
                        value={editData.title}
                        onChange={(e) =>
                          setEditData((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                        className="text-xl font-semibold mb-2"
                        placeholder="Ticket title"
                      />
                    ) : (
                      <CardTitle className="text-xl">{ticket.title}</CardTitle>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(ticket.status)}`}
                    >
                      {ticket.status.replace("_", " ").toUpperCase()}
                    </span>
                    <PriorityBadge priority={ticket.priority} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={editData.description}
                        onChange={(e) =>
                          setEditData((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        rows={6}
                        placeholder="Ticket description"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={editData.status}
                          onValueChange={(value) =>
                            setEditData((prev) => ({
                              ...prev,
                              status: value as TicketStatus,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">
                              In Progress
                            </SelectItem>
                            <SelectItem value="waiting">Waiting</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="priority">Priority</Label>
                        <Select
                          value={editData.priority}
                          onValueChange={(value) =>
                            setEditData((prev) => ({
                              ...prev,
                              priority: value as TicketPriority,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {canAssign && (
                        <div>
                          <Label htmlFor="assigned_to">Assigned To</Label>
                          <Select
                            value={editData.assigned_to || "unassigned"}
                            onValueChange={(value) =>
                              setEditData((prev) => ({
                                ...prev,
                                assigned_to:
                                  value === "unassigned" ? "" : value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">
                                Unassigned
                              </SelectItem>
                              {assignableUsers.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.name || user.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="prose max-w-none">
                    <p className="text-foreground whitespace-pre-wrap">
                      {ticket.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comments Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5" />
                  <span>Comments ({comments.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Existing Comments */}
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="border-l-4 border-primary/20 pl-4 py-2"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {comment.author?.name?.charAt(0) ||
                              comment.author?.email?.charAt(0) ||
                              "U"}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {comment.author?.name ||
                              comment.author?.email ||
                              "Unknown User"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(comment.created_at)}
                          </p>
                        </div>
                      </div>
                      {comment.is_internal && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                          Internal
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-foreground whitespace-pre-wrap">
                      {comment.content}
                    </div>
                  </div>
                ))}

                {/* Add New Comment */}
                <div className="border-t pt-4">
                  <Form method="post" className="space-y-3">
                    <input type="hidden" name="actionType" value="addComment" />

                    <div className="flex items-center space-x-4">
                      <Label>Comment Type:</Label>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="comment_type"
                            value="comment"
                            checked={commentType === "comment"}
                            onChange={(e) =>
                              setCommentType(e.target.value as "comment")
                            }
                          />
                          <span className="text-sm">Public Comment</span>
                        </label>
                        {(permissions.isAdmin || permissions.isAgent) && (
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="comment_type"
                              value="internal_note"
                              checked={commentType === "internal_note"}
                              onChange={(e) =>
                                setCommentType(
                                  e.target.value as "internal_note"
                                )
                              }
                            />
                            <span className="text-sm">Internal Note</span>
                          </label>
                        )}
                      </div>
                    </div>

                    <input
                      type="hidden"
                      name="is_internal"
                      value={commentType === "internal_note" ? "true" : "false"}
                    />

                    <Textarea
                      name="content"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={
                        commentType === "internal_note"
                          ? "Add an internal note..."
                          : "Add a comment..."
                      }
                      rows={3}
                      required
                    />

                    <Button
                      type="submit"
                      disabled={!newComment.trim() || isSubmitting}
                      size="sm"
                    >
                      {isSubmitting ? "Adding..." : "Add Comment"}
                    </Button>
                  </Form>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Ticket Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ticket Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Created by</p>
                    <p className="text-sm text-muted-foreground">
                      {ticket.created_by_profile?.name ||
                        ticket.created_by_profile?.email ||
                        "Unknown"}
                    </p>
                  </div>
                </div>

                {ticket.assigned_to_profile && (
                  <div className="flex items-center space-x-3">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Assigned to</p>
                      <p className="text-sm text-muted-foreground">
                        {ticket.assigned_to_profile.name ||
                          ticket.assigned_to_profile.email}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(ticket.created_at)}
                    </p>
                  </div>
                </div>

                {ticket.updated_at &&
                  ticket.updated_at !== ticket.created_at && (
                    <div className="flex items-center space-x-3">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Last updated</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(ticket.updated_at)}
                        </p>
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Attachments */}
            {attachments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Paperclip className="w-4 h-4" />
                    <span>Attachments ({attachments.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-2 bg-muted rounded"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {attachment.filename}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(attachment.file_size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <Button variant="ghost" size="sm">
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
