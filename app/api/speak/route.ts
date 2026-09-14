import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const {
      text,
      language = "ja",
      style = "cute",
    } = await req.json();

    if (!text?.trim()) {
      return Response.json(
        { error: "text is required" },
        { status: 400 }
      );
    }

    let instructions = "";

    if (language === "ja") {
      if (style === "high") {
        instructions = `
Speak Japanese using a bright, clearly feminine-presenting fictional navigator voice.

Use a noticeably higher vocal register than normal.
Keep the voice light and clear.
Use lively pitch variation.
Speak slightly faster than normal.

Avoid low notes.
Avoid deep resonance.
Avoid a heavy chest voice.
Avoid a masculine or announcer-like delivery.

Sound intelligent, cheerful and energetic.
Keep pronunciation crisp and easy to understand.

Maintain an original fictional voice.
Do not imitate any specific real person or copyrighted character.
`;
      } else if (style === "ultra") {
        instructions = `
Speak Japanese using a very bright, high-register, cute,
female-presenting fictional navigation AI voice.

Use the highest comfortable natural vocal register.
Keep the vocal weight extremely light.
Use a light head-voice quality rather than heavy chest resonance.

Sound youthful, cheerful, playful, energetic and sweet,
while still sounding clearly adult.

Use expressive, lively pitch movement.
Use a slightly fast and bouncy speaking rhythm.

Make endings such as
「〜だよ」
「〜だね」
「〜してね」
「〜かな」
sound especially soft, sweet, playful and affectionate.

Avoid low-pitched delivery.
Avoid deep resonance.
Avoid a heavy or mature voice.
Avoid masculine resonance.
Avoid an announcer-like tone.
Avoid flat or robotic intonation.

Do not force an unnatural falsetto.
Keep Japanese pronunciation crisp and intelligible.

Maintain an original fictional voice.
Do not imitate any specific real person or copyrighted character.
`;
      } else {
        instructions = `
Speak Japanese using a light, high-register, cute,
female-presenting fictional navigator voice.

Sound youthful, cheerful, warm and playful,
while still clearly adult.

Use a higher vocal register.
Keep the voice light and airy.
Use lively, expressive intonation.
Speak slightly faster than normal.

Make endings such as
「〜だよ」
「〜だね」
「〜してね」
「〜かな」
sound cute, gentle and friendly.

Avoid a low register.
Avoid heavy chest resonance.
Avoid masculine or stern delivery.
Avoid an announcer-like tone.

Keep pronunciation crisp and easy to understand.

Maintain an original fictional voice.
Do not imitate any specific real person or copyrighted character.
`;
      }
    } else {
      instructions = `
Speak clearly and naturally with a bright,
light and friendly feminine-presenting navigator style.
`;
    }

    const audio = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "marin",
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
