import { Clock, MessageCircle, Paperclip, Trash2, User } from "lucide-react";
import { useState } from "react";
import type { Ticket } from "~/lib/types";
import { formatDate, getShortId, truncateString } from "../lib/utils";
import PriorityBadge from "./PriorityBadge";
import StatusBadge from "./StatusBadge";
import { Button } from "./ui/button";

interface TicketCardProps {
  ticket: Ticket;
  onClick?: () => void;
  onDelete?: (ticketId: string) => void;
  canDelete?: boolean;
  className?: string;
}

// Delete Confirmation Modal Component
function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  ticketTitle,
  isDeleting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  ticketTitle: string;
  isDeleting: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-black">Delete Ticket</h2>
        </div>

        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-2">
            Are you sure you want to delete this ticket?
          </p>
          <p className="text-sm font-medium text-foreground bg-muted p-3 rounded">
            {truncateString(ticketTitle, 60)}
          </p>
          <p className="text-xs text-red-600 mt-2">
            This action cannot be undone. All comments and attachments will be
            permanently deleted.
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Ticket"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function TicketCard({
  ticket,
  onClick,
  onDelete,
  canDelete = false,
  className = "",
}: TicketCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    console.log("TicketCard handleDelete called for ticket:", ticket.id);
    if (!onDelete) {
      console.log("No onDelete function provided");
      return;
    }

    setIsDeleting(true);
    try {
      console.log("Calling onDelete function with ticket ID:", ticket.id);
      await onDelete(ticket.id);
      setShowDeleteModal(false);
      console.log("Delete function completed");
    } catch (error) {
      console.error("Error deleting ticket:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card click if clicking on delete button
    if ((e.target as HTMLElement).closest("[data-delete-button]")) {
      return;
    }
    onClick?.();
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        className={`bg-card rounded-2xl border border-border p-6 hover:shadow-xl hover:border-border/80 transition-all duration-300 cursor-pointer group transform hover:-translate-y-1 relative ${className}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0 pr-8">
            <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
              {ticket.title}
            </h3>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-lg">
                #{getShortId(ticket.id)}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            {canDelete && (
              <div data-delete-button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 border border-gray-200 shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200"
                  title="Delete ticket"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteModal(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-muted-foreground text-sm mb-6 line-clamp-3 leading-relaxed">
          {truncateString(
            ticket.description?.replace(/<[^>]*>/g, "") ||
              "No description provided.",
            120
          )}
        </p>

        {/* Tags (if available) */}
        {ticket.tags && ticket.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {ticket.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-lg"
              >
                {tag}
              </span>
            ))}
            {ticket.tags.length > 3 && (
              <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-lg">
                +{ticket.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span className="font-medium">
                {formatDate(ticket.created_at)}
              </span>
            </div>
            {ticket.creator_name && (
              <div className="flex items-center space-x-1">
                <User className="w-3 h-3" />
                <span className="font-medium">{ticket.creator_name}</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {/* Comments count */}
            <div className="flex items-center space-x-1 text-muted-foreground">
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs font-medium">
                {ticket.comments?.length || 0}
              </span>
            </div>

            {/* Attachments count */}
            <div className="flex items-center space-x-1 text-muted-foreground">
              <Paperclip className="w-4 h-4" />
              <span className="text-xs font-medium">
                {ticket.attachments?.length || 0}
              </span>
            </div>

            {/* Assignee */}
            {ticket.assignee_name && (
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-xs font-bold text-primary-foreground">
                    {ticket.assignee_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        ticketTitle={ticket.title}
        isDeleting={isDeleting}
      />
    </>
  );
}
