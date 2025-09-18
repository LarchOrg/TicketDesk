import { useAuth } from "../contexts/AuthContext";
import {
  getStatusDisplayInfo,
  getValidStatusTransitions,
  type UserRole,
} from "../lib/role-utils";
import type { TicketStatus } from "../lib/types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface StatusTransitionProps {
  currentStatus: TicketStatus;
  ticket: {
    id: string;
    created_by: string;
    assigned_to?: string | null;
  };
  onStatusChange: (newStatus: TicketStatus, transitionLabel: string) => void;
  disabled?: boolean;
}

export function StatusTransition({
  currentStatus,
  ticket,
  onStatusChange,
  disabled = false,
}: StatusTransitionProps) {
  const { profile } = useAuth();
  const userRole = profile?.role as UserRole;
  const userId = profile?.id || "";

  const validTransitions = getValidStatusTransitions(
    currentStatus,
    userRole,
    userId,
    ticket
  );

  const currentStatusInfo = getStatusDisplayInfo(currentStatus);

  if (validTransitions.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Badge className={currentStatusInfo.color}>
          {currentStatusInfo.label}
        </Badge>
        <span className="text-sm text-gray-500">No actions available</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Current Status:
        </span>
        <Badge className={currentStatusInfo.color}>
          {currentStatusInfo.label}
        </Badge>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Available Actions:
        </span>
        <div className="flex flex-wrap gap-2">
          {validTransitions.map((transition) => {
            const targetStatusInfo = getStatusDisplayInfo(transition.to);
            return (
              <Button
                key={`${transition.from}-${transition.to}`}
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => onStatusChange(transition.to, transition.label)}
                className="flex items-center gap-2"
                title={transition.description}
              >
                {transition.label}
                <Badge
                  variant="secondary"
                  className={`${targetStatusInfo.color} text-xs`}
                >
                  {targetStatusInfo.label}
                </Badge>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Simple status badge component for read-only display
export function StatusBadge({ status }: { status: TicketStatus }) {
  const statusInfo = getStatusDisplayInfo(status);

  return (
    <Badge className={statusInfo.color} title={statusInfo.description}>
      {statusInfo.label}
    </Badge>
  );
}
