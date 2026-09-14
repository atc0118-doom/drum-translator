import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = "nodejs";

const allowedVoices = ["coral", "shimmer", "nova"];

export async function POST(req: Request) {
  try {
    const {
      text,
      language = "ja",
      voice = "coral",
    } = await req.json();

    if (!text?.trim()) {
      return Response.json(
        { error: "text is required" },
        { status: 400 }
      );
    }

    const selectedVoice = allowedVoices.includes(voice)
      ? voice
      : "coral";

    const instructions =
      language === "ja"
        ? `
Speak Japanese clearly and naturally.

Use a bright, cute, intelligent female-presenting fictional navigation AI style.

Voice direction:
- Use a light and relatively high vocal register.
- Sound youthful and feminine, but not childish.
- Sound cheerful, clever, lively and warm.
- Keep pronunciation crisp and easy to understand.
- Speak slightly briskly.
- Make endings such as 「〜だよ」「〜だね」「〜してね」「〜かな」 sound soft and cute.
- Avoid a deep, heavy, masculine, stern or announcer-like delivery.
- Avoid sounding overly robotic or emotionless.
- Keep warnings and important facts clear.
- Maintain an original fictional voice.
- Do not imitate any specific real person or copyrighted character.
`
        : `
Speak clearly and naturally with a bright,
friendly, light, feminine-presenting navigator style.
`;

    const audio = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: selectedVoice as any,
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
