import type { Card as CardType } from "@/types/database";

export function GeneralCardView({
  card,
  isFlipped,
}: {
  card: CardType;
  isFlipped: boolean;
}) {
  return (
    <div className="text-center">
      {!isFlipped ? (
        <p className="text-xl font-medium">{card.front_text}</p>
      ) : (
        <p className="text-lg">{card.back_text}</p>
      )}
    </div>
  );
}
