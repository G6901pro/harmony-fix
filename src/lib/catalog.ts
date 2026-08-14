import { PRODUCT_IMAGES } from "@/lib/product-images";


export const CATEGORIES = [
  "Ride-on Cars",
  "Electric Cars",
  "RC Cars",
  "Educational Toys",
  "Premium Gifts",
  "Gadgets",
] as const;

export const BRANDS = [
  "Velocita Signature",
  "Aurum Motors",
  "Carbon Apex",
  "Atelier Nord",
  "Skyline Labs",
  "Heirloom & Co.",
] as const;

export const AGE_GROUPS = ["0–3", "3–6", "6–10", "10–16", "16+"] as const;

export const COLORS = [
  { name: "Matte Black", token: "oklch(0.2 0.002 264)" },
  { name: "Gold", token: "oklch(0.82 0.12 88)" },
  { name: "Pearl White", token: "oklch(0.96 0 0)" },
  { name: "Graphite", token: "oklch(0.45 0.005 264)" },
  { name: "Electric Blue", token: "oklch(0.72 0.19 245)" },
  { name: "Racing Red", token: "oklch(0.58 0.2 27)" },
];

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  brand: string;
  category: string;
  sku: string;
  ageGroup: string;
  color: string;
  price: number;
  compareAt?: number;
  rating: number;
  reviews: number;
  stock: number;
  images: string[];
  isNew: boolean;
  isBestSeller: boolean;
  isFeatured: boolean;
  createdAt: string;
  popularity: number;
  specs: { label: string; value: string }[];
  features: string[];
  boxContents: string[];
  warranty: string;
  safety: string;
  /** Size options, only present for products where sizing applies. */
  sizes?: string[];
  /** Selectable finish options shown as swatches. */
  colorOptions: string[];
  /** Reviews belonging to this product only. */
  reviewsList: {
    id: string;
    productSlug: string;
    name: string;
    rating: number;
    date: string;
    title: string;
    text: string;
    verified: boolean;
    images: string[];
  }[];
};



type Seed = {
  name: string;
  category: (typeof CATEGORIES)[number];
  brand: (typeof BRANDS)[number];
  price: number;
  compareAt?: number;
  age: (typeof AGE_GROUPS)[number];
  color: string;
  rating: number;
  reviews: number;
  stock: number;
  isNew?: boolean;
  isBestSeller?: boolean;
  isFeatured?: boolean;
  blurb: string;
};

const SEEDS: Seed[] = [
  { name: "Aurum GT Ride-On", category: "Ride-on Cars", brand: "Aurum Motors", price: 1299, compareAt: 1590, age: "3–6", color: "Matte Black", rating: 5, reviews: 412, stock: 12, isBestSeller: true, isFeatured: true, blurb: "Hand-finished ride-on with leather seat, 24V drive and gold-anodised trim." },
  { name: "Carbon Apex RC", category: "RC Cars", brand: "Carbon Apex", price: 749, age: "10–16", color: "Graphite", rating: 5, reviews: 286, stock: 9, isBestSeller: true, blurb: "Carbon-fibre chassis, 70 km/h brushless drivetrain and telemetry controller." },
  { name: "Atelier Block Set", category: "Educational Toys", brand: "Atelier Nord", price: 389, age: "3–6", color: "Pearl White", rating: 4, reviews: 173, stock: 34, blurb: "192 beechwood blocks, felt-lined case and architect-grade tolerances." },
  { name: "The Vault Gift Case", category: "Premium Gifts", brand: "Velocita Signature", price: 899, compareAt: 1050, age: "6–10", color: "Gold", rating: 5, reviews: 121, stock: 6, isFeatured: true, blurb: "A curated four-piece gift case, numbered and delivered in lacquered wood." },
  { name: "Alpine Explorer 4×4", category: "Electric Cars", brand: "Aurum Motors", price: 1490, age: "3–6", color: "Pearl White", rating: 5, reviews: 64, stock: 4, isNew: true, isFeatured: true, blurb: "Twin-motor electric 4×4 with real suspension and parent remote override." },
  { name: "Skyline Cadet Drone", category: "Gadgets", brand: "Skyline Labs", price: 659, age: "10–16", color: "Matte Black", rating: 4, reviews: 38, stock: 18, isNew: true, blurb: "4K gimbal camera, 28-minute flight time and geo-fenced beginner mode." },
  { name: "Nova Robotics Kit", category: "Educational Toys", brand: "Atelier Nord", price: 529, age: "10–16", color: "Electric Blue", rating: 5, reviews: 52, stock: 21, isNew: true, blurb: "Modular robotics platform with 40 guided builds and a visual code studio." },
  { name: "Heirloom Rocking Horse", category: "Premium Gifts", brand: "Heirloom & Co.", price: 1180, age: "0–3", color: "Graphite", rating: 5, reviews: 29, stock: 3, isNew: true, blurb: "Solid ash, saddle-stitched leather and a brass plate engraved to order." },
  { name: "Velocita Roadster Junior", category: "Ride-on Cars", brand: "Velocita Signature", price: 1690, compareAt: 1990, age: "3–6", color: "Racing Red", rating: 5, reviews: 208, stock: 7, isBestSeller: true, blurb: "A scaled roadster with soft-start throttle, real horn and gullwing doors." },
  { name: "Monaco Drift Pro", category: "RC Cars", brand: "Carbon Apex", price: 899, compareAt: 999, age: "10–16", color: "Gold", rating: 5, reviews: 141, stock: 15, isBestSeller: true, blurb: "Rear-drive drift platform with gyro assist and interchangeable body shells." },
  { name: "Lumen Constellation Set", category: "Educational Toys", brand: "Atelier Nord", price: 279, age: "6–10", color: "Electric Blue", rating: 4, reviews: 96, stock: 40, blurb: "Fibre-optic star projector and 60-card astronomy programme." },
  { name: "Obsidian Chess Atelier", category: "Premium Gifts", brand: "Heirloom & Co.", price: 1450, age: "16+", color: "Matte Black", rating: 5, reviews: 44, stock: 2, isFeatured: true, blurb: "Hand-weighted obsidian and brass chess set on a lacquered board." },
  { name: "Grand Tourer 12V", category: "Electric Cars", brand: "Aurum Motors", price: 990, compareAt: 1250, age: "3–6", color: "Pearl White", rating: 4, reviews: 187, stock: 26, blurb: "A softly sprung 12V tourer with leather-wrapped wheel and LED signature." },
  { name: "Circuit Tycoon Track", category: "RC Cars", brand: "Carbon Apex", price: 640, age: "6–10", color: "Racing Red", rating: 4, reviews: 78, stock: 22, blurb: "Magnetic modular circuit, 6.4 m of track and two liveried cars." },
  { name: "Vault Explorer Telescope", category: "Gadgets", brand: "Skyline Labs", price: 820, age: "10–16", color: "Graphite", rating: 5, reviews: 61, stock: 11, isFeatured: true, blurb: "80 mm apochromatic optics with app-guided sky alignment." },
  { name: "First Steps Walker", category: "Ride-on Cars", brand: "Heirloom & Co.", price: 340, age: "0–3", color: "Pearl White", rating: 5, reviews: 152, stock: 48, blurb: "Beech push-walker with wool-felt padding and whisper-quiet wheels." },
  { name: "Aurora Night Cruiser", category: "Electric Cars", brand: "Velocita Signature", price: 2190, compareAt: 2490, age: "6–10", color: "Matte Black", rating: 5, reviews: 33, stock: 2, isNew: true, isFeatured: true, blurb: "Our flagship two-seat cruiser: 36V drive, ambient lighting, real dampers." },
  { name: "Micro Rally Squad", category: "RC Cars", brand: "Carbon Apex", price: 289, compareAt: 349, age: "6–10", color: "Electric Blue", rating: 4, reviews: 214, stock: 60, blurb: "Set of three palm-sized rally cars with proportional steering." },
  { name: "Maestro Piano Bench", category: "Educational Toys", brand: "Atelier Nord", price: 720, age: "3–6", color: "Gold", rating: 5, reviews: 47, stock: 8, blurb: "A 37-key felt-hammer instrument tuned to concert pitch." },
  { name: "Voyager Globe Lamp", category: "Premium Gifts", brand: "Heirloom & Co.", price: 460, age: "6–10", color: "Gold", rating: 4, reviews: 88, stock: 19, blurb: "Hand-painted relief globe that lights to reveal constellations." },
  { name: "Turbo Kart Elite", category: "Ride-on Cars", brand: "Aurum Motors", price: 1780, age: "10–16", color: "Racing Red", rating: 5, reviews: 71, stock: 5, isBestSeller: true, blurb: "Pedal-and-power hybrid kart with disc brakes and racing harness." },
  { name: "Helio Solar Lab", category: "Educational Toys", brand: "Skyline Labs", price: 310, age: "10–16", color: "Graphite", rating: 4, reviews: 103, stock: 30, blurb: "Fourteen solar experiments in a machined aluminium case." },
  { name: "Cortex Coding Cube", category: "Gadgets", brand: "Skyline Labs", price: 545, compareAt: 640, age: "6–10", color: "Matte Black", rating: 4, reviews: 129, stock: 25, blurb: "Tactile coding cube that teaches loops and logic without a screen." },
  { name: "Silk Road Puppet Theatre", category: "Premium Gifts", brand: "Atelier Nord", price: 980, age: "3–6", color: "Racing Red", rating: 5, reviews: 26, stock: 4, blurb: "Walnut proscenium theatre with silk curtains and six marionettes." },
  { name: "Vanguard Trail Buggy", category: "Electric Cars", brand: "Velocita Signature", price: 1350, age: "6–10", color: "Electric Blue", rating: 4, reviews: 58, stock: 13, blurb: "All-terrain buggy with independent suspension and roll cage." },
  { name: "Chrono Watchmaker Kit", category: "Educational Toys", brand: "Heirloom & Co.", price: 690, age: "16+", color: "Gold", rating: 5, reviews: 37, stock: 9, isFeatured: true, blurb: "Assemble a genuine mechanical movement with jeweller's tools included." },
  { name: "Falcon FPV Racer", category: "Gadgets", brand: "Skyline Labs", price: 1120, compareAt: 1290, age: "16+", color: "Graphite", rating: 5, reviews: 42, stock: 6, isNew: true, blurb: "Sub-250 g FPV racer with goggles, spare props and travel case." },
  { name: "Little Atelier Kitchen", category: "Educational Toys", brand: "Atelier Nord", price: 850, age: "3–6", color: "Pearl White", rating: 5, reviews: 164, stock: 16, isBestSeller: true, blurb: "Marble-topped play kitchen with brass fittings and soft-close drawers." },
  { name: "Sovereign Train Set", category: "Premium Gifts", brand: "Heirloom & Co.", price: 1620, compareAt: 1850, age: "6–10", color: "Matte Black", rating: 5, reviews: 51, stock: 3, blurb: "Die-cast locomotive, 9 m of brass rail and a hand-built station." },
  { name: "Cadet Quad 6V", category: "Ride-on Cars", brand: "Aurum Motors", price: 560, age: "0–3", color: "Electric Blue", rating: 4, reviews: 199, stock: 44, blurb: "A gentle 6V quad for first drivers, with 4 km/h limiter." },
  { name: "Zenith Scale Ferrari Tribute", category: "RC Cars", brand: "Carbon Apex", price: 1290, age: "16+", color: "Racing Red", rating: 5, reviews: 24, stock: 2, isNew: true, blurb: "1:8 scale collector RC with licensed bodywork and display plinth." },
  { name: "Nimbus Balance Bike", category: "Ride-on Cars", brand: "Velocita Signature", price: 420, compareAt: 495, age: "0–3", color: "Gold", rating: 5, reviews: 233, stock: 52, isBestSeller: true, blurb: "Magnesium frame balance bike weighing under 2.6 kg." },
];

const DESCRIPTION_TAIL =
  "Every Velocita Vault piece is inspected individually, numbered, and delivered in signature packaging.";

const SIZED_CATEGORIES: string[] = ["Ride-on Cars", "Electric Cars"];

function buildColorOptions(primary: string, index: number) {
  const others = COLORS.map((color) => color.name).filter((name) => name !== primary);
  return [primary, others[index % others.length], others[(index + 2) % others.length]];
}



const REVIEW_TEMPLATES = [
  { name: "Aisha Rahman", rating: 5, date: "12 June 2026", title: "Arrived like furniture, not a toy", text: "The finish is unreal — the packaging alone felt like a watch box. It hasn't been put down since the day it landed.", verified: true },
  { name: "Daniel Okafor", rating: 5, date: "2 June 2026", title: "Collector-grade detail", text: "I've bought from every premium label out there. Velocita Vault is the only one that documents and serialises like a watch house.", verified: true },
  { name: "Marta Alves", rating: 4, date: "28 May 2026", title: "Perfect gift, slightly long assembly", text: "Delivered next day in a black-and-gold case. Assembly took a little longer than stated but the result is stunning.", verified: true },
  { name: "Yusuf Karim", rating: 5, date: "19 May 2026", title: "Worth every taka", text: "Concierge answered within minutes and arranged engraving before dispatch. Faultless experience end to end.", verified: true },
  { name: "Elena Petrova", rating: 3, date: "3 May 2026", title: "Beautiful but heavier than expected", text: "Quality is superb, though it is heavier than expected — worth knowing before you buy for a smaller child.", verified: false },
  { name: "Tanvir Hossain", rating: 5, date: "21 April 2026", title: "Exactly as photographed", text: "No surprises: the piece matches the studio images precisely, right down to the finish and the stitching.", verified: true },
];

function buildReviews(seed: Seed, slug: string, index: number, image: string) {
  const count = 3 + (index % 3);
  return Array.from({ length: count }, (_, i) => {
    const template = REVIEW_TEMPLATES[(index + i) % REVIEW_TEMPLATES.length];
    return {
      id: `${slug}-r${i + 1}`,
      productSlug: slug,
      name: template.name,
      rating: template.rating,
      date: template.date,
      title: template.title,
      text: `${seed.name}: ${template.text}`,
      verified: template.verified,
      // Review photos only ever show this product.
      images: i === 0 ? [image] : [],
    };
  });
}

function makeProduct(seed: Seed, index: number): CatalogProduct {
  const slug = seed.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const image = PRODUCT_IMAGES[slug];
  if (!image) {
    throw new Error(`Missing dedicated product image for "${slug}"`);
  }
  // Each product owns exactly its own imagery — never another product's assets.
  const images = [image];
  const created = new Date(2026, 6, 20 - index).toISOString();

  return {
    id: `vv-${String(index + 1).padStart(3, "0")}`,
    slug,
    name: seed.name,
    shortDescription: seed.blurb,
    brand: seed.brand,
    category: seed.category,
    sku: `VV-${seed.category.slice(0, 2).toUpperCase()}-${String(1000 + index * 7)}`,
    ageGroup: seed.age,
    color: seed.color,
    price: seed.price,
    compareAt: seed.compareAt,
    rating: seed.rating,
    reviews: seed.reviews,
    stock: seed.stock,
    images,
    isNew: Boolean(seed.isNew),
    isBestSeller: Boolean(seed.isBestSeller),
    isFeatured: Boolean(seed.isFeatured),
    createdAt: created,
    popularity: seed.reviews * seed.rating,
    specs: [
      { label: "Brand", value: seed.brand },
      { label: "Category", value: seed.category },
      { label: "SKU", value: `VV-${seed.category.slice(0, 2).toUpperCase()}-${String(1000 + index * 7)}` },
      { label: "Recommended age", value: `${seed.age} years` },
      { label: "Primary finish", value: seed.color },
      { label: "Materials", value: "Aerospace alloy, full-grain leather, beechwood" },
      { label: "Assembly", value: "95% pre-assembled, tools included" },
      { label: "Certification", value: "EN 71, ASTM F963, CE" },
      { label: "Shipping weight", value: `${(seed.price / 100).toFixed(1)} kg` },
    ],
    features: [
      `${seed.name} is hand-finished with a seven-stage lacquer process`,
      "Serialised authenticity card signed by the atelier",
      "Child-safe soft-start electronics and rounded edges",
      "Replaceable parts programme for the lifetime of the product",
    ],
    boxContents: [
      `1 × ${seed.name}`,
      "Signature lacquered presentation case",
      "Authenticity and warranty booklet",
      "Care kit with microfibre cloth and polish",
    ],
    warranty: "24-month international warranty with concierge support.",
    safety:
      "Not suitable for children under 36 months where small parts are indicated. Adult supervision recommended during first use and charging.",
    sizes: SIZED_CATEGORIES.includes(seed.category)
      ? ["Small · 2–4 yrs", "Medium · 4–6 yrs", "Large · 6+ yrs"]
      : undefined,
    colorOptions: buildColorOptions(seed.color, index),
    reviewsList: buildReviews(seed, slug, index, image),
  };
}



export const products: CatalogProduct[] = SEEDS.map(makeProduct);

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}

export function getProductById(id: string) {
  return products.find((product) => product.id === id);
}

export function getProductByName(name: string) {
  return products.find(
    (product) => product.name.toLowerCase() === name.trim().toLowerCase(),
  );
}

export function colorToken(name: string) {
  return COLORS.find((color) => color.name === name)?.token ?? "oklch(0.5 0 0)";
}

export function getRelatedProducts(product: CatalogProduct, limit = 8) {
  const sameCategory = products.filter(
    (item) => item.id !== product.id && item.category === product.category,
  );
  const fallback = products.filter(
    (item) => item.id !== product.id && item.category !== product.category,
  );
  return [...sameCategory, ...fallback].slice(0, limit);
}


export function discountPercent(product: CatalogProduct) {
  if (!product.compareAt) return 0;
  return Math.round(((product.compareAt - product.price) / product.compareAt) * 100);
}

/**
 * Derive the price slider range from a live product list.
 * Never hardcode bounds — the storefront and admin both call this with the
 * current active catalogue so the slider always matches reality.
 */
export function computePriceBounds(list: { price: number }[]): [number, number] {
  const prices = list
    .map((item) => Number(item.price))
    .filter((value) => Number.isFinite(value));
  if (!prices.length) return [0, 0];
  const min = Math.floor(Math.min(...prices));
  const max = Math.ceil(Math.max(...prices));
  return min === max ? [min, max] : [min, max];
}

// Bangladeshi Taka (BDT) — the only currency used across the site.
const bdtNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export const currency = {
  format: (value: number) => `৳${bdtNumber.format(value)}`,
};

export type ProductReview = CatalogProduct["reviewsList"][number];

