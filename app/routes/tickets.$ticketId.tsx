import {
  ArrowLeft,
  ArrowRightIcon,
  CheckCircle2Icon,
  CheckIcon,
  DownloadIcon,
  EditIcon,
  MessageCircleIcon,
  PaperclipIcon,
  PlayCircleIcon,
  PlusIcon,
  RotateCcwIcon,
  SaveIcon,
  TrashIcon,
  UserIcon,
  XCircleIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Link,
  redirect,
  useActionData,
  useFetcher,
  useLoaderData,
  useNavigate,
  useNavigation,
  useSubmit,
} from "react-router";
import PriorityBadge from "~/components/PriorityBadge";
import { ToastContainer, useToast } from "~/components/Toast";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
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
import {
  canUserEditTicket,
  getValidStatusTransitions,
  ROLE_PERMISSIONS,
} from "~/lib/role-utils";
import { createSupabaseServerClient } from "~/lib/supabase-server";
import type {
  Attachment,
  Comment,
  Profile,
  Ticket,
  TicketPriority,
  TicketStatus,
} from "~/lib/types";
import {
  formatDate,
  formatFileSize,
  getFileIcon,
  isImageFileByName,
  sanitizeHtml,
} from "~/lib/utils";
import { createServices } from "~/services";
import type { Route } from "./+types/tickets.$ticketId";
import { ConfirmDialog } from "~/components/ConfirmationModal";
import { RichTextEditor } from "~/components/RichTextEditor";
import { TicketDetailsSkeleton } from "~/components/LoadingComponents";

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
  error?: string;
}

interface EditTicketData {
  title: string;
  description: string;
  priority: TicketPriority;
  assigned_to: string | undefined;
  attachments?: File[];
  delete_attachment_ids?: [];
}

type CommentType = "comment" | "internal_note";
type ActionType =
  | "updateTicket"
  | "updateStatus"
  | "addComment"
  | "deleteAttachment";

// Constants
const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "bg-primary" },
  { value: "medium", label: "Medium", color: "bg-yellow-500" },
  { value: "high", label: "High", color: "bg-orange-500" },
  { value: "critical", label: "Critical", color: "bg-red-500" },
] as const;

const STATUS_OPTIONS = [
  { value: "open", label: "Open", color: "bg-primary", icon: XCircleIcon },
  {
    value: "in_progress",
    label: "In Progress",
    color: "bg-yellow-500",
    icon: PlayCircleIcon,
  },
  {
    value: "resolved",
    label: "Resolved",
    color: "bg-green-500",
    icon: CheckCircle2Icon,
  },
  {
    value: "reopened",
    label: "Reopened",
    color: "bg-orange-500",
    icon: RotateCcwIcon,
  },
  { value: "closed", label: "Closed", color: "bg-gray-500", icon: XCircleIcon },
] as const;

// Loader function
export async function loader({
  params,
  request,
}: Route.LoaderArgs): Promise<TicketDetailsLoaderData> {
  const { supabase } = createSupabaseServerClient(request);
  const services = createServices(supabase);
  const ticketId = params.ticketId;

  if (!ticketId) {
    throw new Response("Ticket ID is required", { status: 400 });
  }

  try {
    const [ticket, comments, attachments, assignableUsers] = await Promise.all([
      services.tickets.getTicketById(ticketId),
      services.comments.getCommentsByTicketId(ticketId),
      services.attachments.getAttachmentsByTicketId(ticketId),
      services.users.getAssignableUsers(),
    ]);

    if (!ticket) {
      throw new Response("Ticket not found", { status: 404 });
    }

    // Add URLs to attachments
    const attachmentsWithUrls = await Promise.all(
      attachments.map(async (attachment) => {
        try {
          const urlResult = await services.attachments.getAttachmentUrl(
            attachment.storage_path
          );
          return {
            ...attachment,
            url:
              typeof urlResult === "string" ? urlResult : urlResult?.url || "",
          };
        } catch (error) {
          return {
            ...attachment,
            url: "",
          };
        }
      })
    );

    return {
      ticket,
      comments,
      attachments: attachmentsWithUrls,
      assignableUsers,
    };
  } catch (error) {
    console.error("Error loading ticket details:", error);
    return {
      ticket: {} as Ticket,
      comments: [],
      attachments: [],
      assignableUsers: [],
      error: "Failed to load ticket details",
    };
  }
}

export async function action({
  params,
  request,
}: Route.ActionArgs): Promise<TicketDetailsActionData> {
  const { supabase, response } = createSupabaseServerClient(request);
  const services = createServices(supabase);
  const ticketId = params.ticketId;

  if (!ticketId) {
    throw new Response("Ticket ID is required", { status: 400 });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw redirect("/login", { headers: response.headers });
  }

  const formData = await request.formData();
  const actionType = formData.get("actionType") as ActionType;

  try {
    switch (actionType) {
      case "updateTicket": {
        console.log("Coming here");
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const priority = formData.get("priority") as TicketPriority;
        const assigned_to = formData.get("assigned_to") as string | null;
        const status = formData.get("status") as TicketStatus | null;

        const attachments: File[] = [];
        for (const [key, value] of formData.entries()) {
          if (key.startsWith("attachment_") && value instanceof File) {
            // Only add files that have content (size > 0)
            if (value.size > 0) {
              attachments.push(value);
            }
          }
        }
        console.log(formData);

        await services.tickets.updateTicket(ticketId, {
          title,
          description,
          priority,
          assigned_to,
          ...(status ? { status } : {}),
        });

        const deleteIds = formData.getAll("delete_attachment_ids") as string[];
        if (deleteIds && deleteIds.length > 0) {
          console.log("Deleting attachments:", deleteIds);
          for (const id of deleteIds) {
            const deleteResult =
              await services.attachments.deleteAttachment(id);
            if (!deleteResult.success) {
              console.error("Failed to delete attachment:", deleteResult.error);
            }
          }
        }

        if (attachments && attachments.length > 0) {
          for (const file of attachments) {
            console.log(file);
            const uploadResult = await services.attachments.uploadAttachment(
              ticketId,
              file,
              user.id
            );

            if (!uploadResult.success) {
              console.error("Failed to upload attachment:", uploadResult.error);
            }
          }
        }

        return { success: true, message: "Ticket updated successfully" };
      }

      case "updateStatus": {
        const status = formData.get("status") as TicketStatus;

        // Get the authenticated user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError || !user) {
          return {
            success: false,
            message: "Authentication required",
            error: "User not authenticated",
          };
        }

        // Get user profile for role and actor name
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, role")
          .eq("id", user.id)
          .single();

        if (!profile) {
          return {
            success: false,
            message: "User profile not found",
            error: "Profile does not exist",
          };
        }

        // Get ticket details for validation and notifications
        const ticket = await services.tickets.getTicketById(ticketId);
        if (!ticket) {
          return {
            success: false,
            message: "Ticket not found",
            error: "Ticket does not exist",
          };
        }

        // Import role-based validation functions
        const { canTransitionStatus } = await import("~/lib/role-utils");

        // Validate the status transition based on role and workflow
        const userRole = (profile.role as "admin" | "agent" | "user") || "user";
        const canTransition = canTransitionStatus(
          ticket.status,
          status,
          userRole,
          user.id,
          { created_by: ticket.created_by, assigned_to: ticket.assigned_to }
        );

        if (!canTransition) {
          return {
            success: false,
            message: "Status transition not allowed",
            error: `You cannot change status from ${ticket.status} to ${status}`,
          };
        }

        // Special handling for agent transitions - auto-assign if not assigned
        if (
          userRole === "agent" &&
          status === "in_progress" &&
          !ticket.assigned_to
        ) {
          await services.tickets.updateTicket(ticketId, {
            status,
            assigned_to: user.id,
          });
        } else {
          await services.tickets.updateTicket(ticketId, { status });
        }

        // Send notifications to relevant users
        const recipientIds = [ticket.created_by];
        if (ticket.assigned_to && ticket.assigned_to !== ticket.created_by) {
          recipientIds.push(ticket.assigned_to);
        }

        await services.notifications.notifyTicketEvent({
          ticketId,
          type: "status_update",
          actorId: user.id,
          actorName: profile?.name || "Unknown User",
          recipientIds,
          title: "Ticket Status Updated",
          message: `Ticket status changed to ${status.replace("_", " ")}`,
        });
        return { success: true, message: "Ticket status updated successfully" };
      }

      case "addComment": {
        const content = formData.get("content") as string;
        const type = formData.get("type") as "comment" | "internal";

        // Get the authenticated user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError || !user) {
          return {
            success: false,
            message: "Authentication required",
            error: "User not authenticated",
          };
        }

        // Get user profile for actor name
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", user.id)
          .single();

        // Get ticket details for notifications
        const ticket = await services.tickets.getTicketById(ticketId);
        if (!ticket) {
          return {
            success: false,
            message: "Ticket not found",
            error: "Ticket does not exist",
          };
        }

        await services.comments.createComment({
          ticket_id: ticketId,
          user_id: user.id,
          content,
          comment_type: type,
          is_internal: type === "internal",
        });

        // Send notifications to relevant users (only for public comments)
        if (type === "comment") {
          const recipientIds = [ticket.created_by];
          if (ticket.assigned_to && ticket.assigned_to !== ticket.created_by) {
            recipientIds.push(ticket.assigned_to);
          }

          await services.notifications.notifyTicketEvent({
            ticketId,
            type: "comment",
            actorId: user.id,
            actorName: profile?.name || "Unknown User",
            recipientIds,
            title: "New Comment Added",
            message: `New comment added to your ticket`,
          });
        }
        return { success: true, message: "Comment added successfully" };
      }

      case "deleteAttachment": {
        const attachmentId = formData.get("attachmentId") as string;

        await services.attachments.deleteAttachment(attachmentId);
        return { success: true, message: "Attachment deleted successfully" };
      }

      default:
        return {
          success: false,
          message: "Invalid action type",
          error: "Unknown action",
        };
    }
  } catch (error) {
    console.error("Ticket action error:", error);
    return {
      success: false,
      message: "Failed to perform action",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Component: Status Badge
function StatusBadge({ status }: { status: TicketStatus }) {
  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case "open":
        return "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "resolved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "closed":
        return "bg-gray-500 text-white dark:bg-gray-300 dark:text-black";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  return (
    <Badge className={`${getStatusColor(status)}`}>
      {status.replace("_", " ").toUpperCase()}
    </Badge>
  );
}

// Component: Status Update Dialog
function StatusUpdateDialog({
  currentStatus,
  onStatusUpdate,
  isSubmitting,
  userRole,
  userId,
  ticket,
}: {
  currentStatus: TicketStatus;
  onStatusUpdate: (status: TicketStatus) => void;
  isSubmitting: boolean;
  userRole: "admin" | "agent" | "user";
  userId: string;
  ticket: Ticket;
}) {
  const [selectedStatus, setSelectedStatus] =
    useState<TicketStatus>(currentStatus);
  const [isOpen, setIsOpen] = useState(false);

  // Get valid transitions for the current user and ticket
  const validTransitions = getValidStatusTransitions(
    currentStatus,
    userRole,
    userId,
    { created_by: ticket.created_by, assigned_to: ticket.assigned_to }
  );

  // If no valid transitions, don't show the button
  if (validTransitions.length === 0) {
    return null;
  }

  const handleSubmit = () => {
    if (selectedStatus !== currentStatus) {
      onStatusUpdate(selectedStatus);
      setIsOpen(false);
    }
  };

  const handleClose = () => {
    setSelectedStatus(currentStatus);
    setIsOpen(false);
  };

  const getCurrentStatusInfo = () => {
    const statusOption = STATUS_OPTIONS.find(
      (opt) => opt.value === currentStatus
    );
    return (
      statusOption || { label: currentStatus, icon: XCircleIcon, color: "gray" }
    );
  };

  const getSelectedStatusInfo = () => {
    const statusOption = STATUS_OPTIONS.find(
      (opt) => opt.value === selectedStatus
    );
    return (
      statusOption || {
        label: selectedStatus,
        icon: XCircleIcon,
        color: "gray",
      }
    );
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="hover:bg-primary/5 transition-colors"
      >
        <EditIcon className="w-4 h-4 mr-2" />
        Update Status
      </Button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg mx-4 border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <EditIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Update Status
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Change the ticket status to track progress
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <XCircleIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-6">
            {/* Current Status */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Current Status
              </Label>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                {(() => {
                  const currentInfo = getCurrentStatusInfo();
                  const Icon = currentInfo.icon;
                  return (
                    <>
                      <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {currentInfo.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Current ticket status
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Status Options */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Available Status Changes
              </Label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {validTransitions.map((transition) => {
                  const statusOption = STATUS_OPTIONS.find(
                    (opt) => opt.value === transition.to
                  );
                  const Icon = statusOption?.icon || XCircleIcon;
                  const isSelected = selectedStatus === transition.to;

                  return (
                    <div
                      key={transition.to}
                      onClick={() => setSelectedStatus(transition.to)}
                      className={`
                        p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                        ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800"
                        }
                      `}
                    >
                      <div className="flex items-start space-x-3">
                        <div
                          className={`
                          p-2 rounded-lg transition-colors
                          ${
                            isSelected
                              ? "bg-primary text-white"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                          }
                        `}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className={`
                            font-medium transition-colors
                            ${
                              isSelected
                                ? "text-primary"
                                : "text-gray-900 dark:text-white"
                            }
                          `}
                          >
                            {transition.label}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {transition.description}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="flex-shrink-0">
                            <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                              <CheckIcon className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Preview */}
            {selectedStatus !== currentStatus && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Preview Change
                </Label>
                <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <ArrowRightIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <div className="text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Status will change to:{" "}
                    </span>
                    <span className="font-medium text-green-700 dark:text-green-300">
                      {getSelectedStatusInfo().label}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 rounded-b-xl border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="min-w-[80px]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={selectedStatus === currentStatus || isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Updating...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <CheckIcon className="w-4 h-4" />
                    <span>Update Status</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
// Component: Ticket Header
function TicketHeader({
  ticket,
  isEditing,
  canEdit,
  isSaving,
  isSubmitting,
  hasChanges,
  onEdit,
  onSave,
  onCancel,
  onStatusUpdate,
  userRole,
  userId,
}: {
  ticket: Ticket;
  isEditing: boolean;
  canEdit: boolean;
  isSaving: boolean;
  isSubmitting: boolean;
  hasChanges: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onStatusUpdate: (status: TicketStatus) => void;
  userRole: "admin" | "agent" | "user";
  userId: string;
}) {
  const navigate = useNavigate();

  return (
    <div className="bg-card border rounded-sm p-6 mb-6">
      {/* Navigation and Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-4 items-center mr-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="cursor-pointer hover:bg-muted p-2 rounded-lg transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-foreground break-words">
            {ticket.title}
          </h1>
          <span className="items-center">
            <StatusBadge status={ticket.status} />
          </span>
        </div>
        <div className="flex items-center gap-4">
          {/* Status Update */}
          {canEdit && !isEditing && (
            <StatusUpdateDialog
              currentStatus={ticket.status}
              onStatusUpdate={onStatusUpdate}
              isSubmitting={isSubmitting}
              userRole={userRole}
              userId={userId}
              ticket={ticket}
            />
          )}

          {/* Edit Controls */}
          {canEdit && ticket.status !== "closed" && (
            <>
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCancel}
                    disabled={isSaving}
                  >
                    <XIcon className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={onSave}
                    disabled={isSaving || !hasChanges}
                  >
                    <SaveIcon className="w-4 h-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={onEdit}>
                  <EditIcon className="w-4 h-4 mr-2" />
                  Edit Ticket
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Ticket Title and Metadata */}
      <div className="space-y-3 space-x-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 px-6">
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center space-x-1">
                <span className="font-medium">ID:</span>
                <code className="bg-muted px-2 py-1 rounded text-xs">
                  {ticket.id?.slice(-8)}
                </code>
              </span>
              <span className="flex items-center gap-2">
                <span>Priority:</span>
                <PriorityBadge priority={ticket.priority} />{" "}
              </span>
            </div>
          </div>
        </div>

        {/* Priority and Assignment Info */}
        <div className="flex items-center px-6 pt-2 border-t">
          {ticket.assigned_to && (
            <div className="flex items-center space-x-2">
              <UserIcon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Assigned to:
              </span>
              <span className="text-sm font-medium">
                {ticket.assigned_to_profile?.name || "Unknown User"}
              </span>
            </div>
          )}

          <div className="flex items-center px-6 gap-2">
            <UserIcon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Created by:
            </span>
            <span className="text-sm font-medium">
              {ticket.created_by_profile?.name || "Unknown User"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Component: Ticket Edit Form
function TicketEditForm({
  editData,
  assignableUsers,
  canAssign,
  existingAttachments,
  onChange,
  onFileUpload,
  onRemoveFile,
  onDeleteAttachment,
}: {
  editData: EditTicketData;
  assignableUsers: Profile[];
  canAssign: boolean;
  existingAttachments: Attachment[];
  onChange: (data: Partial<EditTicketData>) => void;
  onFileUpload: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onDeleteAttachment: (attachmentId: string) => void;
}) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFileUpload(files);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="edit-title" className="text-base font-semibold">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="edit-title"
          value={editData.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Ticket title"
          className="text-base"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-base font-semibold">
          Description <span className="text-destructive">*</span>
        </Label>
        <RichTextEditor
          value={editData.description}
          onChange={(value) => onChange({ description: value })}
          placeholder="Provide detailed information about the issue. Include steps to reproduce, expected behavior, and any error messages..."
        />
      </div>

      {/* Priority */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Priority</Label>
        <Select
          value={editData.priority || "medium"}
          onValueChange={(value) =>
            onChange({ priority: value as TicketPriority })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${option.color}`} />
                  <span>{option.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Assignment */}
      {canAssign && (
        <div className="space-y-2">
          <Label className="text-base font-semibold">Assign To</Label>
          <Select
            value={editData.assigned_to || "unassigned"}
            onValueChange={(value) =>
              onChange({ assigned_to: value || undefined })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {assignableUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Existing Attachments */}
      {existingAttachments.length > 0 && (
        <div className="space-y-2">
          <Label className="text-base font-semibold">Current Attachments</Label>
          <div className="space-y-2">
            {existingAttachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">
                    {getFileIcon(attachment.file_name)}
                  </span>
                  <div>
                    <p className="text-sm font-medium">
                      {attachment.file_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.file_size)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteAttachment(attachment.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Attachments */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">
          Add Attachments{" "}
          {editData.attachments &&
            editData.attachments.length > 0 &&
            `(${editData.attachments.length})`}
        </Label>
        {editData.attachments && editData.attachments.length > 0 && (
          <div className="space-y-2 mb-4">
            {editData.attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getFileIcon(file.name)}</span>
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveFile(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <XIcon className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          <Label htmlFor="file-upload" className="cursor-pointer">
            <div className="space-y-2">
              <PlusIcon className="w-8 h-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to upload files or drag and drop
              </p>
            </div>
          </Label>
        </div>
      </div>
    </div>
  );
}

export default function TicketDetailsPage() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const auth = useAuth();
  const { user, profile } = auth;
  const submit = useSubmit();
  const navigation = useNavigation();
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(
    null
  );
  const { ticket, comments, attachments, assignableUsers } = loaderData;
  const { toasts, removeToast, success, error } = useToast();
  
  const editFetcher = useFetcher();
  
  const [hasChanges, setHasChanges] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<EditTicketData>({
    title: ticket.title || "",
    description: ticket.description || "",
    priority: ticket.priority || "medium",
    assigned_to: ticket.assigned_to || undefined,
    attachments: [],
    delete_attachment_ids: [],
  });
  const [newComment, setNewComment] = useState("");
  const [commentType, setCommentType] = useState<CommentType>("comment");

  const userRole = profile?.role as "admin" | "agent" | "user" | undefined;
  const canEdit =
    user && userRole ? canUserEditTicket(userRole, user.id, ticket) : false;
  const permissions = userRole
    ? ROLE_PERMISSIONS[userRole]
    : ROLE_PERMISSIONS.user;
  const canAssign = permissions.canAssignTickets || false;
  const existingAttachments = attachments.filter((a) => a.id);
  const [deletedAttachments, setDeletedAttachments] = useState<string[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    attachmentId: string | null;
  }>({ open: false, attachmentId: null });

  const isPageLoading = navigation.state === "loading" && 
    navigation.location && 
    !navigation.formData;
  
  const isSubmitting = navigation.state === "submitting";
  const isSaving = editFetcher.state === "submitting";

  const [lastActionData, setLastActionData] = useState<any>(null);
  const [lastEditData, setLastEditData] = useState<any>(null);

  useEffect(() => {
    if (actionData && actionData !== lastActionData) {
      setLastActionData(actionData);
      
      if (actionData.success) {
        success("Success", actionData.message);
        
        if (actionData.message.includes("Comment added")) {
          setNewComment("");
        }
      } else if (actionData.error) {
        error("Error", actionData.error);
      }
    }
  }, [actionData]);

  useEffect(() => {
    if (editFetcher.data && editFetcher.data !== lastEditData) {
      setLastEditData(editFetcher.data);
      
      if (editFetcher.data.success) {
        success("Success", editFetcher.data.message);
        setIsEditing(false);
        setEditData({
          title: ticket.title,
          description: ticket.description,
          priority: ticket.priority,
          assigned_to: ticket.assigned_to || undefined,
          attachments: [],
          delete_attachment_ids: [],
        });
        setDeletedAttachments([]);
      } else if (editFetcher.data.error) {
        error("Error", editFetcher.data.error);
      }
    }
  }, [editFetcher.data]); 

  const handleSaveTicket = async () => {
    const formData = new FormData();
    formData.append("actionType", "updateTicket");
    formData.append("title", editData.title);
    formData.append("description", editData.description);
    formData.append("priority", editData.priority);
    if (editData.assigned_to) {
      formData.append("assigned_to", editData.assigned_to);
    }
    if (editData.attachments && editData.attachments.length > 0) {
      editData.attachments.forEach((file, index) => {
        formData.append(`attachment_${index}`, file);
      });
    }
    if (deletedAttachments.length > 0) {
      deletedAttachments.forEach((id) => {
        formData.append("delete_attachment_ids", id);
      });
    }

    editFetcher.submit(formData, {
      method: "POST",
      encType: "multipart/form-data",
    });
  };

  const handleStatusUpdate = (status: TicketStatus) => {
    const formData = new FormData();
    formData.append("actionType", "updateStatus");
    formData.append("status", status);
    submit(formData, { method: "POST" });
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const formData = new FormData();
    formData.append("actionType", "addComment");
    formData.append("content", newComment);
    formData.append("type", commentType);
    submit(formData, { method: "POST" });
  };

  const handleDeleteAttachment = (attachmentId: string) => {
    const formData = new FormData();
    formData.append("actionType", "deleteAttachment");
    formData.append("attachmentId", attachmentId);
    submit(formData, { method: "POST" });
  };

  const handleFileUpload = (files: File[]) => {
    setEditData((prev) => ({
      ...prev,
      attachments: [...(prev.attachments || []), ...files],
    }));
  };

  const handleRemoveFile = (index: number) => {
    setEditData((prev) => ({
      ...prev,
      attachments: prev.attachments?.filter((_, i) => i !== index) || [],
    }));
  };

  useEffect(() => {
    const changed =
      editData.title !== ticket.title ||
      editData.description !== ticket.description ||
      editData.priority !== ticket.priority ||
      editData.assigned_to !== ticket.assigned_to ||
      (editData.attachments?.length ?? 0) > 0 ||
      (deletedAttachments?.length ?? 0) > 0;

    setHasChanges(changed);
  }, [editData, ticket, deletedAttachments]);

  if (isPageLoading) {
    return <TicketDetailsSkeleton />;
  }
  return (
    <div className="container mx-auto px-4 py-6">
      <TicketHeader
        ticket={ticket}
        isEditing={isEditing}
        canEdit={canEdit}
        isSaving={isSaving}
        isSubmitting={isSubmitting}
        hasChanges={hasChanges}
        onEdit={() => setIsEditing(true)}
        onSave={handleSaveTicket}
        onCancel={() => setIsEditing(false)}
        onStatusUpdate={handleStatusUpdate}
        userRole={userRole || "user"}
        userId={user?.id || ""}
      />

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Main Content - Takes up 3 columns */}
        <div className="xl:col-span-3 space-y-6">
          {/* Ticket Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>Description</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <TicketEditForm
                  editData={editData}
                  assignableUsers={assignableUsers || []}
                  canAssign={canAssign}
                  existingAttachments={existingAttachments.filter(
                    (a) => !deletedAttachments.includes(a.id)
                  )}
                  onChange={(updates) =>
                    setEditData((prev) => ({ ...prev, ...updates }))
                  }
                  onFileUpload={handleFileUpload}
                  onRemoveFile={handleRemoveFile}
                  onDeleteAttachment={(attachmentId) => {
                    setDeletedAttachments((prev) => [...prev, attachmentId]);
                  }}
                />
              ) : (
                <div className="space-y-6">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(ticket.description),
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments Section */}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MessageCircleIcon className="w-5 h-5" />
                  <span>Activity & Comments</span>
                  <Badge variant="secondary" className="ml-2">
                    {(comments || []).length}
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Comments List */}
              <div className="space-y-4">
                {(comments || []).length === 0 ? (
                  <div className="text-center py-2 text-muted-foreground">
                    <p>No comments yet. Be the first to add one!</p>
                  </div>
                ) : (
                  (comments || []).map((comment) => (
                    <div key={comment.id} className="border rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>
                            {comment.author?.name?.charAt(0) ||
                              comment.creator_name?.charAt(0) ||
                              "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-medium text-sm">
                              {comment.author?.name ||
                                comment.creator_name ||
                                "Unknown User"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(comment.created_at)}
                            </span>
                            {comment.comment_type === "internal" && (
                              <Badge variant="secondary" className="text-xs">
                                Internal
                              </Badge>
                            )}
                          </div>
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <div
                              dangerouslySetInnerHTML={{
                                __html: sanitizeHtml(comment.content),
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {/* Add Comment Form */}{" "}
              {ticket.status !== "closed" && (
                <div className="border-t pt-6">
                  <form onSubmit={handleAddComment} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-comment">Add Comment</Label>
                      <Textarea
                        id="new-comment"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write your comment..."
                        rows={3}
                      />
                    </div>

                    {canEdit && (
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="comment"
                            name="commentType"
                            value="comment"
                            checked={commentType === "comment"}
                            onChange={(e) =>
                              setCommentType(e.target.value as CommentType)
                            }
                          />
                          <Label htmlFor="comment">Public Comment</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="internal_note"
                            name="commentType"
                            value="internal_note"
                            checked={commentType === "internal_note"}
                            onChange={(e) =>
                              setCommentType(e.target.value as CommentType)
                            }
                          />
                          <Label htmlFor="internal_note">Internal Note</Label>
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={!newComment.trim() || isSubmitting}
                    >
                      {isSubmitting ? "Adding..." : "Add Comment"}
                    </Button>
                  </form>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Takes up 1 column */}
        <div className="xl:col-span-2 space-y-6">
          {/* Ticket Information */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Information</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Status
                  </Label>
                  <StatusBadge status={ticket.status} />
                </div>
                <div className="flex gap-3">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Priority
                  </Label>
                  <PriorityBadge priority={ticket.priority} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Created
                  </Label>
                  <p className="text-sm">{formatDate(ticket.created_at)}</p>
                </div>
                {ticket.updated_at && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Last Updated
                    </Label>
                    <p className="text-sm">{formatDate(ticket.updated_at)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          {(attachments || []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PaperclipIcon className="w-4 h-4" />
                  <span>Attachments</span>
                  <Badge variant="secondary" className="ml-2">
                    {attachments.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {attachments.map((attachment) => {
                    const isImage = isImageFileByName(attachment.file_name);
                    const fileUrl = attachment.url;

                    return (
                      <div
                        key={attachment.id}
                        className="group border rounded-lg hover:bg-muted/50 transition-colors overflow-hidden"
                      >
                        {/* Image Preview */}
                        {isImage && fileUrl && (
                          <div
                            className="w-full h-32 bg-muted flex items-center justify-center overflow-hidden"
                            onClick={() => setPreviewAttachment(attachment)}
                            title="Preview image"
                          >
                            <img
                              src={fileUrl}
                              alt={attachment.file_name}
                              className="max-w-full max-h-full object-contain"
                              loading="lazy"
                            />
                          </div>
                        )}

                        {/* File Info */}
                        <div className="flex items-center justify-between p-3">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            {!isImage && (
                              <span className="text-2xl flex-shrink-0">
                                {getFileIcon(attachment.file_name)}
                              </span>
                            )}
                            <div className="flex-1 min-w-0">
                              <p
                                className="text-sm font-medium truncate"
                                title={attachment.file_name}
                              >
                                {attachment.file_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(attachment.file_size)}
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (fileUrl) {
                                  window.open(fileUrl, "_blank");
                                }
                              }}
                              disabled={!fileUrl}
                              className="flex-shrink-0"
                              title="Download file"
                            >
                              <DownloadIcon className="w-4 h-4" />
                            </Button>

                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setConfirmDialog({
                                    open: true,
                                    attachmentId: attachment.id,
                                  })
                                }
                                className="flex-shrink-0 text-destructive hover:text-destructive"
                                title="Delete attachment"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <ConfirmDialog
        open={confirmDialog.open}
        title="Delete Attachment?"
        description="Are you sure you want to delete this attachment?"
        confirmText="Delete"
        cancelText="Cancel"
        destructive
        onConfirm={() => {
          if (confirmDialog.attachmentId) {
            handleDeleteAttachment(confirmDialog.attachmentId);
          }
          setConfirmDialog({ open: false, attachmentId: null });
        }}
        onCancel={() => setConfirmDialog({ open: false, attachmentId: null })}
      />
      {previewAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 max-w-2xl w-full relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-900 dark:hover:text-white"
              onClick={() => setPreviewAttachment(null)}
              aria-label="Close preview"
            >
              <XIcon className="w-6 h-6" />
            </button>
            <div className="flex flex-col items-center">
              <h2 className="mb-4 text-lg font-semibold">
                {previewAttachment.file_name}
              </h2>
              {isImageFileByName(previewAttachment.file_name) ? (
                <img
                  src={previewAttachment.url}
                  alt={previewAttachment.file_name}
                  className="max-w-full max-h-[60vh] rounded"
                />
              ) : (
                <div className="text-center">
                  <span className="text-4xl">
                    {getFileIcon(previewAttachment.file_name)}
                  </span>
                  <p className="mt-2 text-sm text-muted-foreground">
                    No preview available
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
