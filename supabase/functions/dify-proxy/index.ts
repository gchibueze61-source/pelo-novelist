import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DIFY_URL = Deno.env.get("DIFY_API_URL") || "https://api.dify.ai/v1";
const DIFY_KEY = Deno.env.get("DIFY_API_KEY") || "";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (!DIFY_KEY) {
      return new Response(
        JSON.stringify({ error: "DIFY_API_KEY secret not configured on the server." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { query, conversation_id, user } = await req.json();

    if (!query || !user) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: query, user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const difyRes = await fetch(`${DIFY_URL}/chat-messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DIFY_KEY}`,
      },
      body: JSON.stringify({
        inputs: {},
        query,
        response_mode: "streaming",
        conversation_id: conversation_id || undefined,
        user,
      }),
    });

    if (!difyRes.ok || !difyRes.body) {
      const text = await difyRes.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: `Dify request failed (${difyRes.status}): ${text}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(difyRes.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
