"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import type { ShareMode } from "@/types/database";

interface ShareDialogProps {
  deckId: string;
  currentMode: ShareMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

interface SharedUser {
  id: string;
  display_name: string;
}

interface SearchResult {
  id: string;
  display_name: string;
}

export function ShareDialog({
  deckId,
  currentMode,
  open,
  onOpenChange,
  onSaved,
}: ShareDialogProps) {
  const [mode, setMode] = useState<ShareMode>(currentMode);
  const [saving, setSaving] = useState(false);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setMode(currentMode);
  }, [currentMode]);

  // 공유 대상 목록 조회
  useEffect(() => {
    if (open && currentMode === "private") {
      fetch(`/api/decks/${deckId}/share/users`)
        .then((r) => r.json())
        .then((d) => setSharedUsers(d.users ?? []))
        .catch(() => {});
    }
  }, [open, deckId, currentMode]);

  // 사용자 검색 (debounce)
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        // 이미 공유된 사용자 제외
        const sharedIds = new Set(sharedUsers.map((u) => u.id));
        setSearchResults(
          (data.users ?? []).filter((u: SearchResult) => !sharedIds.has(u.id))
        );
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, sharedUsers]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/decks/${deckId}/share`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ share_mode: mode }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success("공유 설정이 저장되었습니다.");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [deckId, mode, onSaved, onOpenChange]);

  async function addUser(user: SearchResult) {
    try {
      const res = await fetch(`/api/decks/${deckId}/share/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      setSharedUsers((prev) => [...prev, { id: user.id, display_name: user.display_name }]);
      setSearchQuery("");
      setSearchResults([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "사용자 추가에 실패했습니다.");
    }
  }

  async function removeUser(userId: string) {
    try {
      await fetch(`/api/decks/${deckId}/share/users?userId=${userId}`, {
        method: "DELETE",
      });
      setSharedUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      toast.error("사용자 제거에 실패했습니다.");
    }
  }

  const modes: { value: ShareMode; label: string; description: string }[] = [
    { value: "none", label: "공유 안 함", description: "나만 볼 수 있어요" },
    { value: "public", label: "전체 공유", description: "모든 사용자가 검색 가능" },
    { value: "private", label: "특정 사용자", description: "지정한 사용자에게만 공유" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>공유 설정</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {modes.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={`flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
                mode === m.value
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
            >
              <div
                className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${
                  mode === m.value
                    ? "border-primary bg-primary"
                    : "border-muted-foreground"
                }`}
              />
              <div>
                <p className="text-sm font-medium">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* 특정 사용자 모드: 사용자 검색/목록 */}
        {mode === "private" && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="사용자 검색…"
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* 검색 결과 */}
            {searchResults.length > 0 && (
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border p-2">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => addUser(user)}
                    className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-accent/50"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs">
                      {user.display_name[0]}
                    </div>
                    {user.display_name}
                  </button>
                ))}
              </div>
            )}

            {/* 공유 대상 목록 */}
            <p className="text-xs text-muted-foreground">
              공유 대상 ({sharedUsers.length}/20)
            </p>
            {sharedUsers.length > 0 && (
              <div className="space-y-1">
                {sharedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded-lg border p-2"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs">
                        {user.display_name[0]}
                      </div>
                      {user.display_name}
                    </div>
                    <button
                      onClick={() => removeUser(user.id)}
                      className="rounded-md p-1 hover:bg-destructive/10"
                      aria-label={`${user.display_name} 공유 해제`}
                    >
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-12 w-full rounded-xl"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          저장
        </Button>
      </DialogContent>
    </Dialog>
  );
}
