import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  EditIcon,
  EyeOffIcon,
  MessageCircleIcon,
  PaperclipIcon,
  SaveIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSubmit } from "react-router";
import PriorityBadge from "~/components/PriorityBadge";
import { StatusBadge, StatusTransition } from "~/components/StatusTransition";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { useAuth } from "~/contexts/AuthContext";
import { canTransitionStatus, useRolePermissions } from "~/lib/role-utils";
import { createSupabaseServerClient } from "~/lib/supabase-server";
import type { TicketPriority, TicketStatus } from "~/lib/types";
import type { Route } from "./+types/tickets.$ticketId";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { supabase: serverSupabase, response } =
    createSupabaseServerClient(request);

  try {
    // Verify authentication
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

    return Response.json(
      {
        ticket,
        comments: comments || [],
        attachments: attachments || [],
        assignableUsers: assignableUsers || [],
      },
      { headers: response.headers }
    );
  } catch (error: any) {
    console.error("Loader error:", error);
    throw new Response("Internal Server Error", { status: 500 });
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

    const { data: profile } = await serverSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return Response.json(
        { success: false, message: "User profile not found" },
        { status: 404, headers: response.headers }
      );
    }

    if (actionType === "updateTicket") {
      const updates = {
        title: formData.get("title") as string,
        description: formData.get("description") as string,
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

    if (actionType === "statusTransition") {
      const newStatus = formData.get("newStatus") as TicketStatus;
      const transitionLabel = formData.get("transitionLabel") as string;

      const { data: currentTicket } = await serverSupabase
        .from("tickets")
        .select("status, created_by, assigned_to")
        .eq("id", params.ticketId)
        .single();

      if (!currentTicket) {
        return Response.json(
          { success: false, message: "Ticket not found" },
          { status: 404, headers: response.headers }
        );
      }

      const canTransition = canTransitionStatus(
        currentTicket.status as TicketStatus,
        newStatus,
        profile.role as any,
        user.id,
        currentTicket
      );

      if (!canTransition) {
        return Response.json(
          {
            success: false,
            message: `You cannot ${transitionLabel.toLowerCase()} this ticket`,
          },
          { status: 403, headers: response.headers }
        );
      }

      // Update ticket status
      const { error } = await serverSupabase
        .from("tickets")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.ticketId);

      if (error) throw error;
      console.log(error, 'Error while status change')

      // Add a system comment about the status change
      await serverSupabase.from("comments").insert([
        {
          ticket_id: params.ticketId,
          user_id: user.id,
          content: `Ticket status changed to ${newStatus}`,
          comment_type: "system",
          is_internal: false,
        },
      ]);

      return Response.json(
        {
          success: true,
          message: `Ticket ${transitionLabel.toLowerCase()}ed successfully`,
        },
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
  const { ticket, comments, attachments, assignableUsers } = loaderData as any;
  const { user } = useAuth();
  const permissions = useRolePermissions();
  const navigate = useNavigate();
  const submit = useSubmit();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: ticket.title,
    description: ticket.description,
    priority: ticket.priority,
    assigned_to: ticket.assigned_to || "unassigned",
  });
  const [newComment, setNewComment] = useState("");
  const [commentType, setCommentType] = useState<"comment" | "internal_note">(
    "comment"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canEdit =
    permissions.canManageAllTickets || ticket.created_by === user?.id;
  const canAssign = permissions.canAssignTickets;

  // Handle action results
  useEffect(() => {
    if (actionData) {
      const typedActionData = actionData as {
        success?: boolean;
        message?: string;
      };
      if (typedActionData.success) {
        if (typedActionData.message) {
          console.log("✅ Success:", typedActionData.message);
        }

        if (typedActionData.message?.includes("Comment added")) {
          setNewComment("");
          setCommentType("comment");
        }

      } else if (typedActionData.message) {
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
      formData.append("priority", editData.priority);
      formData.append(
        "assigned_to",
        editData.assigned_to === "unassigned" ? "" : editData.assigned_to
      );

      submit(formData, { method: "POST" });
      setIsEditing(false);
    } catch (error) {
      console.error("Update error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusTransition = async (
    newStatus: TicketStatus,
    transitionLabel: string
  ) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("actionType", "statusTransition");
      formData.append("newStatus", newStatus);
      formData.append("transitionLabel", transitionLabel);

      submit(formData, { method: "POST" });
    } catch (error) {
      console.error("Status transition error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("actionType", "addComment");
      formData.append("content", newComment);
      formData.append("comment_type", commentType);
      formData.append(
        "is_internal",
        commentType === "internal_note" ? "true" : "false"
      );

      submit(formData, { method: "POST" });
    } catch (error) {
      console.error("Comment error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-full mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/tickets")}
              className="flex items-center space-x-2"
            >
              <ArrowLeftIcon className="w-4 h-4" />
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
                    <XIcon className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveTicket}
                    disabled={isSubmitting}
                  >
                    <SaveIcon className="w-4 h-4 mr-2" />
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => setIsEditing(true)}>
                  <EditIcon className="w-4 h-4 mr-2" />
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
                    <StatusBadge status={ticket.status} />
                    <PriorityBadge priority={ticket.priority} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="description"
                        className="block text-sm font-medium mb-2"
                      >
                        Description
                      </label>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="priority"
                          className="block text-sm font-medium mb-2"
                        >
                          Priority
                        </label>
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
                          <label
                            htmlFor="assigned_to"
                            className="block text-sm font-medium mb-2"
                          >
                            Assigned To
                          </label>
                          <Select
                            value={editData.assigned_to}
                            onValueChange={(value) =>
                              setEditData((prev) => ({
                                ...prev,
                                assigned_to: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">
                                Unassigned
                              </SelectItem>
                              {assignableUsers.map((user: any) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.name} ({user.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-foreground whitespace-pre-wrap">
                        {ticket.description}
                      </p>
                    </div>

                    {/* Status Transition Component */}
                    <div className="border-t pt-4">
                      <StatusTransition
                        currentStatus={ticket.status}
                        ticket={{
                          id: ticket.id,
                          created_by: ticket.created_by,
                          assigned_to: ticket.assigned_to,
                        }}
                        onStatusChange={handleStatusTransition}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comments Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageCircleIcon className="w-5 h-5" />
                  <span>Comments ({comments.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {comments.map((comment: any) => (
                  <div
                    key={comment.id}
                    className="border-b pb-4 last:border-b-0"
                  >
                    <div className="flex items-start space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={comment.author?.avatar_url} />
                        <AvatarFallback>
                          {comment.author?.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-sm">
                            {comment.author?.name || "Unknown User"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(comment.created_at)}
                          </span>
                          {comment.is_internal && (
                            <Badge variant="secondary" className="text-xs">
                              <EyeOffIcon className="w-3 h-3 mr-1" />
                              Internal
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add Comment Form */}
                <form onSubmit={handleAddComment} className="border-t pt-4">
                  <div className="space-y-3">
                    <div>
                      <label
                        htmlFor="comment"
                        className="block text-sm font-medium mb-2"
                      >
                        Add Comment
                      </label>
                      <Textarea
                        id="comment"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write your comment..."
                        rows={3}
                      />
                    </div>

                    {permissions.canManageAllTickets && (
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="commentType"
                            value="comment"
                            checked={commentType === "comment"}
                            onChange={(e) =>
                              setCommentType(e.target.value as "comment")
                            }
                          />
                          <span className="text-sm">Public Comment</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="commentType"
                            value="internal_note"
                            checked={commentType === "internal_note"}
                            onChange={(e) =>
                              setCommentType(e.target.value as "internal_note")
                            }
                          />
                          <span className="text-sm">Internal Note</span>
                        </label>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={!newComment.trim() || isSubmitting}
                      size="sm"
                    >
                      {isSubmitting ? "Adding..." : "Add Comment"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Ticket Info */}
            <Card>
              <CardHeader>
                <CardTitle>Ticket Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <UserIcon className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Created by</p>
                    <p className="text-sm text-muted-foreground">
                      {ticket.created_by_profile?.name || "Unknown"}
                    </p>
                  </div>
                </div>

                {ticket.assigned_to_profile && (
                  <div className="flex items-center space-x-3">
                    <UserIcon className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Assigned to</p>
                      <p className="text-sm text-muted-foreground">
                        {ticket.assigned_to_profile.name}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
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
                      <ClockIcon className="w-4 h-4 text-muted-foreground" />
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
                  <CardTitle className="flex items-center space-x-2">
                    <PaperclipIcon className="w-4 h-4" />
                    <span>Attachments ({attachments.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {attachments.map((attachment: any) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <span className="text-sm truncate">
                          {attachment.filename}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(attachment.file_size / 1024)}KB
                        </span>
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
