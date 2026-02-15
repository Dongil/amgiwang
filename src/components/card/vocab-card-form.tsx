"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { VocabMeaning, VocabRelated } from "@/types/database";

interface VocabCardData {
  word: string;
  meaning: string;
  meanings: VocabMeaning[];
  phonetic?: string;
  example_sentence?: string;
  example_translation?: string;
  derivatives?: VocabRelated[];
  antonyms?: VocabRelated[];
  root?: string;
  prefix?: string;
  suffix?: string;
  etymology_note?: string;
  mnemonic?: string;
  tips?: string;
  tags?: string[];
}

interface VocabCardFormProps {
  onSubmit: (card: VocabCardData) => void;
  isLoading?: boolean;
  initialData?: VocabCardData;
}

function parseRelated(input: string): VocabRelated[] {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const colonIdx = s.indexOf(":");
      if (colonIdx === -1) return { word: s, meaning: "" };
      return { word: s.slice(0, colonIdx).trim(), meaning: s.slice(colonIdx + 1).trim() };
    });
}

function relatedToString(items?: VocabRelated[]): string {
  if (!items || items.length === 0) return "";
  return items.map((r) => (r.meaning ? `${r.word}:${r.meaning}` : r.word)).join(", ");
}

export function VocabCardForm({ onSubmit, isLoading, initialData }: VocabCardFormProps) {
  const [word, setWord] = useState(initialData?.word ?? "");
  const [phonetic, setPhonetic] = useState(initialData?.phonetic ?? "");
  const [meanings, setMeanings] = useState<VocabMeaning[]>(
    initialData?.meanings?.length
      ? initialData.meanings
      : [{ pos: "", meaning: "", synonyms: [] }]
  );
  const [derivativesInput, setDerivativesInput] = useState(relatedToString(initialData?.derivatives));
  const [antonymsInput, setAntonymsInput] = useState(relatedToString(initialData?.antonyms));
  const [exampleSentence, setExampleSentence] = useState(initialData?.example_sentence ?? "");
  const [exampleTranslation, setExampleTranslation] = useState(initialData?.example_translation ?? "");
  const [root, setRoot] = useState(initialData?.root ?? "");
  const [prefix, setPrefix] = useState(initialData?.prefix ?? "");
  const [suffix, setSuffix] = useState(initialData?.suffix ?? "");
  const [etymologyNote, setEtymologyNote] = useState(initialData?.etymology_note ?? "");
  const [mnemonic, setMnemonic] = useState(initialData?.mnemonic ?? "");
  const [tips, setTips] = useState(initialData?.tips ?? "");
  const [tagsInput, setTagsInput] = useState(initialData?.tags?.join(", ") ?? "");

  function addMeaning() {
    setMeanings([...meanings, { pos: "", meaning: "", synonyms: [] }]);
  }

  function removeMeaning(index: number) {
    if (meanings.length <= 1) return;
    setMeanings(meanings.filter((_, i) => i !== index));
  }

  function updateMeaning(index: number, field: keyof VocabMeaning, value: string | string[]) {
    setMeanings(meanings.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const split = (s: string) => s.split(",").map((t) => t.trim()).filter(Boolean);
    onSubmit({
      word,
      meaning: meanings[0]?.meaning || "",
      meanings,
      phonetic: phonetic || undefined,
      example_sentence: exampleSentence || undefined,
      example_translation: exampleTranslation || undefined,
      derivatives: parseRelated(derivativesInput),
      antonyms: parseRelated(antonymsInput),
      root: root || undefined,
      prefix: prefix || undefined,
      suffix: suffix || undefined,
      etymology_note: etymologyNote || undefined,
      mnemonic: mnemonic || undefined,
      tips: tips || undefined,
      tags: split(tagsInput),
    });
    if (!initialData) {
      setWord("");
      setPhonetic("");
      setMeanings([{ pos: "", meaning: "", synonyms: [] }]);
      setDerivativesInput("");
      setAntonymsInput("");
      setExampleSentence("");
      setExampleTranslation("");
      setRoot("");
      setPrefix("");
      setSuffix("");
      setEtymologyNote("");
      setMnemonic("");
      setTips("");
      setTagsInput("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 영단어 + 발음기호 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="word">영단어 *</Label>
          <Input
            id="word"
            placeholder="regard"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phonetic">발음기호</Label>
          <Input
            id="phonetic"
            placeholder="/rigɑ́ːrd/"
            value={phonetic}
            onChange={(e) => setPhonetic(e.target.value)}
          />
        </div>
      </div>

      {/* 동적 뜻 배열 */}
      {meanings.map((m, i) => (
        <div key={i} className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">뜻 #{i + 1}</span>
            {i > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => removeMeaning(i)}>
                삭제
              </Button>
            )}
          </div>
          <div className="grid grid-cols-[1fr_80px] gap-2">
            <div className="space-y-1">
              <Label>뜻 {i === 0 ? "*" : ""}</Label>
              <Input
                placeholder="여기다, 간주하다"
                value={m.meaning}
                onChange={(e) => updateMeaning(i, "meaning", e.target.value)}
                required={i === 0}
              />
            </div>
            <div className="space-y-1">
              <Label>품사</Label>
              <Input
                placeholder="v"
                value={m.pos}
                onChange={(e) => updateMeaning(i, "pos", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>동의어 (쉼표 구분)</Label>
            <Input
              placeholder="consider, think of, see"
              value={m.synonyms.join(", ")}
              onChange={(e) =>
                updateMeaning(
                  i,
                  "synonyms",
                  e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                )
              }
            />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addMeaning} className="w-full">
        + 뜻 추가
      </Button>

      {/* 파생어 */}
      <div className="space-y-2">
        <Label htmlFor="derivatives">파생어 (word:뜻, word:뜻)</Label>
        <Input
          id="derivatives"
          placeholder="regardless:상관없이, regarding:~에 관하여"
          value={derivativesInput}
          onChange={(e) => setDerivativesInput(e.target.value)}
        />
      </div>

      {/* 반의어 */}
      <div className="space-y-2">
        <Label htmlFor="antonyms">반의어 (word:뜻, word:뜻)</Label>
        <Input
          id="antonyms"
          placeholder="disregard:무시하다"
          value={antonymsInput}
          onChange={(e) => setAntonymsInput(e.target.value)}
        />
      </div>

      {/* 예문 */}
      <div className="space-y-2">
        <Label htmlFor="example">예문</Label>
        <Textarea
          id="example"
          placeholder="She was worried that her fans would still regard her..."
          value={exampleSentence}
          onChange={(e) => setExampleSentence(e.target.value)}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="exampleTr">예문 해석</Label>
        <Input
          id="exampleTr"
          placeholder="그녀는 그녀의 팬들이 여전히..."
          value={exampleTranslation}
          onChange={(e) => setExampleTranslation(e.target.value)}
        />
      </div>

      {/* 어원 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="prefix">접두사</Label>
          <Input
            id="prefix"
            placeholder="re-"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="root">어근</Label>
          <Input
            id="root"
            placeholder="gard"
            value={root}
            onChange={(e) => setRoot(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="suffix">접미사</Label>
          <Input
            id="suffix"
            placeholder=""
            value={suffix}
            onChange={(e) => setSuffix(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="etymologyNote">어원 설명</Label>
        <Input
          id="etymologyNote"
          placeholder="라틴어 regarder..."
          value={etymologyNote}
          onChange={(e) => setEtymologyNote(e.target.value)}
        />
      </div>

      {/* 연상법 */}
      <div className="space-y-2">
        <Label htmlFor="mnemonic">연상법 (암기 힌트)</Label>
        <Input
          id="mnemonic"
          placeholder="리가드 → 리 가드 → ..."
          value={mnemonic}
          onChange={(e) => setMnemonic(e.target.value)}
        />
      </div>

      {/* Tips */}
      <div className="space-y-2">
        <Label htmlFor="tips">Tips (시험 패턴)</Label>
        <Textarea
          id="tips"
          placeholder="with regard to ~에 관해서&#10;regard A as B"
          value={tips}
          onChange={(e) => setTips(e.target.value)}
          rows={2}
        />
      </div>

      {/* 태그 */}
      <div className="space-y-2">
        <Label htmlFor="vtags">태그 (쉼표 구분)</Label>
        <Input
          id="vtags"
          placeholder="수능필수, Day1"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "저장 중..." : initialData ? "수정" : "단어 추가"}
      </Button>
    </form>
  );
}
