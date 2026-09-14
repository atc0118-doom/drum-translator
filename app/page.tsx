"use client";

import { useRef, useState } from "react";

const voices = [
  { id: "marin", label: "MARIN" },
  { id: "sage", label: "SAGE" },
  { id: "fable", label: "FABLE" },
  { id: "verse", label: "VERSE" },
  { id: "shimmer", label: "SHIMMER" },
  { id: "coral", label: "CORAL" },
];

export default function Home() {
  const [source, setSource] = useState("");
  const [translated, setTranslated] = useState("");
  const [status, setStatus] = useState("READY");
  const [recording, setRecording] = useState(false);
  const [voice, setVoice] = useState("marin");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function speak(text: string, selectedVoice = voice) {
    if (!text.trim()) return;

    setStatus(`SPEAKING // ${selectedVoice.toUpperCase()}`);

    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          language: "ja",
          voice: selectedVoice,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(errorText);
        throw new Error("speech failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setStatus("READY");
        URL.revokeObjectURL(url);
      };

      await audio.play();
    } catch (error) {
      console.error(error);
      setStatus("VOICE ERROR");
    }
  }

  async function translate(text = source) {
    if (!text.trim()) return;

    setStatus("TRANSLATING");

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          sourceLang: "auto",
          targetLang: "ja",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "translation failed"
        );
      }

      const result = data.translation || "";
      setTranslated(result);

      if (result) {
        await speak(result);
      } else {
        setStatus("READY");
      }
    } catch (error) {
      console.error(error);
      setStatus("TRANSLATE ERROR");
    }
  }

  async function startRecording() {
    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      const recorder = new MediaRecorder(stream);

      chunksRef.current = [];
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        setStatus("TRANSCRIBING");

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        stream.getTracks().forEach((track) =>
          track.stop()
        );

        const form = new FormData();

        form.append(
          "audio",
          blob,
          "speech.webm"
        );

        try {
          const res = await fetch(
            "/api/transcribe",
            {
              method: "POST",
              body: form,
            }
          );

          const data = await res.json();

          if (!res.ok) {
            throw new Error(
              data.error || "transcription failed"
            );
          }

          const text = data.text || "";
          setSource(text);

          if (text) {
            await translate(text);
          } else {
            setStatus("READY");
          }
        } catch (error) {
          console.error(error);
          setStatus("TRANSCRIBE ERROR");
        }
      };

      recorder.start();
      setRecording(true);
      setStatus("LISTENING");
    } catch (error) {
      console.error(error);
      setStatus("MIC ERROR");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  async function testVoice(selectedVoice: string) {
    setVoice(selectedVoice);

    await speak(
      "こんにちは。今日はどうする？ 私に任せてね。大丈夫だよ。",
      selectedVoice
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#05070a",
        color: "white",
        padding: "24px",
        fontFamily: "Arial",
      }}
    >
      <p>FIELD TRANSLATION TERMINAL</p>

      <h1>DRUM // VOICE</h1>

      <p>STATUS: {status}</p>

      <h2>VOICE TEST</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(2, minmax(0, 1fr))",
          gap: "10px",
          marginBottom: "25px",
        }}
      >
        {voices.map((item) => (
          <button
            key={item.id}
            onClick={() =>
              testVoice(item.id)
            }
            style={{
              padding: "16px 10px",
              fontSize: "16px",
              fontWeight: "bold",
              border:
                voice === item.id
                  ? "2px solid white"
                  : "1px solid #555",
              background:
                voice === item.id
                  ? "#252525"
                  : "#111",
              color: "white",
              borderRadius: "8px",
            }}
          >
            ▶ {item.label}
          </button>
        ))}
      </div>

      <p>
        SELECTED VOICE:{" "}
        <strong>
          {voice.toUpperCase()}
        </strong>
      </p>

      <textarea
        value={source}
        onChange={(e) =>
          setSource(e.target.value)
        }
        placeholder="話しかけるか、ここに入力"
        style={{
          width: "100%",
          minHeight: "140px",
          padding: "15px",
          fontSize: "18px",
          background: "#111",
          color: "white",
          boxSizing: "border-box",
        }}
      />

      <div
        style={{
          marginTop: "20px",
          display: "flex",
          gap: "10px",
        }}
      >
        <button
          onClick={
            recording
              ? stopRecording
              : startRecording
          }
          style={{
            padding: "20px",
            flex: 1,
          }}
        >
          {recording
            ? "STOP"
            : "● TALK"}
        </button>

        <button
          onClick={() => translate()}
          style={{
            padding: "20px",
            flex: 1,
          }}
        >
          TRANSLATE
        </button>
      </div>

      <h2>TRANSLATED</h2>

      <div
        style={{
          fontSize: "24px",
          marginBottom: "20px",
        }}
      >
        {translated ||
          "翻訳結果がここに表示されます"}
      </div>

      <button
        onClick={() =>
          speak(translated)
        }
        disabled={!translated}
        style={{
          padding: "16px 24px",
          fontSize: "18px",
          width: "100%",
        }}
      >
        ▶ REPLAY VOICE
      </button>
    </main>
  );
}
