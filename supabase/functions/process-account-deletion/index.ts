import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    const { deletion_request_id, email, user_id } = await req.json();

    // Verify request has required parameters
    if (!deletion_request_id || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user ID if not provided
    let targetUserId = user_id;
    if (!targetUserId) {
      const { data: userList, error: userError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email.toLowerCase())
        .single();

      if (userError || !userList) {
        // User not found, update request status to processed anyway
        await supabase
          .from("account_deletion_requests")
          .update({
            status: "processed",
            processed_at: new Date().toISOString(),
          })
          .eq("id", deletion_request_id);

        return new Response(
          JSON.stringify({
            message: "Deletion request processed (user not found)",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      targetUserId = userList.id;
    }

    // Delete all user data in order (respecting foreign keys)
    const tablesToDelete = [
      { table: "investment_transactions", column: "user_id" },
      { table: "scheduled_tasks", column: "user_id" },
      { table: "transactions", column: "user_id" },
      { table: "goals", column: "user_id" },
      { table: "budget_items", column: "user_id" },
      { table: "budgets", column: "user_id" },
      { table: "family_group_members", column: "user_id" },
      { table: "family_groups", column: "owner_id" },
      { table: "connected_accounts", column: "user_id" },
      { table: "subscription_permissions", column: "user_id" },
      { table: "user_preferences", column: "user_id" },
      { table: "profiles", column: "id" },
    ];

    for (const { table, column } of tablesToDelete) {
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq(column, targetUserId);

      if (deleteError) {
        console.error(`Error deleting from ${table}:`, deleteError);
        // Continue with next table even if one fails
      }
    }

    // Delete from auth.users (this will cascade delete related data)
    const { error: authError } = await supabase.auth.admin.deleteUser(
      targetUserId
    );

    if (authError) {
      console.error("Error deleting auth user:", authError);
    }

    // Update deletion request status to processed
    const { error: updateError } = await supabase
      .from("account_deletion_requests")
      .update({
        status: "processed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", deletion_request_id);

    if (updateError) {
      console.error("Error updating deletion request:", updateError);
    }

    return new Response(
      JSON.stringify({
        message: "Account successfully deleted",
        user_id: targetUserId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
