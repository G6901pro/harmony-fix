import p1 from "@/assets/p1.jpg";
import p2 from "@/assets/p2.jpg";
import p3 from "@/assets/p3.jpg";
import p4 from "@/assets/p4.jpg";
import p5 from "@/assets/p5.jpg";
import p6 from "@/assets/p6.jpg";
import p7 from "@/assets/p7.jpg";
import p8 from "@/assets/p8.jpg";

export const BRAND = {
  name: "Velocita Vault",
  tagline: "Behind products, Building family",
  email: "support.velocitavault@gmail.com",
  /** Voice support line. */
  phone: "01921586866",
  /** WhatsApp support line (display format). */
  whatsappDisplay: "01611063395",
  /** WhatsApp support line in international format for wa.me links. */
  whatsapp: "8801611063395",
  address: "Notre Dame College opposite side, cute goli, Motijeel, Dhaka, Bangladesh",
} as const;


export const SOCIAL_LINKS = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/share/1E86zD61Gw/?mibextid=wwXIfr",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/velocitavault?igsh=MXBkdGx4djFkd2cxdA%3D%3D&utm_source=qr",
  },
  { label: "YouTube", href: "https://www.youtube.com/@VelocitaVault-y1l" },
  { label: "TikTok", href: "https://www.tiktok.com/@velocita.vault" },
] as const;

/** Merchant payment destinations shown at checkout. */
export const PAYMENT_ACCOUNTS = {
  bkash: "01921586866",
  bank: "1011010078931",
} as const;

/** Payment methods offered at checkout — ids are stable for future gateway wiring. */

export const PAYMENT_METHODS = [
  {
    id: "bkash",
    label: "bKash",
    note: "Mobile Wallet",
    accent: "#E2136E",
    enabled: true,
  },
  {
    id: "dbbl",
    label: "Dutch-Bangla Bank",
    note: "Rocket / Card",
    accent: "#0A4C9A",
    enabled: true,
  },
  {
    id: "cod",
    label: "Cash on Delivery",
    note: "Pay on arrival",
    accent: "#C9A227",
    enabled: true,
  },
] as const;


export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  compareAt?: number;
  rating: number;
  reviews: number;
  image: string;
  badge?: string;
};

export const bestSellers: Product[] = [
  {
    id: "vv-ride-01",
    name: "Aurum GT Ride-On",
    category: "Ride-on Cars",
    price: 1299,
    compareAt: 1590,
    rating: 5,
    reviews: 412,
    image: p1,
    badge: "Signature",
  },
  {
    id: "vv-rc-01",
    name: "Carbon Apex RC",
    category: "RC Cars",
    price: 749,
    rating: 5,
    reviews: 286,
    image: p2,
    badge: "Best Seller",
  },
  {
    id: "vv-edu-01",
    name: "Atelier Block Set",
    category: "Educational Toys",
    price: 389,
    rating: 4,
    reviews: 173,
    image: p3,
  },
  {
    id: "vv-gift-01",
    name: "The Vault Gift Case",
    category: "Premium Gifts",
    price: 899,
    compareAt: 1050,
    rating: 5,
    reviews: 121,
    image: p4,
    badge: "Gift Ready",
  },
];

export const newArrivals: Product[] = [
  {
    id: "vv-ride-02",
    name: "Alpine Explorer 4×4",
    category: "Electric Cars",
    price: 1490,
    rating: 5,
    reviews: 64,
    image: p5,
    badge: "New",
  },
  {
    id: "vv-air-01",
    name: "Skyline Cadet Drone",
    category: "Gadgets",
    price: 659,
    rating: 4,
    reviews: 38,
    image: p6,
    badge: "New",
  },
  {
    id: "vv-edu-02",
    name: "Nova Robotics Kit",
    category: "Educational Toys",
    price: 529,
    rating: 5,
    reviews: 52,
    image: p7,
    badge: "New",
  },
  {
    id: "vv-heir-01",
    name: "Heirloom Rocking Horse",
    category: "Premium Gifts",
    price: 1180,
    rating: 5,
    reviews: 29,
    image: p8,
    badge: "Limited",
  },
];

export const collections = [
  { name: "Ride-on Cars", count: 48, image: p1 },
  { name: "Electric Cars", count: 32, image: p5 },
  { name: "RC Cars", count: 61, image: p2 },
  { name: "Educational Toys", count: 74, image: p3 },
  { name: "Premium Gifts", count: 25, image: p4 },
];

export const ageGroups = [
  { range: "0–3", label: "First Discoveries", items: 42 },
  { range: "3–6", label: "Little Explorers", items: 68 },
  { range: "6–10", label: "Young Engineers", items: 91 },
  { range: "10–16", label: "Speed & Skill", items: 77 },
  { range: "16+", label: "Collector Grade", items: 34 },
];

export const reviews = [
  {
    name: "Aisha Rahman",
    role: "Parent of two",
    text: "The finish on the ride-on is unreal — it arrived like a piece of furniture, not a toy. My son hasn't left it since.",
    rating: 5,
  },
  {
    name: "Daniel Okafor",
    role: "Collector",
    text: "I've bought from every premium label out there. Velocita Vault is the only one that packages and documents like a watch house.",
    rating: 5,
  },
  {
    name: "Marta Alves",
    role: "Gift buyer",
    text: "Ordered as a birthday gift, delivered next day in a black-and-gold case. The recipient thought it cost three times more.",
    rating: 5,
  },
];

export const instagram = [p2, p4, p6, p1, p7, p8];
