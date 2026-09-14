import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = "nodejs";

const allowedVoices = [
  "marin",
  "sage",
  "fable",
  "verse",
  "shimmer",
  "coral",
];

export async function POST(req: Request) {
  try {
    const {
      text,
      language = "ja",
      voice = "marin",
    } = await req.json();

    if (!text?.trim()) {
      return Response.json(
        { error: "text is required" },
        { status: 400 }
      );
    }

    const selectedVoice = allowedVoices.includes(voice)
      ? voice
      : "marin";

    const instructions =
      language === "ja"
        ? `
Speak in Japanese using a light, high-pitched, cute fictional female navigator voice.

Use a noticeably higher vocal register.
Keep the vocal weight light and airy.
Sound youthful, cheerful, playful, warm, and affectionate, but still clearly adult.
Use lively pitch variation and expressive intonation.
Speak slightly faster than normal.

Make sentence endings such as
「〜だよ」
「〜だね」
「〜してね」
「〜かな」
sound sweet, soft, warm, and playful.

Avoid a low register.
Avoid a heavy chest voice.
Avoid masculine resonance.
Avoid a stern or serious announcer tone.
Avoid flat or monotone delivery.

Keep pronunciation crisp and easy to understand.
Maintain an original fictional voice.
Do not imitate any specific real person or copyrighted character.
`
        : `
Speak clearly and naturally with a light,
bright, friendly, feminine-presenting navigator style.
`;

    const audio = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: selectedVoice as any,
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
