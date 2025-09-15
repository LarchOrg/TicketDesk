import { AlertCircle, Upload, X } from "lucide-react";
import React, { useState } from "react";
import type { FormState, TicketFormData } from "~/lib/types";
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

interface AssignableUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface TicketFormProps {
  onSubmit: (data: TicketFormData) => Promise<void>;
  initialData?: Partial<TicketFormData>;
  isEditing?: boolean;
  className?: string;
  assignableUsers?: AssignableUser[];
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

  const [_files, setFiles] = useState<File[]>([]);
  const [formState, setFormState] = useState<FormState>({
    isSubmitting: false,
    error: undefined,
    success: false,
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(event.target.files || []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.description.trim()) {
      setFormState((prev) => ({
        ...prev,
        error: "Title and description are required",
      }));
      return;
    }

    setFormState((prev) => ({ ...prev, isSubmitting: true, error: undefined }));

    try {
      await onSubmit(formData);
      // Don't set success state here - let the parent component handle navigation
      // The success state was causing confusion when server errors occurred
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
    <Card className={`w-full max-w-4xl mx-auto ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>{isEditing ? "Edit Ticket" : "Create New Ticket"}</span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Display */}
          {formState.error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-sm text-red-600 dark:text-red-400">
                {formState.error}
              </span>
            </div>
          )}

          {/* Success Display */}
          {formState.success && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <span className="text-sm text-green-600 dark:text-green-400">
                Ticket {isEditing ? "updated" : "created"} successfully!
              </span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Brief description of the issue"
              className="w-full"
              required
            />
          </div>

          {/* Priority and Assignee Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: any) =>
                  setFormData((prev) => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assigned To */}
            <div className="space-y-2">
              <Label htmlFor="assigned_to">Assign To</Label>
              <Select
                value={formData.assigned_to || "unassigned"}
                onValueChange={(value: any) =>
                  setFormData((prev) => ({
                    ...prev,
                    assigned_to: value === "unassigned" ? "" : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-xs text-gray-600">?</span>
                      </div>
                      <span>Unassigned</span>
                    </div>
                  </SelectItem>
                  {assignableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                          <span className="text-xs text-white font-medium">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">{user.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {user.role} • {user.email}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Label htmlFor="description">Description *</Label>
            <RichTextEditor
              value={formData.description}
              onChange={(value: any) =>
                setFormData((prev) => ({ ...prev, description: value }))
              }
              placeholder="Provide detailed information about the issue..."
              className="min-h-[200px]"
            />
          </div>

          {/* File Attachments */}
          <div className="space-y-2">
            <Label>Attachments</Label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Click to upload files or drag and drop
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  PNG, JPG, PDF, DOC up to 10MB each
                </p>
              </label>
            </div>

            {/* File List */}
            {_files.length > 0 && (
              <div className="space-y-2">
                {_files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-4">
            <Button type="button" variant="outline">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={formState.isSubmitting || isSubmitting}
              className="min-w-[120px]"
            >
              {formState.isSubmitting || isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
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
