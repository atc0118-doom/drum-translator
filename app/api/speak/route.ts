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
      mode = "snappy",
    } = await req.json();

    if (!text?.trim()) {
      return Response.json(
        { error: "text is required" },
        { status: 400 }
      );
    }

    let instructions = "";

    if (language === "ja") {
      if (mode === "bright") {
        instructions = `
Speak Japanese as an original fictional handheld translation navigator.

Use a bright, light, feminine-presenting adult voice.

Style:
- cheerful
- crisp
- intelligent
- friendly
- natural
- slightly fast
- clear articulation
- bright forward resonance
- light vocal weight

Use natural pitch variation.
Keep sentence endings friendly and slightly lifted when appropriate.

Avoid:
- deep resonance
- heavy chest voice
- slow delivery
- stern announcer tone
- robotic monotone
- childish baby-like speech

Keep the performance natural and easy to understand.
Do not imitate any specific real person or copyrighted character.
`;
      } else if (mode === "lively") {
        instructions = `
Speak Japanese as an original fictional handheld translation navigator.

Use a bright, light, feminine-presenting adult voice.

Make the performance lively, expressive, playful and energetic.

Style:
- noticeably expressive intonation
- lively pitch movement
- cheerful energy
- brisk speaking tempo
- light vocal weight
- crisp consonants
- clear vowels
- warm and playful delivery

Make endings such as:
「〜だよ」
「〜だね」
「〜してね」
「〜かな」
「〜だって」
sound lively, cute and slightly bouncy.

Keep short phrases punchy and animated.

Avoid:
- deep resonance
- mature heavy delivery
- slow speech
- flat monotone
- exaggerated baby voice
- over-the-top anime catchphrases

Maintain clear intelligibility.
Do not imitate any specific real person or copyrighted character.
`;
      } else {
        instructions = `
Speak Japanese as an original fictional handheld translation-device navigator.

Use a bright, light, feminine-presenting adult voice.

The delivery should be SNAPPY.

Important style:
- speak briskly
- use short, punchy phrasing
- use crisp consonants
- keep vowels clear
- use bright forward resonance
- keep vocal weight light
- sound immediately responsive
- use lively but controlled pitch movement
- slightly lift sentence endings when natural
- keep pauses short
- sound compact, quick and energetic

The voice should feel like a smart portable translator responding instantly.

For endings such as:
「〜だよ」
「〜だね」
「〜してね」
「〜かな」
「〜だって」
「〜みたい」
make them sound light, friendly and slightly playful.

Avoid:
- deep resonance
- heavy chest voice
- slow or drawn-out speech
- breathy whispering
- serious announcer delivery
- flat robotic monotone
- childish baby-like speech
- exaggerated anime catchphrases

Keep the delivery crisp, bright and easy to understand.

Maintain an original fictional voice.
Do not imitate any specific real person or copyrighted character.
`;
      }
    } else {
      instructions = `
Speak clearly and naturally with a bright,
light, brisk and friendly fictional navigator voice.
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
