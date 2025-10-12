import { createSupabaseServerClient } from "~/lib/supabase-server";
import { createServices } from "~/services";

export async function loader({ request }: { request: Request }) {
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
    const [notifications, unreadCount] = await Promise.all([
      services.notifications.getUserNotifications(user.id),
      services.notifications.getUnreadCount(user.id),
    ]);

    return Response.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return Response.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
