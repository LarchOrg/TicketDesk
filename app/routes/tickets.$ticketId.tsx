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
import { redirect, useNavigate, useNavigation, useSubmit } from "react-router";
import { RouteSkeleton } from "~/components/LoadingComponents";
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
import type {
  Attachment,
  Comment,
  Profile,
  Ticket,
  TicketPriority,
  TicketStatus,
} from "~/lib/types";
import { createServices } from "~/services";
import type { Route } from "./+types/tickets.$ticketId";

// Types
interface TicketDetailsLoaderData {
  ticket: Ticket;
  comments: Comment[];
  attachments: Attachment[];
  assignableUsers: Profile[];
  error?: string;
}

interface TicketDetailsActionData {
  success: boolean;
  message: string;
}

interface EditTicketData {
  title: string;
  description: string;
  priority: TicketPriority;
  assigned_to: string | undefined;
}

type CommentType = "comment" | "internal_note";
type ActionType = "updateTicket" | "transitionStatus" | "addComment";

// Constants
const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
] as const;

// Utility functions
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

function formatFileSize(bytes: number): string {
  return `${Math.round(bytes / 1024)}KB`;
}

function validateTicketUpdate(data: Partial<EditTicketData>): string | null {
  if (!data.title?.trim()) {
    return "Title is required";
  }
  if (!data.description?.trim()) {
    return "Description is required";
  }
  if (data.title.trim().length < 3) {
    return "Title must be at least 3 characters";
  }
  if (data.description.trim().length < 10) {
    return "Description must be at least 10 characters";
  }
  return null;
}

function validateComment(content: string): string | null {
  if (!content?.trim()) {
    return "Comment content is required";
  }
  if (content.trim().length < 1) {
    return "Comment cannot be empty";
  }
  return null;
}

// Meta function
export const meta = ({ data }: { data?: TicketDetailsLoaderData }) => {
  const ticketId = data?.ticket?.id ? `#${data.ticket.id.slice(-8)}` : "";
  return [
    { title: `Ticket ${ticketId} - TicketDesk` },
    { name: "description", content: "View and manage ticket details" },
  ];
};

// Loader function
export async function loader({
  request,
  params,
}: Route.LoaderArgs): Promise<TicketDetailsLoaderData> {
  const { supabase, response } = createSupabaseServerClient(request);

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw redirect("/login", { headers: response.headers });
    }

    if (!params.ticketId) {
      return {
        error: "Ticket ID is required",
        ticket: {} as Ticket,
        comments: [],
        attachments: [],
        assignableUsers: [],
      };
    }

    const services = createServices(supabase);

    const [ticket, comments, attachments, assignableUsers] = await Promise.all([
      services.tickets.getTicketById(params.ticketId),
      services.comments.getCommentsByTicketId(params.ticketId),
      services.attachments.getAttachmentsByTicketId(params.ticketId),
      services.users.getAssignableUsers(),
    ]);

    if (!ticket) {
      return {
        error: "Ticket not found",
        ticket: {} as Ticket,
        comments: [],
        attachments: [],
        assignableUsers: [],
      };
    }

    return {
      ticket,
      comments,
      attachments,
      assignableUsers,
    };
  } catch (error: any) {
    console.error("Ticket details loader error:", error);

    // If it's a redirect, re-throw it
    if (error instanceof Response) {
      throw error;
    }

    return {
      error: "Failed to load ticket details",
      ticket: {} as Ticket,
      comments: [],
      attachments: [],
      assignableUsers: [],
    };
  }
}

// Action function
export async function action({
  request,
  params,
}: Route.ActionArgs): Promise<TicketDetailsActionData> {
  const { supabase } = createSupabaseServerClient(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType") as ActionType;

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: "Authentication required" };
    }

    if (!params.ticketId) {
      return { success: false, message: "Ticket ID is required" };
    }

    const services = createServices(supabase);
    const profile = await services.users.getUserById(user.id);

    if (!profile) {
      return { success: false, message: "User profile not found" };
    }

    switch (actionType) {
      case "updateTicket":
        return await handleUpdateTicket(services, params.ticketId, formData);

      case "transitionStatus":
        return await handleStatusTransition(
          services,
          params.ticketId,
          formData,
          profile,
          user.id
        );

      case "addComment":
        return await handleAddComment(
          services,
          params.ticketId,
          formData,
          user.id
        );

      default:
        return { success: false, message: "Invalid action type" };
    }
  } catch (error: any) {
    console.error("Ticket details action error:", error);
    return { success: false, message: "An unexpected error occurred" };
  }
}

// Action handlers
async function handleUpdateTicket(
  services: any,
  ticketId: string,
  formData: FormData
): Promise<TicketDetailsActionData> {
  const updates = {
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    priority: formData.get("priority") as TicketPriority,
    assigned_to: (formData.get("assigned_to") as string) || undefined,
  };

  const validationError = validateTicketUpdate(updates);
  if (validationError) {
    return { success: false, message: validationError };
  }

  const result = await services.tickets.updateTicket(ticketId, updates);

  if (!result.success) {
    return {
      success: false,
      message: result.error || "Failed to update ticket",
    };
  }

  return { success: true, message: "Ticket updated successfully" };
}

async function handleStatusTransition(
  services: any,
  ticketId: string,
  formData: FormData,
  profile: Profile,
  userId: string
): Promise<TicketDetailsActionData> {
  const newStatus = formData.get("newStatus") as TicketStatus;
  const transitionLabel = formData.get("transitionLabel") as string;

  const ticket = await services.tickets.getTicketById(ticketId);
  if (!ticket) {
    return { success: false, message: "Ticket not found" };
  }

  const canTransition = canTransitionStatus(
    ticket.status,
    newStatus,
    profile.role as any,
    userId,
    {
      created_by: ticket.created_by,
      assigned_to: ticket.assigned_to,
    }
  );

  if (!canTransition) {
    return {
      success: false,
      message: `You cannot ${transitionLabel.toLowerCase()} this ticket`,
    };
  }

  const statusResult = await services.tickets.updateTicketStatus(
    ticketId,
    newStatus
  );

  if (!statusResult.success) {
    return {
      success: false,
      message: statusResult.error || "Failed to update status",
    };
  }

  // Add system comment
  await services.comments.createComment({
    ticket_id: ticketId,
    user_id: userId,
    content: `Ticket status changed to ${newStatus}`,
    comment_type: "system",
    is_internal: false,
  });

  return {
    success: true,
    message: `Ticket ${transitionLabel.toLowerCase()} successfully`,
  };
}

async function handleAddComment(
  services: any,
  ticketId: string,
  formData: FormData,
  userId: string
): Promise<TicketDetailsActionData> {
  const content = formData.get("content") as string;
  const isInternal = formData.get("isInternal") === "true";

  const validationError = validateComment(content);
  if (validationError) {
    return { success: false, message: validationError };
  }

  const result = await services.comments.createComment({
    ticket_id: ticketId,
    user_id: userId,
    content: content.trim(),
    comment_type: "comment",
    is_internal: isInternal,
  });

  if (!result.success) {
    return {
      success: false,
      message: result.error || "Failed to add comment",
    };
  }

  return { success: true, message: "Comment added successfully" };
}

// Component: Error Display
function ErrorDisplay({
  error,
  onRetry,
}: {
  error: string;
  onRetry?: () => void;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-destructive">
            Error Loading Ticket
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{error}</p>
          {onRetry && (
            <Button onClick={onRetry} className="w-full">
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Component: Ticket Header
function TicketHeader({
  ticket,
  isEditing,
  canEdit,
  isSubmitting,
  onEdit,
  onSave,
  onCancel,
}: {
  ticket: Ticket;
  isEditing: boolean;
  canEdit: boolean;
  isSubmitting: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const navigate = useNavigate();

  return (
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
            Ticket #{ticket.id?.slice(-8)}
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
                onClick={onCancel}
                disabled={isSubmitting}
              >
                <XIcon className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button size="sm" onClick={onSave} disabled={isSubmitting}>
                <SaveIcon className="w-4 h-4 mr-2" />
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={onEdit}>
              <EditIcon className="w-4 h-4 mr-2" />
              Edit Ticket
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Component: Ticket Edit Form
function TicketEditForm({
  editData,
  assignableUsers,
  canAssign,
  onChange,
}: {
  editData: EditTicketData;
  assignableUsers: Profile[];
  canAssign: boolean;
  onChange: (data: Partial<EditTicketData>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-2">
          Description
        </label>
        <Textarea
          id="description"
          value={editData.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={6}
          placeholder="Ticket description"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="priority" className="block text-sm font-medium mb-2">
            Priority
          </label>
          <Select
            value={editData.priority}
            onValueChange={(value) =>
              onChange({ priority: value as TicketPriority })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
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
              onValueChange={(value) => onChange({ assigned_to: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {assignableUsers.map((user) => (
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
  );
}

// Component: Comment Item
function CommentItem({ comment }: { comment: Comment }) {
  return (
    <div className="border-b pb-4 last:border-b-0">
      <div className="flex items-start space-x-3">
        <Avatar className="w-8 h-8">
          <AvatarImage src={(comment as any).author?.avatar_url} />
          <AvatarFallback>
            {(comment as any).author?.name?.charAt(0) || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-sm">
              {(comment as any).author?.name || "Unknown User"}
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
  );
}

// Component: Add Comment Form
function AddCommentForm({
  newComment,
  commentType,
  canAddInternal,
  isSubmitting,
  onCommentChange,
  onTypeChange,
  onSubmit,
}: {
  newComment: string;
  commentType: CommentType;
  canAddInternal: boolean;
  isSubmitting: boolean;
  onCommentChange: (value: string) => void;
  onTypeChange: (type: CommentType) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="border-t pt-4">
      <div className="space-y-3">
        <div>
          <label htmlFor="comment" className="block text-sm font-medium mb-2">
            Add Comment
          </label>
          <Textarea
            id="comment"
            value={newComment}
            onChange={(e) => onCommentChange(e.target.value)}
            placeholder="Write your comment..."
            rows={3}
          />
        </div>

        {canAddInternal && (
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="commentType"
                value="comment"
                checked={commentType === "comment"}
                onChange={(e) => onTypeChange(e.target.value as CommentType)}
              />
              <span className="text-sm">Public Comment</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="commentType"
                value="internal_note"
                checked={commentType === "internal_note"}
                onChange={(e) => onTypeChange(e.target.value as CommentType)}
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
  );
}

// Component: Ticket Info Sidebar
function TicketInfoSidebar({ ticket }: { ticket: Ticket }) {
  return (
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
              {(ticket as any).created_by_profile?.name || "Unknown"}
            </p>
          </div>
        </div>

        {(ticket as any).assigned_to_profile && (
          <div className="flex items-center space-x-3">
            <UserIcon className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Assigned to</p>
              <p className="text-sm text-muted-foreground">
                {(ticket as any).assigned_to_profile.name}
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

        {ticket.updated_at && ticket.updated_at !== ticket.created_at && (
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
  );
}

// Component: Attachments Sidebar
function AttachmentsSidebar({ attachments }: { attachments: Attachment[] }) {
  if (attachments.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <PaperclipIcon className="w-4 h-4" />
          <span>Attachments ({attachments.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-2 border rounded"
            >
              <span className="text-sm truncate">{attachment.filename}</span>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(attachment.file_size)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Custom hook for ticket management
function useTicketManagement(ticket: Ticket, assignableUsers: Profile[]) {
  const { user } = useAuth();
  const permissions = useRolePermissions();
  const submit = useSubmit();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<EditTicketData>({
    title: ticket.title || "",
    description: ticket.description || "",
    priority: ticket.priority || "medium",
    assigned_to: ticket.assigned_to || "unassigned",
  });
  const [newComment, setNewComment] = useState("");
  const [commentType, setCommentType] = useState<CommentType>("comment");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canEdit =
    permissions.canManageAllTickets || ticket.created_by === user?.id;
  const canAssign = permissions.canAssignTickets;

  // Update edit data when ticket changes
  useEffect(() => {
    setEditData({
      title: ticket.title || "",
      description: ticket.description || "",
      priority: ticket.priority || "medium",
      assigned_to: ticket.assigned_to || "unassigned",
    });
  }, [ticket]);

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
        editData.assigned_to === "unassigned" || !editData.assigned_to ? "" : editData.assigned_to
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
      formData.append("actionType", "transitionStatus");
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
        "isInternal",
        commentType === "internal_note" ? "true" : "false"
      );

      submit(formData, { method: "POST" });
    } catch (error) {
      console.error("Comment error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActionResult = (
    actionData: TicketDetailsActionData | undefined
  ) => {
    if (!actionData) return;

    if (actionData.success) {
      console.log("✅ Success:", actionData.message);

      if (actionData.message?.includes("Comment added")) {
        setNewComment("");
        setCommentType("comment");
      }
    } else {
      alert(actionData.message);
    }
  };

  return {
    isEditing,
    setIsEditing,
    editData,
    setEditData,
    newComment,
    setNewComment,
    commentType,
    setCommentType,
    isSubmitting,
    canEdit,
    canAssign,
    handleSaveTicket,
    handleStatusTransition,
    handleAddComment,
    handleActionResult,
  };
}

// Main component
export default function TicketDetailsPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const navigate = useNavigate();

  // Handle loading state
  if (navigation.state === "loading") {
    return <RouteSkeleton />;
  }

  // Handle loader data
  if (!loaderData) {
    return <RouteSkeleton />;
  }

  const { ticket, comments, attachments, assignableUsers, error } =
    loaderData as TicketDetailsLoaderData;

  // Handle errors
  if (error) {
    return (
      <ErrorDisplay error={error} onRetry={() => window.location.reload()} />
    );
  }

  // Handle missing ticket
  if (!ticket || !ticket.id) {
    return (
      <ErrorDisplay
        error="Ticket not found"
        onRetry={() => navigate("/tickets")}
      />
    );
  }

  const {
    isEditing,
    setIsEditing,
    editData,
    setEditData,
    newComment,
    setNewComment,
    commentType,
    setCommentType,
    isSubmitting,
    canEdit,
    canAssign,
    handleSaveTicket,
    handleStatusTransition,
    handleAddComment,
    handleActionResult,
  } = useTicketManagement(ticket, assignableUsers);

  // Handle action results
  useEffect(() => {
    handleActionResult(actionData as TicketDetailsActionData);
  }, [actionData, handleActionResult]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-full mx-auto p-6">
        <TicketHeader
          ticket={ticket}
          isEditing={isEditing}
          canEdit={canEdit}
          isSubmitting={isSubmitting}
          onEdit={() => setIsEditing(true)}
          onSave={handleSaveTicket}
          onCancel={() => setIsEditing(false)}
        />

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
                  <TicketEditForm
                    editData={editData}
                    assignableUsers={assignableUsers}
                    canAssign={canAssign}
                    onChange={(updates) =>
                      setEditData((prev) => ({ ...prev, ...updates }))
                    }
                  />
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
                {comments.map((comment) => (
                  <CommentItem key={comment.id} comment={comment} />
                ))}

                <AddCommentForm
                  newComment={newComment}
                  commentType={commentType}
                  canAddInternal={canEdit}
                  isSubmitting={isSubmitting}
                  onCommentChange={setNewComment}
                  onTypeChange={setCommentType}
                  onSubmit={handleAddComment}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <TicketInfoSidebar ticket={ticket} />
            <AttachmentsSidebar attachments={attachments} />
          </div>
        </div>
      </div>
    </div>
  );
}
