import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { priorityConfig, statusConfig, VALIDATION_RULES } from "./constants";
import type { AppError, Ticket, TicketPriority, TicketStatus } from "./types";

/**
 * Utility function to merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date string to a human-readable format
 */
export function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid date";
  }
}

/**
 * Format a date string to a relative time format (e.g., "2h ago", "3d ago")
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return formatDate(dateString);
  } catch (error) {
    console.error("Error formatting relative time:", error);
    return "Unknown time";
  }
}

/**
 * Truncate a string to a specified length and add ellipsis
 */
export function truncateString(str: string, length: number): string {
  if (!str || typeof str !== "string") return "";
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

/**
 * Generate a short ID from a full UUID (first 8 characters)
 */
export function getShortId(id: string): string {
  if (!id || typeof id !== "string") return "";
  return id.slice(0, 8);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeHtml(html: string): string {
  // Basic HTML sanitization - in production, use a proper library like DOMPurify
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/javascript:/gi, "");
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Check if a file type is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

/**
 * Get file extension from filename (handles filenames with multiple dots)
 * @example
 * getFileExtension("report.final.pdf") // returns "pdf"
 * getFileExtension("my.file.name.docx") // returns "docx"
 */
export function getFileExtension(fileName: string): string {
  if (!fileName || typeof fileName !== "string") return "";
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex === -1) return "";
  return fileName.substring(lastDotIndex + 1).toLowerCase();
}

/**
 * Check if a filename is an image based on extension
 */
export function isImageFileByName(fileName: string): boolean {
  const ext = getFileExtension(fileName);
  return ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(ext);
}

/**
 * Get file icon emoji based on file extension
 */
export function getFileIcon(fileName: string): string {
  const ext = getFileExtension(fileName);

  switch (ext) {
    case "pdf":
      return "📄";
    case "doc":
    case "docx":
      return "📝";
    case "xls":
    case "xlsx":
      return "📊";
    case "ppt":
    case "pptx":
      return "📊";
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
    case "svg":
    case "bmp":
      return "🖼️";
    case "zip":
    case "rar":
    case "7z":
      return "📦";
    case "txt":
      return "📃";
    case "csv":
      return "📋";
    case "mp4":
    case "avi":
    case "mov":
      return "🎥";
    case "mp3":
    case "wav":
      return "🎵";
    case "html":
    case "css":
    case "js":
    case "ts":
    case "jsx":
    case "tsx":
      return "💻";
    default:
      return "📎";
  }
}

/**
 * Sanitize filename for safe storage (removes special characters)
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName || typeof fileName !== "string") return "";

  // Get the extension first
  const ext = getFileExtension(fileName);
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf("."));

  // Replace special characters with underscores, keep dots, hyphens, and alphanumeric
  const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9.-]/g, "_");

  return ext ? `${sanitizedName}.${ext}` : sanitizedName;
}

/**
 * Validate file size against maximum allowed size
 */
export function isValidFileSize(file: File, maxSizeMB: number): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * Get status configuration with fallback
 */
export function getStatusInfo(status: TicketStatus) {
  return statusConfig[status] || statusConfig.open;
}

/**
 * Get priority configuration with fallback
 */
export function getPriorityInfo(priority: TicketPriority) {
  return priorityConfig[priority] || priorityConfig.medium;
}

/**
 * Sort tickets by priority (critical first) and then by creation date
 */
export function sortTicketsByPriority(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort((a, b) => {
    const priorityA = getPriorityInfo(a.priority).weight;
    const priorityB = getPriorityInfo(b.priority).weight;

    if (priorityA !== priorityB) {
      return priorityB - priorityA; // Higher priority first
    }

    // If same priority, sort by creation date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

/**
 * Filter tickets based on search criteria
 */
export function filterTickets(
  tickets: Ticket[],
  filters: {
    status?: string;
    priority?: string;
    search?: string;
  }
): Ticket[] {
  return tickets.filter((ticket) => {
    // Status filter
    if (
      filters.status &&
      filters.status !== "all" &&
      ticket.status !== filters.status
    ) {
      return false;
    }

    // Priority filter
    if (
      filters.priority &&
      filters.priority !== "all" &&
      ticket.priority !== filters.priority
    ) {
      return false;
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const titleMatch = ticket.title.toLowerCase().includes(searchLower);
      const descriptionMatch = ticket.description
        .toLowerCase()
        .includes(searchLower);
      const idMatch = ticket.id.toLowerCase().includes(searchLower);

      if (!titleMatch && !descriptionMatch && !idMatch) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Create an error object with consistent structure
 */
export function createError(
  message: string,
  code?: string,
  details?: unknown
): AppError {
  return {
    message,
    code,
    details,
  };
}

/**
 * Handle async operations with error catching
 */
export async function handleAsync<T>(
  promise: Promise<T>
): Promise<[T | null, AppError | null]> {
  try {
    const data = await promise;
    return [data, null];
  } catch (error) {
    const appError = createError(
      error instanceof Error ? error.message : "An unknown error occurred",
      "ASYNC_ERROR",
      error
    );
    return [null, appError];
  }
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Generate a random ID (for temporary use)
 */
export function generateTempId(): string {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array)
 */
export function isEmpty(value: any): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

export const getStatusColor = (status: string) => {
  switch (status) {
    case "open":
      return "bg-red-100 text-red-800 border-red-200";
    case "in_progress":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "waiting":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "closed":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export function validateTicketData(data: {
  title: string;
  description?: string;
  priority?: string;
  status?: string;
}): string | undefined {
  if (!data.title?.trim()) {
    return "Title is required";
  }

  if (data.title.trim().length < VALIDATION_RULES.TITLE_MIN_LENGTH) {
    return `Title must be at least ${VALIDATION_RULES.TITLE_MIN_LENGTH} characters`;
  }

  if (data.title.trim().length > VALIDATION_RULES.TITLE_MAX_LENGTH) {
    return `Title must be less than ${VALIDATION_RULES.TITLE_MAX_LENGTH} characters`;
  }

  if (!data.description?.trim()) {
    return "Description is required";
  }

  if (
    data.description.trim().length < VALIDATION_RULES.DESCRIPTION_MIN_LENGTH
  ) {
    return `Description must be at least ${VALIDATION_RULES.DESCRIPTION_MIN_LENGTH} characters`;
  }

  if (
    data.description.trim().length > VALIDATION_RULES.DESCRIPTION_MAX_LENGTH
  ) {
    return `Description must be less than ${VALIDATION_RULES.DESCRIPTION_MAX_LENGTH} characters`;
  }
}
