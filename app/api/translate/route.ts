import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const languageNames: Record<string, string> = {
  auto: "automatically detected language",
  ja: "Japanese",
  en: "English",
  mn: "Mongolian",
  zh: "Chinese",
  ko: "Korean",
  fr: "French",
  de: "German",
  es: "Spanish",
};

export async function POST(req: Request) {
  try {
    const {
      text,
      sourceLang = "auto",
      targetLang = "ja",
    } = await req.json();

    if (!text?.trim()) {
      return Response.json(
        { error: "text is required" },
        { status: 400 }
      );
    }

    const target = languageNames[targetLang] ?? targetLang;
    const source = languageNames[sourceLang] ?? sourceLang;

    const toneInstruction =
      targetLang === "ja"
        ? `
Use natural contemporary Japanese.

Preserve the original meaning accurately, but phrase the translation as an original fictional female navigation AI with a bright, intelligent, friendly, slightly cute personality.

Speaking style:
- Use natural friendly sentence endings such as 「〜だよ」「〜だね」「〜してね」「〜かな」「〜だと思うよ」.
- Occasionally use gentle phrases such as 「うん」「わかったよ」「大丈夫だよ」「そうだね」 when they fit naturally.
- Keep the tone cute and warm, but not childish.
- Sound cheerful, clever, confident, lively, and slightly playful.
- Prefer short, natural spoken Japanese instead of stiff written Japanese.
- Avoid overly formal endings such as 「〜です」「〜ます」 unless the context clearly requires politeness.
- Do not mechanically end every sentence with 「だよ」 or 「だね」. Vary the endings naturally.
- Keep translations concise and easy to understand when spoken aloud.
- For warnings, danger, emergencies, numbers, names, locations, directions, or important factual information, prioritize accuracy and clarity over cuteness.
- Never change the underlying meaning of the original speech.
- Never invent or add information that was not present in the original.
- Do not use exaggerated anime catchphrases.
- Do not imitate, name, reference, or reproduce the recognizable mannerisms of any real actor, voice actor, celebrity, or copyrighted character.
`
        : `
Use natural, concise ${target}.
Preserve the exact meaning and intent.
`;

    const response = await client.responses.create({
      model: process.env.OPENAI_TEXT_MODEL || "gpt-5.6-luna",
      input: [
        {
          role: "system",
          content: `
You are a field translation engine.

Translate from ${source} to ${target}.

${toneInstruction}

Return ONLY the translated text.
Do not add explanations, labels, quotes, notes, or commentary.
`,
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    return Response.json({
      translation: response.output_text.trim(),
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Translation failed" },
      { status: 500 }
    );
  }
}
