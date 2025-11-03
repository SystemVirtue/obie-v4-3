import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UpdateKioskSettingsRequest {
  player_id: string;
  mode?: "FREEPLAY" | "PAID";
  credits?: number;
  delta_credits?: number; // For adding/removing credits
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
    const { player_id, mode, credits, delta_credits }: UpdateKioskSettingsRequest = await req.json();

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

    // Check if settings exist
    const { data: existingSettings, error: fetchError } = await supabaseClient
      .from("kiosk_settings")
      .select("*")
      .eq("player_id", player_id)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      throw fetchError;
    }

    let result;

    if (existingSettings) {
      // Update existing settings
      const updates: any = {};
      
      if (mode !== undefined) {
        updates.mode = mode;
      }
      
      if (credits !== undefined) {
        updates.credits = Math.max(0, credits); // Ensure non-negative
      } else if (delta_credits !== undefined) {
        updates.credits = Math.max(0, existingSettings.credits + delta_credits);
      }

      const { data, error } = await supabaseClient
        .from("kiosk_settings")
        .update(updates)
        .eq("player_id", player_id)
        .select()
        .single();

      if (error) throw error;
      result = { action: "updated", settings: data };
    } else {
      // Create new settings
      const { data, error } = await supabaseClient
        .from("kiosk_settings")
        .insert({
          player_id,
          mode: mode || "FREEPLAY",
          credits: credits !== undefined ? Math.max(0, credits) : 0,
        })
        .select()
        .single();

      if (error) throw error;
      result = { action: "created", settings: data };
    }

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error updating kiosk settings:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
