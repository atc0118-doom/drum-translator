"use client";

import { useRef, useState } from "react";

const pitchModes = [
  {
    id: "normal",
    label: "NORMAL",
    rate: 1.0,
    desc: "MARIN 原音",
  },
  {
    id: "p2",
    label: "PITCH +2",
    rate: 1.12,
    desc: "少し高め",
  },
  {
    id: "p4",
    label: "PITCH +4",
    rate: 1.26,
    desc: "かなり高め",
  },
  {
    id: "p6",
    label: "PITCH +6",
    rate: 1.41,
    desc: "かなり明るい高音",
  },
];

export default function Home() {
  const [source, setSource] = useState("");
  const [translated, setTranslated] = useState("");
  const [status, setStatus] = useState("READY");
  const [recording, setRecording] = useState(false);
  const [pitchMode, setPitchMode] = useState("p4");

  const recorderRef =
    useRef<MediaRecorder | null>(null);

  const chunksRef =
    useRef<Blob[]>([]);

  const audioRef =
    useRef<HTMLAudioElement | null>(null);

  function getRate(mode: string) {
    const found = pitchModes.find(
      (item) => item.id === mode
    );

    return found?.rate ?? 1.0;
  }

  async function speak(
    text: string,
    selectedPitch = pitchMode
  ) {
    if (!text.trim()) return;

    setStatus(
      `MARIN // ${selectedPitch.toUpperCase()}`
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
          mode: "snappy",
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

      const rate = getRate(selectedPitch);

      audio.playbackRate = rate;

      /*
        Chrome系で対応している場合、
        preservePitchをOFFにして
        再生速度に応じて音程も変化させる。
      */

      try {
        (audio as any).preservesPitch = false;
        (audio as any).mozPreservesPitch = false;
        (audio as any).webkitPreservesPitch = false;
      } catch (e) {
        console.log("Pitch control not supported");
      }

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

      const recorder =
        new MediaRecorder(stream);

      chunksRef.current = [];
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        setStatus("TRANSCRIBING");

        const blob = new Blob(
          chunksRef.current,
          {
            type:
              recorder.mimeType ||
              "audio/webm",
          }
        );

        stream
          .getTracks()
          .forEach((track) =>
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
              data.error ||
                "transcription failed"
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

  async function testPitch(
    selectedPitch: string
  ) {
    setPitchMode(selectedPitch);

    await speak(
      "うん、わかったよ。じゃあ行こっか。大丈夫、私に任せてね。",
      selectedPitch
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

      <h1>DRUM // PITCH TEST</h1>

      <p>STATUS: {status}</p>

      <h2>MARIN PITCH</h2>

      <div
        style={{
          display: "grid",
          gap: "10px",
          marginBottom: "22px",
        }}
      >
        {pitchModes.map((item) => (
          <button
            key={item.id}
            onClick={() =>
              testPitch(item.id)
            }
            style={{
              padding: "18px 14px",
              textAlign: "left",
              borderRadius: "8px",
              color: "white",

              background:
                pitchMode === item.id
                  ? "#292929"
                  : "#111",

              border:
                pitchMode === item.id
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
        PITCH:{" "}
        <strong>
          {
            pitchModes.find(
              (x) =>
                x.id === pitchMode
            )?.label
          }
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
