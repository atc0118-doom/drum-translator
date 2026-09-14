"use client";

import { useRef, useState } from "react";

const langs = [
  ["auto", "自動判定"],
  ["ja", "日本語"],
  ["en", "English"],
  ["mn", "Монгол"],
  ["zh", "中文"],
  ["ko", "한국어"],
  ["fr", "Français"],
  ["de", "Deutsch"],
  ["es", "Español"]
];

export default function Home() {
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("ja");
  const [source, setSource] = useState("");
  const [translated, setTranslated] = useState("");
  const [status, setStatus] = useState("READY");
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function translate(text = source) {
    if (!text.trim()) return;
    setStatus("TRANSLATING");
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, sourceLang, targetLang })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "translation failed");
      setTranslated(data.translation);
      setStatus("TRANSLATED");
      await speak(data.translation, targetLang);
    } catch (e) {
      console.error(e);
      setStatus("ERROR");
    }
  }

  async function speak(text = translated, language = targetLang) {
    if (!text.trim()) return;
    setStatus("SPEAKING");
    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language })
      });
      if (!res.ok) throw new Error("speech failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setStatus("READY");
      await audio.play();
    } catch (e) {
      console.error(e);
      setStatus("ERROR");
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      recorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        setStatus("TRANSCRIBING");
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        stream.getTracks().forEach(t => t.stop());

        const fd = new FormData();
        fd.append("audio", blob, "speech.webm");
        if (sourceLang !== "auto") fd.append("language", sourceLang);

        try {
          const res = await fetch("/api/transcribe", { method: "POST", body: fd });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "transcription failed");
          setSource(data.text);
          await translate(data.text);
        } catch (e) {
          console.error(e);
          setStatus("ERROR");
        }
      };
      rec.start();
      setRecording(true);
      setStatus("LISTENING");
    } catch (e) {
      console.error(e);
      setStatus("MIC ERROR");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <main className="shell">
      <section className="terminal">
        <div className="topbar">
          <div>
            <div className="eyebrow">FIELD TRANSLATION TERMINAL</div>
            <h1>DRUM // VOICE</h1>
          </div>
          <div className={`status ${status === "ERROR" ? "danger" : ""}`}>
            <span className="dot" /> {status}
          </div>
        </div>

        <div className="langRow">
          <label>
            INPUT
            <select value={sourceLang} onChange={e => setSourceLang(e.target.value)}>
              {langs.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </label>
          <button className="swap" onClick={() => {
            if (sourceLang !== "auto") {
              setSourceLang(targetLang);
              setTargetLang(sourceLang);
            }
          }}>⇄</button>
          <label>
            OUTPUT
            <select value={targetLang} onChange={e => setTargetLang(e.target.value)}>
              {langs.filter(([v]) => v !== "auto").map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </label>
        </div>

        <div className="panel">
          <div className="panelTitle">ORIGINAL</div>
          <textarea
            value={source}
            onChange={e => setSource(e.target.value)}
            placeholder="話しかけるか、ここに入力"
          />
        </div>

        <div className="controls">
          <button
            className={`mic ${recording ? "active" : ""}`}
            onClick={recording ? stopRecording : startRecording}
            aria-label={recording ? "録音停止" : "録音開始"}
          >
            {recording ? "■" : "●"}
            <span>{recording ? "STOP" : "TALK"}</span>
          </button>
          <button className="translateBtn" onClick={() => translate()}>
            TRANSLATE
          </button>
        </div>

        <div className="panel output">
          <div className="panelTitle">TRANSLATED VOICE</div>
          <div className="translation">
            {translated || "翻訳結果がここに表示されます"}
          </div>
          <button className="speakBtn" onClick={() => speak()}>
            ▶ REPLAY
          </button>
        </div>

        <div className="notice">
          VOICE PROFILE: bright / articulate / retro sci-fi navigator / original synthetic voice
        </div>
      </section>
    </main>
  );
}
