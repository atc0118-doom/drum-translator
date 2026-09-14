import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { text, language = "ja" } = await req.json();

    if (!text?.trim()) {
      return Response.json(
        { error: "text is required" },
        { status: 400 }
      );
    }

    const instructions =
      language === "ja"
        ? `
Speak Japanese clearly and naturally.

Use a bright, friendly, cute, feminine-presenting navigator style.
Use a light and cheerful delivery.
Keep the pace slightly brisk.
Make endings such as 「〜だよ」「〜だね」「〜してね」 sound soft and friendly.
Do not sound stern, heavy, or announcer-like.
Do not imitate any specific real person or copyrighted character.
`
        : `
Speak clearly and naturally in a friendly navigator style.
`;

    const audio = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text,
      instructions,
      response_format: "mp3",
    });

    const bytes = Buffer.from(await audio.arrayBuffer());

    return new Response(bytes, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("TTS ERROR:", error);

    return Response.json(
      { error: "Speech generation failed" },
      { status: 500 }
    );
  }
}
