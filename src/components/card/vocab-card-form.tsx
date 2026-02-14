"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface VocabCardData {
  word: string;
  meaning: string;
  meaning_sub?: string;
  phonetic?: string;
  part_of_speech?: string;
  example_sentence?: string;
  example_translation?: string;
  synonyms?: string[];
  antonyms?: string[];
  root?: string;
  prefix?: string;
  suffix?: string;
  etymology_note?: string;
  mnemonic?: string;
  tags?: string[];
}

interface VocabCardFormProps {
  onSubmit: (card: VocabCardData) => void;
  isLoading?: boolean;
  initialData?: VocabCardData;
}

export function VocabCardForm({ onSubmit, isLoading, initialData }: VocabCardFormProps) {
  const [word, setWord] = useState(initialData?.word ?? "");
  const [meaning, setMeaning] = useState(initialData?.meaning ?? "");
  const [meaningSub, setMeaningSub] = useState(initialData?.meaning_sub ?? "");
  const [phonetic, setPhonetic] = useState(initialData?.phonetic ?? "");
  const [partOfSpeech, setPartOfSpeech] = useState(initialData?.part_of_speech ?? "");
  const [exampleSentence, setExampleSentence] = useState(initialData?.example_sentence ?? "");
  const [exampleTranslation, setExampleTranslation] = useState(initialData?.example_translation ?? "");
  const [synonymsInput, setSynonymsInput] = useState(initialData?.synonyms?.join(", ") ?? "");
  const [antonymsInput, setAntonymsInput] = useState(initialData?.antonyms?.join(", ") ?? "");
  const [root, setRoot] = useState(initialData?.root ?? "");
  const [prefix, setPrefix] = useState(initialData?.prefix ?? "");
  const [suffix, setSuffix] = useState(initialData?.suffix ?? "");
  const [etymologyNote, setEtymologyNote] = useState(initialData?.etymology_note ?? "");
  const [mnemonic, setMnemonic] = useState(initialData?.mnemonic ?? "");
  const [tagsInput, setTagsInput] = useState(initialData?.tags?.join(", ") ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const split = (s: string) => s.split(",").map((t) => t.trim()).filter(Boolean);
    onSubmit({
      word,
      meaning,
      meaning_sub: meaningSub || undefined,
      phonetic: phonetic || undefined,
      part_of_speech: partOfSpeech || undefined,
      example_sentence: exampleSentence || undefined,
      example_translation: exampleTranslation || undefined,
      synonyms: split(synonymsInput),
      antonyms: split(antonymsInput),
      root: root || undefined,
      prefix: prefix || undefined,
      suffix: suffix || undefined,
      etymology_note: etymologyNote || undefined,
      mnemonic: mnemonic || undefined,
      tags: split(tagsInput),
    });
    if (!initialData) {
      setWord("");
      setMeaning("");
      setMeaningSub("");
      setPhonetic("");
      setPartOfSpeech("");
      setExampleSentence("");
      setExampleTranslation("");
      setSynonymsInput("");
      setAntonymsInput("");
      setRoot("");
      setPrefix("");
      setSuffix("");
      setEtymologyNote("");
      setMnemonic("");
      setTagsInput("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="word">영단어 *</Label>
          <Input
            id="word"
            placeholder="abundant"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="meaning">뜻 *</Label>
          <Input
            id="meaning"
            placeholder="풍부한"
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="phonetic">발음기호</Label>
          <Input
            id="phonetic"
            placeholder="/əˈbʌndənt/"
            value={phonetic}
            onChange={(e) => setPhonetic(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pos">품사</Label>
          <Input
            id="pos"
            placeholder="adj."
            value={partOfSpeech}
            onChange={(e) => setPartOfSpeech(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="meaningSub">보조 뜻</Label>
        <Input
          id="meaningSub"
          placeholder="충분한, 넘치는"
          value={meaningSub}
          onChange={(e) => setMeaningSub(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="example">예문</Label>
        <Textarea
          id="example"
          placeholder="Water is abundant in this region."
          value={exampleSentence}
          onChange={(e) => setExampleSentence(e.target.value)}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="exampleTr">예문 해석</Label>
        <Input
          id="exampleTr"
          placeholder="이 지역은 물이 풍부하다."
          value={exampleTranslation}
          onChange={(e) => setExampleTranslation(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="synonyms">동의어 (쉼표 구분)</Label>
          <Input
            id="synonyms"
            placeholder="plentiful, ample"
            value={synonymsInput}
            onChange={(e) => setSynonymsInput(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="antonyms">반의어 (쉼표 구분)</Label>
          <Input
            id="antonyms"
            placeholder="scarce, rare"
            value={antonymsInput}
            onChange={(e) => setAntonymsInput(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="prefix">접두사</Label>
          <Input
            id="prefix"
            placeholder="ab-"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="root">어근</Label>
          <Input
            id="root"
            placeholder="und"
            value={root}
            onChange={(e) => setRoot(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="suffix">접미사</Label>
          <Input
            id="suffix"
            placeholder="-ant"
            value={suffix}
            onChange={(e) => setSuffix(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="etymologyNote">어원 설명</Label>
        <Input
          id="etymologyNote"
          placeholder="라틴어 abundare (넘치다)"
          value={etymologyNote}
          onChange={(e) => setEtymologyNote(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mnemonic">연상법 (암기 힌트)</Label>
        <Input
          id="mnemonic"
          placeholder="어 번던트 → 어! 번쩍하는 단트 → 풍부"
          value={mnemonic}
          onChange={(e) => setMnemonic(e.target.value)}
        />
      </div>

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
