import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

export interface ProcessedMeeting {
  summary: string;
  mom: string;
  actionItems: {
    description: string;
    assignee: string;
    dueDate: string;
  }[];
}

let _client: OpenAI | null = null;
function getClient() {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

/**
 * Parse transcript lines into basic speaker/content structure
 * Used for fallback when OpenAI is unavailable.
 */
function parseSpeakers(transcript: string): string[] {
  const speakers = new Set<string>();
  transcript.split('\n').forEach(line => {
    const m = line.match(/^([A-Za-z][^[]+)\s*\[/);
    if (m) speakers.add(m[1].trim());
  });
  return [...speakers];
}

function buildFallback(transcript: string): ProcessedMeeting {
  const speakers = parseSpeakers(transcript);
  const lines = transcript.split('\n').filter(Boolean);
  const topics = lines.slice(0, 3).map(l => l.replace(/^[^:]+:\s*/, '').substring(0, 60));
  return {
    summary: `[OpenAI key not configured — add OPENAI_API_KEY to your .env to enable AI processing]\n\nThis meeting had ${lines.length} exchanges between ${speakers.join(', ') || 'participants'}. Topics discussed included: ${topics.join('; ')}.`,
    mom: `## Minutes of Meeting\n\n**Attendees:** ${speakers.join(', ') || 'See transcript'}\n\n**Note:** AI processing unavailable. Please configure OPENAI_API_KEY in packages/server/.env to enable automatic summary generation.\n\n**Transcript Lines:** ${lines.length}`,
    actionItems: [],
  };
}

export async function processTranscript(transcript: string): Promise<ProcessedMeeting> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_openai_api_key_here' || apiKey.trim() === '') {
    console.warn('⚠️  OPENAI_API_KEY not set — using fallback summary.');
    return buildFallback(transcript);
  }

  try {
  const completion = await getClient().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are an expert meeting analyst. Analyze the provided meeting transcript and return a JSON object with exactly these fields:
- "summary": 2-3 paragraph plain-text summary of what was discussed and decided
- "mom": minutes of meeting as a formatted markdown string with sections (Attendees, Agenda, Discussion Points, Decisions)
- "actionItems": array of objects, each with { "description": string, "assignee": string, "dueDate": string (YYYY-MM-DD or "TBD") }

Return only valid JSON, no markdown fences.`,
      },
      {
        role: 'user',
        content: `Transcript:\n\n${transcript}`,
      },
    ],
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0].message.content ?? '{}';
  const result = JSON.parse(raw);

  return {
    summary: result.summary ?? '',
    mom: result.mom ?? '',
    actionItems: Array.isArray(result.actionItems) ? result.actionItems : [],
  };
  } catch (err: any) {
    console.error('❌ OpenAI error:', err.message);
    return buildFallback(transcript);
  }
}
