import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubmitRequestBody {
  player_id: string;
  video_id: string;
  title?: string;
  artist?: string;
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
    const { player_id, video_id, title, artist }: SubmitRequestBody = await req.json();

    // Validate inputs
    if (!player_id || typeof player_id !== "string" || player_id.trim() === "") {
      return new Response(
        JSON.stringify({ error: "Invalid player_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!video_id || typeof video_id !== "string" || video_id.trim() === "") {
      return new Response(
        JSON.stringify({ error: "Invalid video_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if player is active
    const { data: player, error: playerError } = await supabaseClient
      .from("players")
      .select("*")
      .eq("player_id", player_id)
      .eq("is_active", true)
      .single();

    if (playerError || !player) {
      return new Response(
        JSON.stringify({
          error: "Player not found or inactive",
          player_id,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if player was seen recently (within 60 seconds)
    const lastSeen = new Date(player.last_seen);
    const now = new Date();
    const secondsSinceLastSeen = (now.getTime() - lastSeen.getTime()) / 1000;

    if (secondsSinceLastSeen > 60) {
      return new Response(
        JSON.stringify({
          error: "Player not responding (last seen > 60 seconds ago)",
          player_id,
          last_seen: player.last_seen,
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Insert song request
    const { data: request, error: insertError } = await supabaseClient
      .from("song_requests")
      .insert({
        player_id,
        video_id,
        title: title || "Unknown Title",
        artist: artist || "Unknown Artist",
        status: "pending",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({
        success: true,
        request,
        message: "Request submitted successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 201,
      }
    );
  } catch (error) {
    console.error("Error in submit-request function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
