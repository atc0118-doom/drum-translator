"use client";

import { useRef, useState } from "react";

export default function Home() {
  const [source, setSource] = useState("");
  const [translated, setTranslated] = useState("");
  const [status, setStatus] = useState("READY");
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function translate(text = source) {
    if (!text.trim()) return;

    setStatus("TRANSLATING");

    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        sourceLang: "auto",
        targetLang: "ja"
      })
    });

    const data = await res.json();
    setTranslated(data.translation || "");
    setStatus("READY");
  }

  async function startRecording() {
    const stream =
      await navigator.mediaDevices.getUserMedia({ audio: true });

    const recorder = new MediaRecorder(stream);

    chunksRef.current = [];
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      setStatus("TRANSCRIBING");

      const blob = new Blob(chunksRef.current, {
        type: recorder.mimeType
      });

      stream.getTracks().forEach((track) => track.stop());

      const form = new FormData();
      form.append("audio", blob, "speech.webm");

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: form
      });

      const data = await res.json();

      setSource(data.text || "");

      if (data.text) {
        await translate(data.text);
      }
    };

    recorder.start();
    setRecording(true);
    setStatus("LISTENING");
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#05070a",
        color: "white",
        padding: "30px",
        fontFamily: "Arial"
      }}
    >
      <p>FIELD TRANSLATION TERMINAL</p>

      <h1>DRUM // VOICE</h1>

      <p>STATUS: {status}</p>

      <textarea
        value={source}
        onChange={(e) => setSource(e.target.value)}
        placeholder="話しかけるか、ここに入力"
        style={{
          width: "100%",
          minHeight: "140px",
          padding: "15px",
          fontSize: "18px"
        }}
      />

      <div style={{ marginTop: "20px" }}>
        <button
          onClick={recording ? stopRecording : startRecording}
          style={{ padding: "20px", marginRight: "10px" }}
        >
          {recording ? "STOP" : "● TALK"}
        </button>

        <button
          onClick={() => translate()}
          style={{ padding: "20px" }}
        >
          TRANSLATE
        </button>
      </div>

      <h2>TRANSLATED</h2>

      <div style={{ fontSize: "24px" }}>
        {translated || "翻訳結果がここに表示されます"}
      </div>
    </main>
  );
}
