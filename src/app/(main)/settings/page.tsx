"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Bot, Bell, Moon, Database, LogOut, ChevronRight } from "lucide-react";

const settingsItems = [
  { href: "/settings", icon: User, label: "프로필", description: "닉네임, 학년" },
  { href: "/settings/ai", icon: Bot, label: "AI 설정", description: "API키, 프로바이더" },
];

export default function SettingsPage() {
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);
  const profile = useAuthStore((s) => s.profile);

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <div className="space-y-5 p-5">
      <h1 className="text-2xl font-bold tracking-tight">설정</h1>

      {/* 프로필 요약 */}
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            {profile?.display_name?.[0] ?? "?"}
          </div>
          <div>
            <p className="font-medium">{profile?.display_name ?? "사용자"}</p>
            <p className="text-xs text-muted-foreground">
              Lv.{profile?.level ?? 1} · {profile?.xp ?? 0} XP
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 메뉴 항목 */}
      <Card>
        <CardContent className="divide-y p-0">
          <Link
            href="/settings/ai"
            className="flex items-center justify-between p-4 transition-colors hover:bg-accent/50"
          >
            <div className="flex items-center gap-3">
              <Bot className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">AI 설정</p>
                <p className="text-xs text-muted-foreground">API키, 프로바이더</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="w-full text-destructive"
        onClick={handleSignOut}
      >
        <LogOut className="mr-2 h-4 w-4" />
        로그아웃
      </Button>
    </div>
  );
}
