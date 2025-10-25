import { AlertTriangle, ArrowDown, ArrowUp, Minus } from "lucide-react";
import { priorityConfig } from "../lib/constants";
import type { TicketPriority } from "../lib/types";

interface PriorityBadgeProps {
  priority: TicketPriority;
  className?: string;
}

const priorityIcons = {
  low: ArrowDown,
  medium: Minus,
  high: ArrowUp,
  critical: AlertTriangle,
};

const priorityStyles = {
  low: "bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary border border-primary/20 dark:border-primary/30",
  medium:
    "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700/50",
  high: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700/50",
  critical:
    "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700/50",
};

export default function PriorityBadge({
  priority,
  className = "",
}: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  const Icon = priorityIcons[priority];

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-sm text-xs font-medium w-fit whitespace-nowrap ${priorityStyles[priority]} ${className}`}
    >
      <Icon className="w-3 h-3 mr-1.5" />
      {config.label}
    </span>
  );
}
