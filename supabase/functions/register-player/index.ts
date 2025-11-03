import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegisterPlayerRequest {
  player_id: string;
  device_name?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse request body
    const { player_id, device_name }: RegisterPlayerRequest = await req.json();

    // Validate player_id
    if (!player_id || typeof player_id !== "string" || player_id.trim() === "") {
      return new Response(
        JSON.stringify({ error: "Invalid player_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if player exists
    const { data: existingPlayer, error: fetchError } = await supabaseClient
      .from("players")
      .select("*")
      .eq("player_id", player_id)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // Error other than "not found"
      throw fetchError;
    }

    let result;

    if (existingPlayer) {
      // Update existing player (heartbeat)
      const { data, error } = await supabaseClient
        .from("players")
        .update({
          is_active: true,
          last_seen: new Date().toISOString(),
          device_name: device_name || existingPlayer.device_name,
        })
        .eq("player_id", player_id)
        .select()
        .single();

      if (error) throw error;
      result = { action: "updated", player: data };
    } else {
      // Insert new player
      const { data, error } = await supabaseClient
        .from("players")
        .insert({
          player_id,
          device_name: device_name || `Player ${player_id}`,
          is_active: true,
          last_seen: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      result = { action: "registered", player: data };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in register-player function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
