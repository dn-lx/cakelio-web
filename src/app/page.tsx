import Link from "next/link";
import { CakeVisual } from "@/components/CakeVisual";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";

const steps = [
  ["01", "Create", "Choose size, flavour, finish, colours, decorations and the details that make the cake yours."],
  ["02", "Match", "See bakers whose real capabilities, availability and service area match your request."],
  ["03", "Connect", "Keep the design, quote, questions and files together in one conversation."],
  ["04", "Celebrate", "Accept an offer, confirm the order and follow every step through collection or delivery."],
];

const bakers = [
  ["Mila Cake Atelier", "Frankfurt · 4.9", "Buttercream · Wedding · Floral", "From €58"],
  ["Studio Zucker", "Offenbach · 4.8", "Fondant · Birthday · Sculpted", "From €65"],
  ["Little Whisk", "Frankfurt · 5.0", "Vegan · Minimal · Celebration", "From €52"],
];

export default function Home() {
  return (
    <main>
      <Nav />
      <section className="hero shell">
        <div className="heroCopy">
          <span className="eyebrow"><i /> CUSTOM CAKES, WITHOUT THE CHAOS</span>
          <h1>Imagine it.<br />Shape it.<br /><em>Make it real.</em></h1>
          <p className="heroLead">Cakelio turns your cake idea into a clear design, then helps you find a baker who can actually make it.</p>
          <div className="heroActions">
            <Link className="button buttonPrimary buttonLarge" href="/studio">Start designing</Link>
            <Link className="button buttonSoft buttonLarge" href="/bakers">Explore bakers</Link>
          </div>
          <div className="trustRow"><span>Free to design</span><span>Local makers</span><span>Structured requests</span></div>
        </div>
        <div className="heroStudio">
          <div className="floatingLabel floatingOne">20 cm · 12–16 servings</div>
          <div className="floatingLabel floatingTwo">Chocolate + strawberry</div>
          <div className="studioPreviewCard">
            <div className="cardTopline"><span>Cakelio Studio</span><small>Live preview</small></div>
            <CakeVisual frosting="Blush" decoration="Flowers" message="happy birthday" />
            <div className="previewSpecs"><span>Round</span><span>20 cm</span><span>2 layers</span><span>Buttercream</span></div>
            <div className="estimateRow"><div><small>Estimated range</small><strong>€68–€84</strong></div><Link href="/studio">Edit design →</Link></div>
          </div>
        </div>
      </section>

      <section className="statementBand">
        <div className="shell statementInner"><span>From “how much for this?”</span><strong>to a request a baker can price.</strong></div>
      </section>

      <section className="section shell" id="how-it-works">
        <div className="sectionHeading"><div><span className="eyebrow">A BETTER ORDER FLOW</span><h2>One idea. Four simple steps.</h2></div><p>No more repeating the same requirements across DMs, screenshots and voice notes.</p></div>
        <div className="stepGrid">{steps.map(([number, title, text]) => <article className="stepCard" key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
      </section>

      <section className="section shell discoverySection">
        <div className="sectionHeading"><div><span className="eyebrow">DISCOVER LOCAL TALENT</span><h2>The right baker for your cake.</h2></div><Link className="textLink" href="/bakers">Browse all bakers →</Link></div>
        <div className="bakerGrid">{bakers.map(([name, meta, tags, price], index) => <article className="bakerCard" key={name}><div className={`bakerPhoto bakerPhoto${index + 1}`}><span>{name.split(" ")[0][0]}{name.split(" ")[1]?.[0]}</span></div><div className="bakerInfo"><div><h3>{name}</h3><p>{meta}</p></div><p className="bakerTags">{tags}</p><strong>{price}</strong></div></article>)}</div>
      </section>

      <section className="proBand">
        <div className="shell proGrid">
          <div><span className="eyebrow eyebrowLight">CAKELIO PRO</span><h2>Built for cake makers,<br />not just cake buyers.</h2><p>Turn Instagram visitors and repeat customers into structured requests. Set what you make, where you deliver, your lead times and starting prices.</p><Link className="button buttonCream buttonLarge" href="/for-bakers">See Cakelio for bakers</Link></div>
          <div className="dashboardMock"><div className="dashHeader"><span>Today</span><small>Thursday</small></div><div className="dashMetrics"><div><small>New requests</small><strong>6</strong><em>+2 today</em></div><div><small>Quotes waiting</small><strong>3</strong><em>Needs reply</em></div><div><small>Orders this week</small><strong>11</strong><em>4 deliveries</em></div></div><div className="requestMini"><span className="avatarMini">EM</span><div><strong>Emma’s 30th</strong><small>24 cm · Chocolate · 18 Oct</small></div><b>New</b></div></div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
