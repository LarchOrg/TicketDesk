import { statusConfig } from "../lib/constants";
import type { TicketStatus } from "../lib/types";

interface StatusBadgeProps {
  status: TicketStatus;
  className?: string;
}

const statusStyles = {
  open: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700/50",
  in_progress:
    "bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary border border-primary/20 dark:border-primary/30",
  resolved:
    "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700/50",
  reopened:
    "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700/50",
  closed:
    "bg-gray-200 dark:bg-gray-900/100 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700/50",
};

export default function StatusBadge({
  status,
  className = "",
}: StatusBadgeProps) {
  const config = statusConfig[status];

  // Handle case where status config might not exist
  if (!config) {
    return (
      <span
        className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200 ${className}`}
      >
        {status}
      </span>
    );
  }

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold ${statusStyles[status]} ${className}`}
    >
      <Icon className="w-3 h-3 mr-1.5" />
      {config.label}
    </span>
  );
}
