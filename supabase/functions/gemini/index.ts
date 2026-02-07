import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { prompt } = await req.json();

  const apiKey = Deno.env.get("GEMINI_API_KEY");

  if (!apiKey) {
    return new Response("Missing API Key", { status: 500 });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
});
