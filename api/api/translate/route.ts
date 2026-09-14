import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const languageNames: Record<string, string> = {
  auto: "automatically detected language",
  ja: "Japanese",
  en: "English",
  mn: "Mongolian",
  zh: "Chinese",
  ko: "Korean",
  fr: "French",
  de: "German",
  es: "Spanish"
};

export async function POST(req: Request) {
  try {
    const { text, sourceLang = "auto", targetLang = "ja" } = await req.json();

    if (!text?.trim()) {
      return Response.json({ error: "text is required" }, { status: 400 });
    }

    const target = languageNames[targetLang] ?? targetLang;
    const source = languageNames[sourceLang] ?? sourceLang;

    const toneInstruction =
      targetLang === "ja"
        ? `Use natural contemporary Japanese. Keep the meaning exact, but phrase it like an original fictional navigation AI: intelligent, crisp, concise, confident, slightly lively, and warm. It may have a subtle retro science-fiction anime flavor. Do not imitate, name, reference, or reproduce the recognizable mannerisms of any real actor, voice actor, celebrity, or copyrighted character.`
        : `Use natural, concise ${target}. Preserve the exact meaning and intent.`;

    const response = await client.responses.create({
      model: process.env.OPENAI_TEXT_MODEL || "gpt-5.6-luna",
      input: [
        {
          role: "system",
          content: `You are a field translation engine. Translate from ${source} to ${target}. ${toneInstruction}
Return ONLY the translated text. Do not add explanations, labels, quotes, or notes.`
        },
        { role: "user", content: text }
      ]
    });

    return Response.json({ translation: response.output_text.trim() });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Translation failed" }, { status: 500 });
  }
}
