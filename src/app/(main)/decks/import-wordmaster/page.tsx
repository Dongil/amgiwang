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
        // 줄바꿈 복원: y좌표가 다르면 새 줄로 처리
        let lastY: number | null = null;
        for (const item of content.items) {
          const ti = item as { str?: string; transform?: number[] };
          const y = ti.transform?.[5] ?? 0;
          if (lastY !== null && Math.abs(y - lastY) > 3) {
            fullText += "\n";
          }
          fullText += ti.str || "";
          lastY = y;
        }
        fullText += "\n";
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

              {/* Sample Preview - 전체 필드 표시 */}
              <div className="space-y-3">
                <p className="text-sm font-medium">미리보기 (DAY 1)</p>
                {sample.map((entry) => (
                  <Card key={entry.wordNumber}>
                    <CardContent className="space-y-3 p-4">
                      {/* 헤더: 번호 + 단어 + DAY */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            #{String(entry.wordNumber).padStart(4, "0")}
                          </Badge>
                          <span className="text-base font-bold">{entry.word}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          DAY {entry.dayNumber}
                        </Badge>
                      </div>

                      {/* 품사 + 뜻 */}
                      {entry.meanings.length > 0 && (
                        <div className="text-sm">
                          {entry.meanings.map((m, i) => (
                            <span key={i}>
                              {i > 0 && " / "}
                              <span className="font-medium text-primary">{m.pos}</span>{" "}
                              {m.meaning}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* 예문 */}
                      {entry.exampleSentence && (
                        <div className="rounded-lg bg-muted/50 p-2 text-xs">
                          <p className="italic">{entry.exampleSentence}</p>
                          {entry.exampleTranslation && (
                            <p className="mt-1 text-muted-foreground">
                              {entry.exampleTranslation}
                            </p>
                          )}
                        </div>
                      )}

                      {/* 유의어 */}
                      {entry.synonyms.length > 0 && (
                        <div className="text-xs">
                          <span className="font-medium text-blue-600">=</span>{" "}
                          {entry.synonyms.map((s, i) => (
                            <span key={i}>
                              {i > 0 && ", "}
                              <span className="font-medium">{s.word}</span>
                              {s.meaning && (
                                <span className="text-muted-foreground"> {s.meaning}</span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* 반의어 */}
                      {entry.antonyms.length > 0 && (
                        <div className="text-xs">
                          <span className="font-medium text-red-600">↔</span>{" "}
                          {entry.antonyms.map((a, i) => (
                            <span key={i}>
                              {i > 0 && ", "}
                              <span className="font-medium">{a.word}</span>
                              {a.meaning && (
                                <span className="text-muted-foreground"> {a.meaning}</span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* 관련 표현 (+ marker) */}
                      {entry.relatedExpressions.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-medium text-muted-foreground">
                            관련 표현
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {entry.relatedExpressions.map((r, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="text-[10px]"
                              >
                                {r.phrase} {r.meaning}
                                {r.source && ` (${r.source})`}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Frequent Collocations */}
                      {entry.collocations.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-medium text-muted-foreground">
                            Frequent Collocations
                          </p>
                          {/* 설명문 (phrase가 빈 항목) */}
                          {entry.collocations
                            .filter((c) => !c.phrase && c.meaning)
                            .map((c, i) => (
                              <p key={`desc-${i}`} className="text-[11px] text-muted-foreground italic">
                                {c.meaning}
                              </p>
                            ))}
                          <div className="flex flex-wrap gap-1">
                            {entry.collocations
                              .filter((c) => c.phrase)
                              .map((c, i) => (
                                <Badge
                                  key={i}
                                  variant="secondary"
                                  className="text-[10px]"
                                >
                                  {c.phrase}
                                  {c.meaning && ` ${c.meaning}`}
                                  {c.source && ` (${c.source})`}
                                </Badge>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* 파생어 */}
                      {entry.derivatives.length > 0 && (
                        <div className="text-xs">
                          <span className="font-medium text-muted-foreground">파생어:</span>{" "}
                          {entry.derivatives.map((d, i) => (
                            <span key={i}>
                              {i > 0 && ", "}
                              <span className="font-medium">{d.word}</span>
                              {d.pos && (
                                <span className="text-primary"> {d.pos}</span>
                              )}
                              {d.meaning && (
                                <span className="text-muted-foreground"> {d.meaning}</span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* 어원 */}
                      {entry.etymologyNote && (
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">어원:</span> {entry.etymologyNote}
                        </div>
                      )}
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
