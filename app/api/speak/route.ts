import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const {
      text,
      language = "ja",
    } = await req.json();

    if (!text?.trim()) {
      return Response.json(
        {
          error: "text is required",
        },
        {
          status: 400,
        }
      );
    }

    const instructions =
      language === "ja"
        ? `
Speak in natural contemporary Japanese.

Voice direction:
- Bright, light, clear female navigator-style delivery.
- Use a light vocal weight rather than a deep or heavy voice.
- Keep the resonance forward and clear.
- Crisp articulation and very clear consonants.
- Slightly brisk conversational tempo.
- Short, punchy rhythm.
- Cheerful, intelligent, confident and friendly.
- Warm but matter-of-fact.
- Use lively pitch movement.
- Let some sentence endings rise gently and naturally.
- Avoid a sleepy, mature, husky, deep, breathy, or heavy delivery.
- Avoid exaggerated cuteness.
- Avoid an artificial chipmunk or voice-changer sound.
- Keep it natural and human.
- For short phrases like 「うん」「わかったよ」「行こっか」「大丈夫だよ」, sound quick, lively and friendly.
- Do not imitate or reproduce the recognizable voice, mannerisms, or performance of any real actor, voice actor, celebrity, or copyrighted character.
`
        : `
Speak naturally, clearly, and conversationally.
Keep the delivery bright, concise, and friendly.
`;

    const speech =
      await client.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice: "marin",
        input: text,
        instructions,
        response_format: "mp3",
      });

    const buffer =
      Buffer.from(
        await speech.arrayBuffer()
      );

    return new Response(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        error: "Speech generation failed",
      },
      {
        status: 500,
      }
    );
  }
}
