import { AlertCircle, FileText, Upload, X } from "lucide-react";
import React, { useState } from "react";
import type { FormState, Profile, TicketFormData } from "~/lib/types";
import { RichTextEditor } from "./RichTextEditor";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface TicketFormProps {
  onSubmit: (data: TicketFormData) => void;
  initialData?: Partial<TicketFormData>;
  isEditing?: boolean;
  className?: string;
  assignableUsers?: Profile[];
  isSubmitting?: boolean;
}

export default function TicketForm({
  onSubmit,
  initialData,
  isEditing = false,
  className = "",
  assignableUsers = [],
  isSubmitting = false,
}: TicketFormProps): React.ReactElement {
  const [formData, setFormData] = useState<TicketFormData>({
    title: initialData?.title || "",
    description: initialData?.description || "",
    priority: initialData?.priority || "medium",
    assigned_to:
      initialData?.assigned_to && initialData.assigned_to.trim() !== ""
        ? initialData.assigned_to
        : "unassigned",
    attachments: [],
  });

  const [files, setFiles] = useState<File[]>([]);
  const [formState, setFormState] = useState<FormState>({
    isSubmitting: false,
    error: undefined,
    success: false,
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(event.target.files || []);

    // Validate file sizes (10MB max per file)
    const invalidFiles = uploadedFiles.filter(
      (file) => file.size > 10 * 1024 * 1024
    );
    if (invalidFiles.length > 0) {
      setFormState((prev) => ({
        ...prev,
        error: `Some files exceed 10MB limit: ${invalidFiles.map((f) => f.name).join(", ")}`,
      }));
      return;
    }

    setFiles((prev) => [...prev, ...uploadedFiles]);
    setFormData((prev) => ({
      ...prev,
      attachments: [...(prev.attachments || []), ...uploadedFiles],
    }));
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments?.filter((_, i) => i !== index) || [],
    }));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setFormState((prev) => ({ ...prev, error: undefined }));

    // Validate required fields
    if (!formData.title.trim()) {
      setFormState((prev) => ({
        ...prev,
        error: "Title is required",
      }));
      return;
    }

    if (formData.title.trim().length < 3) {
      setFormState((prev) => ({
        ...prev,
        error: "Title must be at least 3 characters long",
      }));
      return;
    }

    if (formData.title.trim().length > 200) {
      setFormState((prev) => ({
        ...prev,
        error: "Title must be less than 200 characters",
      }));
      return;
    }

    if (!formData.description.trim()) {
      setFormState((prev) => ({
        ...prev,
        error: "Description is required",
      }));
      return;
    }
    if (formData.description.trim().length > 5000) {
      setFormState((prev) => ({
        ...prev,
        error: "Description must be less than 5000 characters",
      }));
      return;
    }

    if (
      !formData.assigned_to ||
      formData.assigned_to === "unassigned" ||
      formData.assigned_to.trim() === ""
    ) {
      setFormState((prev) => ({
        ...prev,
        error: "Please assign this ticket to an agent or admin",
      }));
      return;
    }

    setFormState((prev) => ({ ...prev, isSubmitting: true, error: undefined }));

    try {
      await onSubmit(formData);
    } catch (error) {
      setFormState((prev) => ({
        ...prev,
        isSubmitting: false,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      }));
    }
  };

  return (
    <Card className={`w-full mx-auto shadow-lg ${className}`}>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center space-x-2 text-2xl">
          <FileText className="w-6 h-6 text-primary" />
          <span>{isEditing ? "Edit Ticket" : "Create New Ticket"}</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          {isEditing
            ? "Update the ticket details below"
            : "Fill in the details below to submit a new support ticket"}
        </p>
      </CardHeader>

      <CardContent className="pt-3">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Display */}
          {formState.error && (
            <div className="flex items-start space-x-2 p-4 bg-destructive/10 border border-destructive/30 rounded-lg animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-destructive/90">{formState.error}</p>
              </div>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-base font-semibold">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Brief description of the issue (e.g., 'Unable to login to dashboard')"
              className="w-full text-base"
              required
              minLength={3}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 3 characters, maximum 200 characters
            </p>
          </div>

          {/* Priority and Assignee Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority" className="text-base font-semibold">
                Priority
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(value: any) =>
                  setFormData((prev) => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span>Low</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span>Medium</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      <span>High</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="critical">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span>Critical</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select the urgency level of this ticket
              </p>
            </div>

            {/* Assigned To */}
            <div className="space-y-2">
              <Label htmlFor="assigned_to" className="text-base font-semibold">
                Assignee <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.assigned_to || "unassigned"}
                onValueChange={(value: any) =>
                  setFormData((prev) => ({
                    ...prev,
                    assigned_to: value === "unassigned" ? "" : value,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select assignee (required)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned" disabled>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">?</span>
                      </div>
                      <span className="text-muted-foreground">
                        Select an assignee...
                      </span>
                    </div>
                  </SelectItem>
                  {assignableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <span className="text-xs text-primary-foreground font-medium">
                            {user.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{user.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {user.role}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Add assignee to this ticket
              </p>
              {assignableUsers.length === 0 && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    No assignable users available. Make sure you have users with
                    'admin' or 'agent' roles.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-base font-semibold">
              Description <span className="text-destructive">*</span>
            </Label>
            <RichTextEditor
              value={formData.description}
              onChange={(value: any) =>
                setFormData((prev) => ({ ...prev, description: value }))
              }
              placeholder="Provide detailed information about the issue. Include steps to reproduce, expected behavior, and any error messages..."
            />
            <p className="text-xs text-muted-foreground">
              Minimum 10 characters, maximum 5000 characters
            </p>
          </div>

          {/* File Attachments */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Attachments{" "}
              <span className="text-muted-foreground text-sm font-normal">
                (Optional)
              </span>
            </Label>
            <div className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 rounded-lg p-8 text-center transition-colors bg-muted/20">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                accept="image/*,.pdf,.doc,.docx,.txt,.zip"
              />
              <label htmlFor="file-upload" className="cursor-pointer block">
                <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground mb-1">
                  Click to upload files or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, PDF, DOC, TXT, ZIP up to 10MB each
                </p>
              </label>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Attached Files ({files.length})
                </p>
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-destructive hover:text-destructive/80 p-1 rounded hover:bg-destructive/10 transition-colors"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.history.back()}
              disabled={formState.isSubmitting || isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={formState.isSubmitting || isSubmitting}
              className="min-w-[140px]"
            >
              {formState.isSubmitting || isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </div>
              ) : isEditing ? (
                "Update Ticket"
              ) : (
                "Create Ticket"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
