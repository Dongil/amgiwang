"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Upload, FileText, Check, AlertCircle } from "lucide-react";
import Link from "next/link";
import type { WordMasterEntry } from "@/lib/wordmaster/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadScript(src: string): Promise<any> {
  return import(/* webpackIgnore: true */ src);
}

interface ParseResponse {
  totalDays: number;
  totalWords: number;
  sample: WordMasterEntry[];
  entries: WordMasterEntry[];
  errors: string[];
}

export default function ImportWordMasterPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [deckTitle, setDeckTitle] = useState("Word Master 고등 Complete");
  const [deckOption, setDeckOption] = useState<"single" | "per-day">("single");
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResponse | null>(null);
  const [importResult, setImportResult] = useState<{
    deckId: string;
    importedCount: number;
  } | null>(null);
  const [error, setError] = useState("");

  const sample = useMemo(() => parseResult?.sample ?? [], [parseResult?.sample]);

  async function handleParse() {
    if (!file) return;
    setParsing(true);
    setError("");
    setParseResult(null);

    try {
      console.log("[WM] Extracting text from PDF...", file.name);
      // pdfjs를 CDN에서 로드 (npm 패키지 설치 없이)
      const PDFJS_VERSION = "4.9.155";
      const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;
      const pdfjsLib = await loadScript(`${PDFJS_CDN}/pdf.min.mjs`);
      pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.mjs`;

      const arrayBuf = await file.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
      let fullText = "";
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((item: { str?: string }) => item.str || "").join("") + "\n";
      }
      console.log("[WM] Extracted text length:", fullText.length);

      // 서버에 텍스트 전송하여 파싱
      const res = await fetch("/api/wordmaster/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: fullText }),
      });
      console.log("[WM] Response status:", res.status);
      const respText = await res.text();
      if (!res.ok) {
        const data = JSON.parse(respText);
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data: ParseResponse = JSON.parse(respText);
      setParseResult(data);
    } catch (e) {
      console.error("[WM] Error:", e);
      setError((e as Error).message);
    } finally {
      setParsing(false);
    }
  }

  async function handleImport() {
    if (!parseResult) return;
    setImporting(true);
    setError("");

    try {
      const res = await fetch("/api/wordmaster/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: parseResult.entries,
          deckOption,
          deckTitle,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Import failed");
      }
      const data = await res.json();
      setImportResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-5 p-5">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="뒤로 가기">
          <Link href="/decks">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold tracking-tight">
          Word Master 임포트
        </h1>
      </div>

      {importResult ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <p className="text-lg font-medium">
              {importResult.importedCount}개 단어 임포트 완료!
            </p>
            <Button
              className="h-12 w-full rounded-xl"
              onClick={() => router.push(`/decks/${importResult.deckId}`)}
            >
              덱으로 이동
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* File Selection */}
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">PDF 파일</label>
                <div
                  className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-4 transition-colors hover:border-primary/50"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {file ? file.name : "PDF 파일을 선택하세요"}
                  </span>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] || null);
                    setParseResult(null);
                    setError("");
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">임포트 옵션</label>
                <div className="flex gap-2">
                  {[
                    { value: "single" as const, label: "단일 덱 (추천)" },
                    { value: "per-day" as const, label: "DAY별 덱" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`flex-1 rounded-xl border-2 p-3 text-sm transition-colors ${
                        deckOption === opt.value
                          ? "border-primary bg-primary/5 font-medium"
                          : "border-muted"
                      }`}
                      onClick={() => setDeckOption(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">덱 이름</label>
                <Input
                  className="h-12 rounded-xl"
                  value={deckTitle}
                  onChange={(e) => setDeckTitle(e.target.value)}
                />
              </div>
              <Button
                className="h-12 w-full rounded-xl"
                disabled={!file || parsing}
                onClick={handleParse}
              >
                {parsing ? "파싱 중..." : "파싱 시작"}
              </Button>
            </CardContent>
          </Card>

          {/* Error */}
          {error && (
            <Card className="border-destructive">
              <CardContent className="flex items-center gap-2 p-4">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Loading */}
          {parsing && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          )}

          {/* Parse Result */}
          {parseResult && (
            <>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-medium">파싱 결과</p>
                      <p className="text-sm text-muted-foreground">
                        {parseResult.totalDays} DAY / {parseResult.totalWords}{" "}
                        단어
                        {parseResult.errors.length > 0 &&
                          ` / ${parseResult.errors.length} 오류`}
                      </p>
                    </div>
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              {/* Sample Preview */}
              <div className="space-y-3">
                <p className="text-sm font-medium">미리보기</p>
                {sample.map((entry) => (
                  <Card key={entry.wordNumber}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">
                              #{String(entry.wordNumber).padStart(4, "0")}
                            </Badge>
                            <span className="font-medium">{entry.word}</span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {entry.meanings
                              .map((m) => `${m.pos} ${m.meaning}`)
                              .join(" / ")}
                          </p>
                          {entry.collocations.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {entry.collocations.slice(0, 3).map((c, i) => (
                                <Badge
                                  key={i}
                                  variant="secondary"
                                  className="text-[10px]"
                                >
                                  {c.phrase}
                                  {c.source && ` (${c.source})`}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          DAY {entry.dayNumber}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Errors */}
              {parseResult.errors.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-destructive">
                      파싱 오류 ({parseResult.errors.length}건)
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {parseResult.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Import Button */}
              <Button
                className="h-12 w-full rounded-xl text-base"
                disabled={importing || parseResult.totalWords === 0}
                onClick={handleImport}
              >
                {importing
                  ? "임포트 중..."
                  : `${parseResult.totalWords}개 단어 임포트`}
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}
