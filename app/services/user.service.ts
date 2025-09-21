import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "../lib/types";

export function createUserService(supabase: SupabaseClient) {
  return {
    /**
     * Get user profile by ID
     */
    async getUserById(userId: string): Promise<Profile | null> {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching user:", error);
        return null;
      }

      return data;
    },

    /**
     * Get assignable users (agents and admins)
     */
    async getAssignableUsers(): Promise<Profile[]> {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("role", ["agent", "admin"])
        .order("name");

      if (error) {
        console.error("Error fetching assignable users:", error);
        return [];
      }

      return data || [];
    },

    /**
     * Get all users (admin only)
     */
    async getAllUsers(): Promise<Profile[]> {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("name");

      if (error) {
        console.error("Error fetching all users:", error);
        return [];
      }

      return data || [];
    },

    /**
     * Update user profile
     */
    async updateUserProfile(
      userId: string,
      updates: {
        name?: string;
        email?: string;
        avatar_url?: string;
        role?: string;
      }
    ): Promise<{ success: boolean; profile?: Profile; error?: string }> {
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId)
        .select("*")
        .single();

      if (error) {
        console.error("Error updating user profile:", error);
        return { success: false, error: error.message };
      }

      return { success: true, profile: data };
    },

    /**
     * Create user profile (for signup)
     */
    async createUserProfile(profileData: {
      id: string;
      name: string;
      email: string;
      role?: string;
      avatar_url?: string;
    }): Promise<{ success: boolean; profile?: Profile; error?: string }> {
      const { data, error } = await supabase
        .from("profiles")
        .insert({
          id: profileData.id,
          name: profileData.name,
          email: profileData.email,
          role: profileData.role || "user",
          avatar_url: profileData.avatar_url,
          created_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) {
        console.error("Error creating user profile:", error);
        return { success: false, error: error.message };
      }

      return { success: true, profile: data };
    },

    /**
     * Delete user profile
     */
    async deleteUserProfile(
      userId: string
    ): Promise<{ success: boolean; error?: string }> {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (error) {
        console.error("Error deleting user profile:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    },
  };
}
