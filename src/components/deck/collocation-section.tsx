import { Badge } from "@/components/ui/badge";
import type { VocabCollocation } from "@/types/database";

interface CollocationSectionProps {
  collocations: VocabCollocation[];
}

export function CollocationSection({ collocations }: CollocationSectionProps) {
  if (!collocations || collocations.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">Collocation</p>
      <ul className="space-y-1">
        {collocations.map((c, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span className="font-medium">{c.phrase}</span>
            {c.meaning && (
              <span className="text-muted-foreground">{c.meaning}</span>
            )}
            {c.source && (
              <Badge variant="outline" className="text-[10px]">
                {c.source}
              </Badge>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
