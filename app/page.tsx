"use client";

import { useRef, useState } from "react";

const modes = [
  {
    id: "bright",
    label: "A // BRIGHT",
    desc: "明るく自然",
  },
  {
    id: "snappy",
    label: "B // SNAPPY",
    desc: "速め・キレ重視",
  },
  {
    id: "lively",
    label: "C // LIVELY",
    desc: "元気・抑揚強め",
  },
];

export default function Home() {
  const [source, setSource] = useState("");
  const [translated, setTranslated] = useState("");
  const [status, setStatus] = useState("READY");
  const [recording, setRecording] = useState(false);
  const [mode, setMode] = useState("snappy");

  const recorderRef =
    useRef<MediaRecorder | null>(null);

  const chunksRef =
    useRef<Blob[]>([]);

  const audioRef =
    useRef<HTMLAudioElement | null>(null);

  async function speak(
    text: string,
    selectedMode = mode
  ) {
    if (!text.trim()) return;

    setStatus(
      `MARIN // ${selectedMode.toUpperCase()}`
    );

    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          language: "ja",
          mode: selectedMode,
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

  async function translate(
    text = source
  ) {
    if (!text.trim()) return;

    setStatus("TRANSLATING");

    try {
      const res =
        await fetch("/api/translate", {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
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
          data.error ||
            "translation failed"
        );
      }

      const result =
        data.translation || "";

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

      const recorder =
        new MediaRecorder(stream);

      chunksRef.current = [];
      recorderRef.current =
        recorder;

      recorder.ondataavailable =
        (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(
              e.data
            );
          }
        };

      recorder.onstop =
        async () => {
          setStatus("TRANSCRIBING");

          const blob =
            new Blob(
              chunksRef.current,
              {
                type:
                  recorder.mimeType ||
                  "audio/webm",
              }
            );

          stream
            .getTracks()
            .forEach(
              (track) =>
                track.stop()
            );

          const form =
            new FormData();

          form.append(
            "audio",
            blob,
            "speech.webm"
          );

          try {
            const res =
              await fetch(
                "/api/transcribe",
                {
                  method: "POST",
                  body: form,
                }
              );

            const data =
              await res.json();

            if (!res.ok) {
              throw new Error(
                data.error ||
                  "transcription failed"
              );
            }

            const text =
              data.text || "";

            setSource(text);

            if (text) {
              await translate(text);
            } else {
              setStatus("READY");
            }
          } catch (error) {
            console.error(error);
            setStatus(
              "TRANSCRIBE ERROR"
            );
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

  async function testMode(
    selectedMode: string
  ) {
    setMode(selectedMode);

    await speak(
      "うん、わかったよ。じゃあ行こっか。大丈夫、私に任せてね。",
      selectedMode
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
      <p>
        FIELD TRANSLATION TERMINAL
      </p>

      <h1>DRUM // MARIN TEST</h1>

      <p>STATUS: {status}</p>

      <h2>VOICE MODE</h2>

      <div
        style={{
          display: "grid",
          gap: "10px",
          marginBottom: "22px",
        }}
      >
        {modes.map((item) => (
          <button
            key={item.id}
            onClick={() =>
              testMode(item.id)
            }
            style={{
              padding: "18px 14px",
              textAlign: "left",
              borderRadius: "8px",
              color: "white",
              background:
                mode === item.id
                  ? "#292929"
                  : "#111",
              border:
                mode === item.id
                  ? "2px solid white"
                  : "1px solid #555",
            }}
          >
            <div
              style={{
                fontSize: "17px",
                fontWeight: "bold",
              }}
            >
              ▶ {item.label}
            </div>

            <div
              style={{
                marginTop: "4px",
                opacity: 0.7,
                fontSize: "13px",
              }}
            >
              {item.desc}
            </div>
          </button>
        ))}
      </div>

      <p>
        VOICE: <strong>MARIN</strong>
        <br />
        MODE:{" "}
        <strong>
          {mode.toUpperCase()}
        </strong>
      </p>

      <textarea
        value={source}
        onChange={(e) =>
          setSource(e.target.value)
        }
        placeholder=
          "話しかけるか、ここに入力"
        style={{
          width: "100%",
          minHeight: "140px",
          padding: "15px",
          fontSize: "18px",
          background: "#111",
          color: "white",
          boxSizing: "border-box",
          borderRadius: "8px",
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
          onClick={() =>
            translate()
          }
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
