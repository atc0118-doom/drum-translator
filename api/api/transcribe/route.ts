import OpenAI, { toFile } from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const audio = form.get("audio");
    const language = form.get("language");

    if (!(audio instanceof Blob)) {
      return Response.json({ error: "audio is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await audio.arrayBuffer());
    const file = await toFile(buffer, "speech.webm", { type: audio.type || "audio/webm" });

    const transcription = await client.audio.transcriptions.create({
      file,
      model: process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-transcribe",
      ...(typeof language === "string" && language ? { language } : {})
    });

    return Response.json({ text: transcription.text });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Transcription failed" }, { status: 500 });
  }
}
