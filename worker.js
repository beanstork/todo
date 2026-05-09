export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://beanstork.github.io',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { text, today } = await request.json();

      const systemPrompt = `You are a task parser. Given natural language input, return ONLY valid JSON — no markdown, no explanation.

Categories: personal, finance, admin, projects, mishmish, social
Priority: urgent, high, normal
Today: ${today}

Return exactly:
{
  "text": "clean task description",
  "category": "personal|finance|admin|projects|mishmish|social",
  "priority": "urgent|high|normal",
  "emoji": "single relevant emoji or null",
  "due": "YYYY-MM-DD or null",
  "notes": "extra context or null"
}

Rules:
- mishmish is the user's cat — anything about Mishmish goes in mishmish category
- urgent = needs doing today or ASAP
- high = deadline within a week
- Resolve relative dates (next Tuesday, end of month, in 3 days) to absolute YYYY-MM-DD based on today
- Pick a relevant emoji that adds meaning, or null if nothing fits`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          system: systemPrompt,
          messages: [{ role: 'user', content: text }],
        }),
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  },
};
