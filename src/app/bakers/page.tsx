import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";

const bakers = [
  { name: "Mila Cake Atelier", city: "Frankfurt-Sachsenhausen", rating: "4.9", reviews: 48, price: "€58", styles: ["Buttercream", "Floral", "Wedding"], initials: "MC" },
  { name: "Studio Zucker", city: "Offenbach", rating: "4.8", reviews: 31, price: "€65", styles: ["Fondant", "Sculpted", "Birthday"], initials: "SZ" },
  { name: "Little Whisk", city: "Frankfurt-Bornheim", rating: "5.0", reviews: 26, price: "€52", styles: ["Vegan", "Minimal", "Celebration"], initials: "LW" },
  { name: "Crumb & Bloom", city: "Frankfurt-Westend", rating: "4.9", reviews: 19, price: "€70", styles: ["Wedding", "Modern", "Flowers"], initials: "CB" },
  { name: "Nora Bakes", city: "Neu-Isenburg", rating: "4.7", reviews: 42, price: "€49", styles: ["Birthday", "Kids", "Photo cake"], initials: "NB" },
  { name: "Butter & Petal", city: "Bad Vilbel", rating: "5.0", reviews: 16, price: "€72", styles: ["Premium", "Floral", "Ganache"], initials: "BP" },
];

export default function BakersPage() {
  return <main><Nav /><section className="listingHero shell"><span className="eyebrow">CAKELIO MARKET</span><h1>Find a baker who fits your cake.</h1><p>Prototype listings for the first Cakelio marketplace experience. Matching will later use real capabilities, dates and delivery areas.</p><div className="searchBar"><span>⌕</span><input aria-label="Search location" defaultValue="Frankfurt am Main"/><button>Search</button></div></section><section className="listingArea shell"><div className="filterRow"><button>Available date</button><button>Cake style</button><button>Dietary</button><button>Price</button><span>6 example bakers</span></div><div className="listingGrid">{bakers.map((baker, i)=><article className="listingCard" key={baker.name}><div className={`listingPhoto bakerPhoto${(i%3)+1}`}><span>{baker.initials}</span><button aria-label="Save baker">♡</button></div><div className="listingBody"><div className="listingTitle"><div><h2>{baker.name}</h2><p>{baker.city}</p></div><strong>★ {baker.rating}</strong></div><div className="tagRow">{baker.styles.map(style=><span key={style}>{style}</span>)}</div><div className="listingFooter"><span>From <b>{baker.price}</b></span><Link href="/studio">Design & request →</Link></div></div></article>)}</div></section><Footer /></main>;
}
