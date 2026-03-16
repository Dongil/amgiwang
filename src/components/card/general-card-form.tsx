"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface GeneralCardFormProps {
  onSubmit: (card: { front_text: string; back_text: string; tags: string[] }) => void;
  isLoading?: boolean;
  initialData?: { front_text: string; back_text: string; tags: string[] };
}

export function GeneralCardForm({ onSubmit, isLoading, initialData }: GeneralCardFormProps) {
  const [frontText, setFrontText] = useState(initialData?.front_text ?? "");
  const [backText, setBackText] = useState(initialData?.back_text ?? "");
  const [tagsInput, setTagsInput] = useState(initialData?.tags.join(", ") ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    onSubmit({ front_text: frontText, back_text: backText, tags });
    if (!initialData) {
      setFrontText("");
      setBackText("");
      setTagsInput("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="front">앞면 (질문/용어)</Label>
        <Textarea
          id="front"
          placeholder="예: 광합성이란?"
          value={frontText}
          onChange={(e) => setFrontText(e.target.value)}
          required
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="back">뒷면 (답/설명)</Label>
        <Textarea
          id="back"
          placeholder="예: 식물이 빛에너지를 이용해 이산화탄소와 물을 포도당으로 합성하는 과정"
          value={backText}
          onChange={(e) => setBackText(e.target.value)}
          required
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tags">태그 (쉼표로 구분, 선택)</Label>
        <Input
          id="tags"
          placeholder="예: 1단원, 중간고사"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "저장 중…" : initialData ? "수정" : "카드 추가"}
      </Button>
    </form>
  );
}
