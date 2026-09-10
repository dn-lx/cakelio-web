import Link from "next/link";
import { BrandMark } from "./BrandMark";

export function Nav() {
  return (
    <header className="topbar">
      <div className="shell navInner">
        <BrandMark />
        <nav className="navLinks" aria-label="Main navigation">
          <Link href="/studio">Cake Studio</Link>
          <Link href="/bakers">Find bakers</Link>
          <Link href="/for-bakers">For bakers</Link>
        </nav>
        <div className="navActions">
          <Link className="button buttonGhost" href="/auth">Sign in</Link>
          <Link className="button buttonPrimary navCreate" href="/studio">Create a cake</Link>
        </div>
      </div>
    </header>
  );
}
