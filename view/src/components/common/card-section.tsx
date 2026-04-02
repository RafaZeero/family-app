import type { CardSectionType } from "@/types/card-section";
import { Link } from "@tanstack/react-router";

type CardSectionProps = CardSectionType;

export const CardSection = ({
  title,
  description,
  icon,
  to,
  available,
}: CardSectionProps) => {
  const Icon = icon;
  const card = (
    <div
      className={[
        "flex flex-col items-center justify-center gap-3 rounded-xl border p-6 text-center transition-colors",
        available
          ? "cursor-pointer hover:bg-muted"
          : "cursor-default opacity-40",
      ].join(" ")}
    >
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
        <Icon className="size-8 text-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );

  return available ? (
    <Link key={title} to={to} className="block">
      {card}
    </Link>
  ) : (
    <div key={title}>{card}</div>
  );
};
