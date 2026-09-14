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
Use a light, youthful and cheerful delivery.
Keep the vocal register relatively high and feminine.
Keep the pace slightly brisk and energetic.

Make sentence endings such as
「〜だよ」
「〜だね」
「〜してね」
「〜かな」
sound soft, cute and friendly.

Sound intelligent, confident and lively,
while keeping a warm and approachable personality.

Avoid a deep, heavy, masculine or announcer-like delivery.
Do not sound stern or overly formal.

Maintain an original fictional voice.
Do not imitate any specific real person or copyrighted character.
`
        : `
Speak clearly and naturally in a bright,
friendly, feminine-presenting navigator style.
`;

    const audio = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "nova",
      input: text,
      instructions,
      response_format: "mp3",
    });

    const bytes = Buffer.from(
      await audio.arrayBuffer()
    );

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
