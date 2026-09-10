const frostings: Record<string, string> = {
  Vanilla: "#fffaf3",
  Blush: "#eab7ad",
  Sage: "#b9c7b8",
  Chocolate: "#6f4a3b",
  Lemon: "#f4dfa2",
};

export function CakeVisual({
  frosting = "Vanilla",
  tiers = 1,
  message = "make a wish",
  decoration = "Berries",
}: {
  frosting?: string;
  tiers?: number;
  message?: string;
  decoration?: string;
}) {
  const color = frostings[frosting] ?? frostings.Vanilla;
  return (
    <div className="cakeScene" aria-label={`Preview of a ${tiers}-tier ${frosting.toLowerCase()} cake`}>
      <div className="cakeDecor" aria-hidden="true">
        {decoration === "Berries" && <><i>●</i><i>●</i><i>●</i></>}
        {decoration === "Flowers" && <><i>✿</i><i>✿</i><i>✿</i></>}
        {decoration === "Gold" && <><i>✦</i><i>✧</i><i>✦</i></>}
      </div>
      {tiers >= 2 && <div className="cakeTier cakeTierTop" style={{ background: color }} />}
      <div className="cakeTier cakeTierMain" style={{ background: color }}>
        <span>{message || "your message"}</span>
      </div>
      <div className="cakePlate" />
    </div>
  );
}
