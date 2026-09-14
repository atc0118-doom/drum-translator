import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { text, language = "ja" } = await req.json();

    if (!text?.trim()) {
      return Response.json({ error: "text is required" }, { status: 400 });
    }

    const instructions =
      language === "ja"
        ? `Speak in Japanese with a bright, intelligent, articulate female-presenting synthetic navigator character.
Crisp consonants, clear vowels, slightly brisk tempo, confident delivery, warm but matter-of-fact.
Give it a subtle retro science-fiction anime energy while remaining an original voice.
Do not imitate or evoke any specific real actor, voice actor, celebrity, or copyrighted character.`
        : `Speak clearly and naturally in the requested language with an intelligent, friendly synthetic navigator tone.`;

    const audio = await client.audio.speech.create({
      model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
      voice: (process.env.OPENAI_TTS_VOICE || "alloy") as any,
      input: text,
      instructions,
      response_format: "mp3"
    });

    const bytes = Buffer.from(await audio.arrayBuffer());

    return new Response(bytes, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Speech generation failed" }, { status: 500 });
  }
}
