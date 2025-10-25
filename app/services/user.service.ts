import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "../lib/types";

export function createAdminSupabaseClient(): SupabaseClient {
  return createClient(
    process.env.VITE_SUPABASE_URL as string,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
  );
}
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
      // First check if the profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .single();

      if (checkError || !existingProfile) {
        console.error("Profile not found:", userId, checkError);
        return {
          success: false,
          error:
            "User profile not found. The user may not exist in the database.",
        };
      }

      // Now update the profile
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
        .upsert({
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
      try {
        const supabaseAdmin = createAdminSupabaseClient();

        // 1. Delete dependent custom tables
        await supabaseAdmin
          .from("notifications")
          .delete()
          .eq("user_id", userId);
        await supabaseAdmin.from("profiles").delete().eq("id", userId);

        // 2. Delete user from Supabase Auth
        const { error: authError } =
          await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authError) {
          console.error("Error deleting auth user:", authError);
          return { success: false, error: authError.message };
        }

        return { success: true };
      } catch (err) {
        console.error("Unexpected error deleting user:", err);
        return { success: false, error: "Unexpected error" };
      }
    },

    /**
     * Get recently registered users
     */
    async getRecentUsers(limit: number = 10): Promise<Profile[]> {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching recent users:", error);
        return [];
      }

      return data || [];
    },
  };
}
