import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = "nodejs";

const allowedVoices = [
  "marin",
  "shimmer",
  "coral",
  "sage",
  "fable",
  "verse",
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
Speak Japanese as an original fictional handheld translation-device navigator.

The voice should be:
- bright
- light
- lively
- energetic
- friendly
- feminine-presenting
- clearly adult

IMPORTANT:
Do not simply try to sound extremely high-pitched.

Instead:
- Use bright forward resonance.
- Keep the vocal weight light.
- Use crisp articulation.
- Speak at a brisk conversational tempo.
- Give short phrases a quick, punchy rhythm.
- Use clear and lively pitch movement.
- Let sentence endings lift slightly when natural.
- Sound cheerful and immediately responsive.
- Make the delivery feel compact and snappy, like a smart portable navigator.

For endings such as:
「〜だよ」
「〜だね」
「〜してね」
「〜かな」
「〜だって」
「〜みたい」

make them sound friendly, playful and slightly bouncy.

Avoid:
- deep resonance
- slow delivery
- breathy whispering
- heavy mature delivery
- serious announcer delivery
- flat robotic monotone
- overly sweet baby-like speech
- exaggerated anime catchphrases

Keep consonants crisp.
Keep vowels clear.
Prioritize intelligibility.
Use natural contemporary spoken Japanese.

Maintain an original fictional voice.
Do not imitate or reproduce the recognizable voice or mannerisms of any specific real person, actor, voice actor, celebrity, or copyrighted character.
`
        : `
Speak clearly and naturally with a bright,
light, brisk and friendly fictional navigator voice.
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
