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
Speak in Japanese as a bright, cute, intelligent female-presenting fictional navigation AI.

Voice direction:
- Use a clearly feminine presentation.
- Use a slightly higher vocal register.
- Sound youthful, cheerful and warm, but not childish.
- Keep the voice light and energetic.
- Use crisp pronunciation and clear vowels.
- Speak at a slightly brisk pace.
- Add a small amount of playful friendliness.
- Sentence endings like 「〜だよ」「〜だね」「〜してね」「〜かな」 should sound soft, cute and natural.
- Avoid a deep, heavy, masculine, stern or announcer-like delivery.
- Avoid sounding emotionless or robotic.
- Keep warnings and important information clear and easy to understand.
- Maintain an original fictional voice.
- Do not imitate or evoke any specific real actor, voice actor, celebrity, or copyrighted character.
`
        : `
Speak clearly and naturally with a bright, friendly,
female-presenting synthetic navigator tone.
`;

    const audio = await client.audio.speech.create({
      model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",

      // 女性寄りの声を固定
      voice: "shimmer",

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
    console.error(error);

    return Response.json(
      { error: "Speech generation failed" },
      { status: 500 }
    );
  }
}
