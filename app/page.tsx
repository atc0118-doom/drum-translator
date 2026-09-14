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

  /*
    +6 semitones
    2^(6/12) = 約1.414
  */
  const PITCH_SEMITONES = 6;

  function hannWindow(x: number) {
    return 0.5 - 0.5 * Math.cos(2 * Math.PI * x);
  }

  /*
    簡易グラニュラー・ピッチシフト

    再生速度を単純に上げるのではなく、
    短い音声断片を重ねてピッチを変更する。

    これにより、
    +6半音の高さを保ちながら
    全体の長さをほぼ維持する。
  */
  async function pitchShift(
    blob: Blob,
    semitones: number
  ): Promise<Blob> {
    setStatus("PITCH PROCESSING");

    const arrayBuffer = await blob.arrayBuffer();

    const audioContext = new AudioContext();

    const decoded =
      await audioContext.decodeAudioData(
        arrayBuffer.slice(0)
      );

    const sampleRate = decoded.sampleRate;
    const channels = decoded.numberOfChannels;
    const length = decoded.length;

    const ratio = Math.pow(
      2,
      semitones / 12
    );

    /*
      40ms程度のgrain
      10msごとに重ねる
    */
    const grainSize = Math.floor(
      sampleRate * 0.04
    );

    const hopSize = Math.floor(
      grainSize / 4
    );

    const output =
      audioContext.createBuffer(
        channels,
        length,
        sampleRate
      );

    for (
      let channel = 0;
      channel < channels;
      channel++
    ) {
      const input =
        decoded.getChannelData(channel);

      const out =
        output.getChannelData(channel);

      const weights =
        new Float32Array(length);

      for (
        let grainStart = 0;
        grainStart < length;
        grainStart += hopSize
      ) {
        for (
          let i = 0;
          i < grainSize;
          i++
        ) {
          const outputIndex =
            grainStart + i;

          if (
            outputIndex >= length
          ) {
            break;
          }

          /*
            grain内部だけを
            ratio倍の速度で読む
          */
          const sourcePosition =
            grainStart +
            i * ratio;

          if (
            sourcePosition >=
            length - 1
          ) {
            break;
          }

          const index0 =
            Math.floor(sourcePosition);

          const index1 =
            Math.min(
              index0 + 1,
              length - 1
            );

          const fraction =
            sourcePosition - index0;

          /*
            線形補間
          */
          const sample =
            input[index0] *
              (1 - fraction) +
            input[index1] *
              fraction;

          const window =
            hannWindow(
              i / grainSize
            );

          out[outputIndex] +=
            sample * window;

          weights[outputIndex] +=
            window;
        }
      }

      /*
        重なったgrainを正規化
      */
      for (
        let i = 0;
        i < length;
        i++
      ) {
        if (weights[i] > 0) {
          out[i] /= weights[i];
        }
      }
    }

    await audioContext.close();

    return audioBufferToWav(
      output
    );
  }

  /*
    AudioBuffer → WAV
  */
  function audioBufferToWav(
    buffer: AudioBuffer
  ): Blob {
    const numberOfChannels =
      buffer.numberOfChannels;

    const sampleRate =
      buffer.sampleRate;

    const length =
      buffer.length;

    const bytesPerSample = 2;

    const blockAlign =
      numberOfChannels *
      bytesPerSample;

    const dataLength =
      length *
      blockAlign;

    const arrayBuffer =
      new ArrayBuffer(
        44 + dataLength
      );

    const view =
      new DataView(arrayBuffer);

    function writeString(
      offset: number,
      text: string
    ) {
      for (
        let i = 0;
        i < text.length;
        i++
      ) {
        view.setUint8(
          offset + i,
          text.charCodeAt(i)
        );
      }
    }

    writeString(0, "RIFF");

    view.setUint32(
      4,
      36 + dataLength,
      true
    );

    writeString(8, "WAVE");
    writeString(12, "fmt ");

    view.setUint32(
      16,
      16,
      true
    );

    view.setUint16(
      20,
      1,
      true
    );

    view.setUint16(
      22,
      numberOfChannels,
      true
    );

    view.setUint32(
      24,
      sampleRate,
      true
    );

    view.setUint32(
      28,
      sampleRate * blockAlign,
      true
    );

    view.setUint16(
      32,
      blockAlign,
      true
    );

    view.setUint16(
      34,
      16,
      true
    );

    writeString(36, "data");

    view.setUint32(
      40,
      dataLength,
      true
    );

    const channelData = [];

    for (
      let channel = 0;
      channel < numberOfChannels;
      channel++
    ) {
      channelData.push(
        buffer.getChannelData(
          channel
        )
      );
    }

    let offset = 44;

    for (
      let i = 0;
      i < length;
      i++
    ) {
      for (
        let channel = 0;
        channel < numberOfChannels;
        channel++
      ) {
        let sample =
          channelData[channel][i];

        sample = Math.max(
          -1,
          Math.min(1, sample)
        );

        const intSample =
          sample < 0
            ? sample * 32768
            : sample * 32767;

        view.setInt16(
          offset,
          intSample,
          true
        );

        offset += 2;
      }
    }

    return new Blob(
      [arrayBuffer],
      {
        type: "audio/wav",
      }
    );
  }

  async function speak(text: string) {
    if (!text.trim()) return;

    setStatus("GENERATING VOICE");

    try {
      /*
        まず通常速度のMARINを取得
      */
      const res = await fetch(
        "/api/speak",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            text,
            language: "ja",
            mode: "snappy",
          }),
        }
      );

      if (!res.ok) {
        const errorText =
          await res.text();

        console.error(
          errorText
        );

        throw new Error(
          "speech failed"
        );
      }

      const originalBlob =
        await res.blob();

      /*
        +6半音だけ上げる
      */
      const shiftedBlob =
        await pitchShift(
          originalBlob,
          PITCH_SEMITONES
        );

      const url =
        URL.createObjectURL(
          shiftedBlob
        );

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio =
        new Audio(url);

      audioRef.current =
        audio;

      /*
        速度は通常
      */
      audio.playbackRate = 1.0;

      audio.onplay = () => {
        setStatus(
          "MARIN // PITCH +6"
        );
      };

      audio.onended = () => {
        setStatus("READY");

        URL.revokeObjectURL(
          url
        );
      };

      await audio.play();

    } catch (error) {
      console.error(error);

      setStatus(
        "VOICE ERROR"
      );
    }
  }

  async function translate(
    text = source
  ) {
    if (!text.trim()) return;

    setStatus(
      "TRANSLATING"
    );

    try {
      const res =
        await fetch(
          "/api/translate",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              text,
              sourceLang:
                "auto",
              targetLang:
                "ja",
            }),
          }
        );

      const data =
        await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "translation failed"
        );
      }

      const result =
        data.translation ||
        "";

      setTranslated(
        result
      );

      if (result) {
        await speak(
          result
        );
      } else {
        setStatus(
          "READY"
        );
      }

    } catch (error) {
      console.error(error);

      setStatus(
        "TRANSLATE ERROR"
      );
    }
  }

  async function startRecording() {
    try {
      const stream =
        await navigator
          .mediaDevices
          .getUserMedia({
            audio: true,
          });

      const recorder =
        new MediaRecorder(
          stream
        );

      chunksRef.current =
        [];

      recorderRef.current =
        recorder;

      recorder.ondataavailable =
        (e) => {
          if (
            e.data.size > 0
          ) {
            chunksRef.current.push(
              e.data
            );
          }
        };

      recorder.onstop =
        async () => {

          setStatus(
            "TRANSCRIBING"
          );

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
              await translate(
                text
              );
            } else {
              setStatus(
                "READY"
              );
            }

          } catch (error) {
            console.error(
              error
            );

            setStatus(
              "TRANSCRIBE ERROR"
            );
          }
        };

      recorder.start();

      setRecording(
        true
      );

      setStatus(
        "LISTENING"
      );

    } catch (error) {
      console.error(error);

      setStatus(
        "MIC ERROR"
      );
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
        minHeight:
          "100vh",

        background:
          "#05070a",

        color:
          "white",

        padding:
          "24px",

        fontFamily:
          "Arial",
      }}
    >

      <p>
        FIELD TRANSLATION TERMINAL
      </p>

      <h1>
        DRUM // VOICE
      </h1>

      <p>
        STATUS: {status}
      </p>

      <div
        style={{
          padding:
            "16px",

          border:
            "1px solid #555",

          borderRadius:
            "8px",

          marginBottom:
            "20px",
        }}
      >

        <div
          style={{
            fontSize:
              "13px",

            opacity:
              0.7,
          }}
        >
          VOICE
        </div>

        <div
          style={{
            fontSize:
              "22px",

            fontWeight:
              "bold",
          }}
        >
          MARIN
        </div>

        <div>
          PITCH +6
        </div>

        <div>
          SPEED 1.00x
        </div>

      </div>

      <button
        onClick={
          testVoice
        }

        style={{
          padding:
            "18px",

          width:
            "100%",

          fontSize:
            "18px",

          marginBottom:
            "22px",
        }}
      >
        ▶ TEST DRUM VOICE
      </button>

      <textarea
        value={
          source
        }

        onChange={
          (e) =>
            setSource(
              e.target.value
            )
        }

        placeholder=
          "話しかけるか、ここに入力"

        style={{
          width:
            "100%",

          minHeight:
            "140px",

          padding:
            "15px",

          fontSize:
            "18px",

          background:
            "#111",

          color:
            "white",

          boxSizing:
            "border-box",

          borderRadius:
            "8px",
        }}
      />

      <div
        style={{
          marginTop:
            "20px",

          display:
            "flex",

          gap:
            "10px",
        }}
      >

        <button
          onClick={
            recording
              ? stopRecording
              : startRecording
          }

          style={{
            padding:
              "20px",

            flex:
              1,
          }}
        >
          {recording
            ? "STOP"
            : "● TALK"}
        </button>

        <button
          onClick={
            () =>
              translate()
          }

          style={{
            padding:
              "20px",

            flex:
              1,
          }}
        >
          TRANSLATE
        </button>

      </div>

      <h2>
        TRANSLATED
      </h2>

      <div
        style={{
          fontSize:
            "24px",

          marginBottom:
            "20px",
        }}
      >
        {translated ||
          "翻訳結果がここに表示されます"}
      </div>

      <button
        onClick={
          () =>
            speak(
              translated
            )
        }

        disabled={
          !translated
        }

        style={{
          padding:
            "16px 24px",

          fontSize:
            "18px",

          width:
            "100%",
        }}
      >
        ▶ REPLAY VOICE
      </button>

    </main>
  );
}
