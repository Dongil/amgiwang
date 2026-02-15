"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ClassifiedPage {
  pageNum: number;
  text: string;
  type: "toc" | "vocab" | "quiz" | "plan" | "other";
  dayNumber?: number;
}

interface PdfParseResult {
  totalPages: number;
  pages: ClassifiedPage[];
  fileUrl: string;
}

interface PdfUploaderProps {
  deckId: string;
  deckType: string;
  onParsed: (result: PdfParseResult) => void;
}

export function PdfUploader({ deckId, deckType, onParsed }: PdfUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFile = useCallback(
    async (selectedFile: File) => {
      if (selectedFile.type !== "application/pdf") {
        toast.error("PDF 파일만 업로드할 수 있습니다.");
        return;
      }

      if (selectedFile.size > 50 * 1024 * 1024) {
        toast.error("파일 크기는 50MB 이하여야 합니다.");
        return;
      }

      setFile(selectedFile);
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("deckId", deckId);

        const res = await fetch("/api/pdf/parse", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "PDF 파싱 실패");
        }

        const result: PdfParseResult = await res.json();
        onParsed(result);
        toast.success(`${result.totalPages}페이지 분석 완료!`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "업로드 실패");
        setFile(null);
      } finally {
        setIsUploading(false);
      }
    },
    [deckId, onParsed]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFile(selectedFile);
  }

  if (isUploading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="text-center">
            <p className="font-medium">PDF 분석 중...</p>
            <p className="mt-1 text-sm text-muted-foreground">{file?.name}</p>
          </div>
          <Progress value={50} className="w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center gap-4 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25"
          }`}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            {file ? (
              <FileText className="h-8 w-8 text-primary" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
          </div>

          <div>
            <p className="font-medium">
              {isDragging ? "여기에 놓으세요!" : "PDF 파일을 끌어놓거나 클릭하세요"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {deckType === "english_vocab"
                ? "영어단어장 PDF에서 단어를 자동 추출합니다"
                : "PDF에서 학습 카드를 자동 생성합니다"}
            </p>
          </div>

          <label className="cursor-pointer">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileInput}
              className="hidden"
            />
            <Button type="button" variant="outline" asChild>
              <span>파일 선택</span>
            </Button>
          </label>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <AlertCircle className="h-3 w-3" />
            <span>최대 50MB, PDF 형식</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
