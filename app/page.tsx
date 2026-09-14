"use client";

import { useRef, useState } from "react";

export default function Home() {
  const [source, setSource] = useState("");
  const [translated, setTranslated] = useState("");
  const [status, setStatus] = useState("READY");
  const [recording, setRecording] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function speak(text: string) {
    if (!text.trim()) return;

    setStatus("SPEAKING");

    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          language: "ja",
        }),
      });

      if (!res.ok) {
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
        throw new Error(data.error || "translation failed");
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
        await navigator.mediaDevices.getUserMedia({ audio: true });

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

        stream.getTracks().forEach((track) => track.stop());

        const form = new FormData();
        form.append("audio", blob, "speech.webm");

        try {
          const res = await fetch("/api/transcribe", {
            method: "POST",
            body: form,
          });

          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.error || "transcription failed");
          }

          const text = data.text || "";
          set
