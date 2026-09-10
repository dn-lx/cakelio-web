import Link from "next/link";
import { BrandMark } from "./BrandMark";

export function Footer() {
  return (
    <footer className="footer">
      <div className="shell footerGrid">
        <div>
          <BrandMark />
          <p>Design it. Find a baker. Make it real.</p>
        </div>
        <div className="footerLinks">
          <Link href="/studio">Cake Studio</Link>
          <Link href="/bakers">Find bakers</Link>
          <Link href="/for-bakers">Cakelio Pro</Link>
        </div>
        <small>© 2026 Cakelio. Building the easier way to order custom cakes.</small>
      </div>
    </footer>
  );
}
