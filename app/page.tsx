"use client";

import { useRef, useState } from "react";
import { FormantCorrectionNode } from "@soundtouchjs/formant-correction-worklet";

const processorUrl = new URL(
  "@soundtouchjs/formant-correction-worklet/processor",
  import.meta.url
).href;

export default function Home() {
  const [source, setSource] = useState("");
  const [translated, setTranslated] = useState("");
  const [status, setStatus] = useState("READY");
  const [recording, setRecording] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);

  const PITCH = 6;

  async function playShiftedVoice(blob: Blob) {
    setStatus("PITCH PROCESSING");

    const arrayBuffer = await blob.arrayBuffer();

    const audioContext = new AudioContext();

    audioContextRef.current = audioContext;

    await FormantCorrectionNode.register(
      audioContext,
      processorUrl
    );

    const decoded = await audioContext.decodeAudioData(
      arrayBuffer.slice(0)
    );

    const sourceNode = audioContext.createBufferSource();

    sourceNode.buffer = decoded;

    const formantNode = new FormantCorrectionNode({
      context: audioContext,
    });

    formantNode.pitchSemitones.value = PITCH;

    // 1.0 = フォルマント補正最大
    formantNode.formantStrength.value = 1.0;

    // テンポは通常
    sourceNode.playbackRate.value = 1.0;
    formantNode.playbackRate.value = 1.0;

    sourceNode.connect(formantNode);
    formantNode.connect(audioContext.destination);

    sourceNode.onended = async () => {
      setStatus("READY");

      try {
        await audioContext.close();
      } catch {}
    };

    setStatus("MARIN // +6 FORMANT");

    sourceNode.start();
  }

  async function speak(text: string) {
    if (!text.trim()) return;

    setStatus("GENERATING VOICE");

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

      await playShiftedVoice(blob);
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

  async function testVoice() {
    await speak(
      "うん、わかったよ。じゃあ行こっか。大丈夫、私に任せてね。"
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

      <div
        style={{
          padding: "16px",
          border: "1px solid #555",
          borderRadius: "8px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            fontSize: "13px",
            opacity: 0.7,
          }}
        >
          VOICE
        </div>

        <div
          style={{
            fontSize: "22px",
            fontWeight: "bold",
          }}
        >
          MARIN
        </div>

        <div>PITCH +6</div>

        <div>FORMANT CORRECTION ON</div>

        <div>SPEED 1.00x</div>
      </div>

      <button
        onClick={testVoice}
        style={{
          padding: "18px",
          width: "100%",
          fontSize: "18px",
          marginBottom: "22px",
        }}
      >
        ▶ TEST DRUM VOICE
      </button>

      <textarea
        value={source}
        onChange={(e) =>
          setSource(e

