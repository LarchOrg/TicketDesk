import { createSupabaseServerClient } from "~/lib/supabase-server";
import { createServices } from "~/services";

export async function action({ request }: { request: Request }) {
  const { supabase } = createSupabaseServerClient(request);
  const services = createServices(supabase);

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Response("Authentication required", { status: 401 });
  }

  try {
    await services.notifications.markAllAsRead(user.id);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return Response.json(
      { error: "Failed to mark all notifications as read" },
      { status: 500 }
    );
  }
}
