import Link from "next/link";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brandMark" aria-label="Cakelio home">
      <span className="brandIcon" aria-hidden="true">
        <span className="brandCake" />
      </span>
      {!compact && <span className="brandWord">cakelio</span>}
    </Link>
  );
}
