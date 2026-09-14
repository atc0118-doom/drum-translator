# DRUM Translator

スマホのマイクに話す → 音声認識 → 翻訳 → オリジナルのSFアニメ系ナビゲーターボイスで読み上げる、Vercel向けNext.jsアプリです。

## 1. ローカル起動

```bash
npm install
cp .env.example .env.local
```

`.env.local` の `OPENAI_API_KEY` に自分のAPIキーを設定してください。

```bash
npm run dev
```

http://localhost:3000 を開きます。

## 2. Vercel

1. このフォルダをGitHubへアップロード
2. Vercelで `New Project`
3. GitHubリポジトリをImport
4. Environment Variables に `OPENAI_API_KEY` を登録
5. Deploy

必要なら以下も登録できます。

- `OPENAI_TEXT_MODEL=gpt-5.6-luna`
- `OPENAI_TRANSCRIBE_MODEL=gpt-4o-transcribe`
- `OPENAI_TTS_MODEL=gpt-4o-mini-tts`
- `OPENAI_TTS_VOICE=alloy`

## 音声キャラクターについて

実在する声優本人の声の再現・クローンではありません。
「明瞭」「知的」「テンポやや速め」「快活」「90年代SFアニメ風」という抽象的な特徴を使ったオリジナル音声キャラクターです。

## 次の拡張候補

- 翻訳履歴
- 会話モード（連続録音）
- モンゴル語優先UI
- PWA化 / ホーム画面追加
- 音声プロファイル切替
- Realtime APIを使った遅延の少ない連続通訳
