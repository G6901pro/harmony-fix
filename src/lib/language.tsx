import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Language = "en" | "bn";

const STORAGE_KEY = "vv-language";

const DICTIONARY = {
  /* ------------------------------- nav ------------------------------- */
  "nav.shopAll": { en: "Shop All", bn: "সব পণ্য" },
  "nav.collections": { en: "Collections", bn: "কালেকশন" },
  "nav.bestSellers": { en: "Best Sellers", bn: "বেস্ট সেলার" },
  "nav.newArrivals": { en: "New Arrivals", bn: "নতুন এসেছে" },
  "nav.shopByAge": { en: "Shop by Age", bn: "বয়স অনুযায়ী" },
  "nav.ourStory": { en: "Our Story", bn: "আমাদের গল্প" },
  "action.search": { en: "Search", bn: "খুঁজুন" },
  "action.wishlist": { en: "Wishlist", bn: "উইশলিস্ট" },
  "action.account": { en: "Account", bn: "অ্যাকাউন্ট" },
  "action.cart": { en: "Cart", bn: "কার্ট" },
  "action.support": { en: "Support", bn: "সহায়তা" },
  "language.label": { en: "Language", bn: "ভাষা" },

  /* ------------------------------- hero ------------------------------ */
  "hero.eyebrow": {
    en: "Est. 2019 — Curated Luxury Toys",
    bn: "প্রতিষ্ঠা ২০১৯ — বাছাই করা বিলাসবহুল খেলনা",
  },
  "hero.titleLine1": { en: "Extraordinary toys,", bn: "অসাধারণ খেলনা," },
  "hero.titleLine2": { en: "kept in the Vault.", bn: "সংরক্ষিত ভল্টে।" },
  "hero.body": {
    en: "Hand-selected ride-ons, electric cars, RC machines and heirloom gifts — engineered to collector standards, safety-tested for the people who matter most.",
    bn: "হাতে বাছাই করা রাইড-অন, ইলেকট্রিক কার, আরসি মেশিন ও অভিজাত উপহার — কালেক্টর মানে তৈরি, প্রিয়জনদের জন্য নিরাপত্তা পরীক্ষিত।",
  },
  "hero.shopNow": { en: "Shop Now", bn: "এখনই কিনুন" },
  "hero.exploreCollection": { en: "Explore Collection", bn: "কালেকশন দেখুন" },
  "hero.stat.partners": { en: "Maison partners", bn: "ব্র্যান্ড পার্টনার" },
  "hero.stat.families": { en: "Families served", bn: "পরিবার সেবা পেয়েছে" },
  "hero.stat.rating": { en: "Verified rating", bn: "ভেরিফায়েড রেটিং" },
  "hero.scroll": { en: "Scroll to collections", bn: "কালেকশনে যান" },

  /* ------------------------------ trust ------------------------------ */
  "trust.safety": { en: "42-Point Safety Inspection", bn: "৪২ ধাপের নিরাপত্তা পরীক্ষা" },
  "trust.delivery": { en: "White-Glove Delivery", bn: "যত্নসহ হোম ডেলিভারি" },
  "trust.returns": { en: "14-Day Easy Returns", bn: "১৪ দিনে সহজ রিটার্ন" },
  "trust.cod": { en: "Cash on Delivery", bn: "ক্যাশ অন ডেলিভারি" },
  "trust.authentic": { en: "Authenticity Guaranteed", bn: "শতভাগ আসল পণ্যের নিশ্চয়তা" },
  "trust.support": { en: "Concierge Support 7 Days", bn: "সপ্তাহে ৭ দিন সাপোর্ট" },

  /* --------------------------- collections --------------------------- */
  "collections.eyebrow": { en: "Featured Collections", bn: "বিশেষ কালেকশন" },
  "collections.title1": { en: "Five houses of play,", bn: "পাঁচটি খেলার জগৎ," },
  "collections.title2": { en: "one standard of craft.", bn: "একটাই মানের কারিগরি।" },
  "collections.description": {
    en: "Every category is curated by hand — materials, motors, finishes and safety certification reviewed before a single unit enters the Vault.",
    bn: "প্রতিটি ক্যাটাগরি হাতে বাছাই করা — উপকরণ, মোটর, ফিনিশিং ও নিরাপত্তা সনদ যাচাইয়ের পরেই পণ্য ভল্টে আসে।",
  },
  "collections.viewAll": { en: "View all collections", bn: "সব কালেকশন দেখুন" },
  "collections.pieces": { en: "pieces", bn: "টি পণ্য" },

  /* -------------------------- product grids -------------------------- */
  "grid.bestSellers.eyebrow": { en: "Best Sellers", bn: "বেস্ট সেলার" },
  "grid.bestSellers.title": {
    en: "The pieces that keep leaving the Vault.",
    bn: "যেসব পণ্য সবচেয়ে বেশি বিক্রি হয়।",
  },
  "grid.bestSellers.description": {
    en: "Our most requested models, restocked weekly and inspected individually.",
    bn: "সবচেয়ে চাহিদাসম্পন্ন মডেল — প্রতি সপ্তাহে রিস্টক ও আলাদাভাবে পরীক্ষিত।",
  },
  "grid.bestSellers.action": { en: "Shop best sellers", bn: "বেস্ট সেলার দেখুন" },
  "grid.newArrivals.eyebrow": { en: "New Arrivals", bn: "নতুন এসেছে" },
  "grid.newArrivals.title": {
    en: "Just admitted to the Vault.",
    bn: "সদ্য ভল্টে যুক্ত হয়েছে।",
  },
  "grid.newArrivals.description": {
    en: "Fresh from our partner ateliers — limited runs, numbered and certified.",
    bn: "পার্টনার কারখানা থেকে একদম নতুন — সীমিত সংখ্যক, নম্বরযুক্ত ও সনদপ্রাপ্ত।",
  },
  "grid.newArrivals.action": { en: "Shop new arrivals", bn: "নতুন পণ্য দেখুন" },

  /* ---------------------------- shop by age -------------------------- */
  "age.eyebrow": { en: "Shop by Age", bn: "বয়স অনুযায়ী" },
  "age.title": {
    en: "The right toy, at exactly the right age.",
    bn: "সঠিক বয়সে সঠিক খেলনা।",
  },
  "age.description": {
    en: "Developmental guidance from our play specialists, so every gift lands perfectly.",
    bn: "আমাদের বিশেষজ্ঞদের পরামর্শ, যাতে প্রতিটি উপহার নিখুঁত হয়।",
  },
  "age.years": { en: "Years", bn: "বছর" },
  "age.pieces": { en: "pieces", bn: "টি পণ্য" },

  /* --------------------------- why choose us ------------------------- */
  "why.eyebrow": { en: "Why Velocita Vault", bn: "কেন ভেলোসিটা ভল্ট" },
  "why.title": {
    en: "Luxury is the standard. Trust is the promise.",
    bn: "বিলাসিতা আমাদের মান। বিশ্বাস আমাদের প্রতিশ্রুতি।",
  },
  "why.premium.title": { en: "Premium Quality", bn: "প্রিমিয়াম মান" },
  "why.premium.text": {
    en: "Aerospace-grade finishes, real leather seats and motors built to outlast childhood.",
    bn: "উন্নত মানের ফিনিশিং, আসল চামড়ার সিট এবং দীর্ঘস্থায়ী মোটর।",
  },
  "why.checked.title": { en: "Quality Checked", bn: "মান যাচাইকৃত" },
  "why.checked.text": {
    en: "Every unit passes a 42-point safety and finish inspection before it leaves the Vault.",
    bn: "প্রতিটি পণ্য ৪২ ধাপের নিরাপত্তা ও ফিনিশিং পরীক্ষা পার হয়ে আসে।",
  },
  "why.delivery.title": { en: "Fast Delivery", bn: "দ্রুত ডেলিভারি" },
  "why.delivery.text": {
    en: "White-glove dispatch within 24 hours, tracked door to door with insured handling.",
    bn: "২৪ ঘণ্টার মধ্যে ডিসপ্যাচ, ঘরে পৌঁছানো পর্যন্ত ট্র্যাকিং ও নিরাপদ হ্যান্ডলিং।",
  },
  "why.cod.title": { en: "Cash on Delivery", bn: "ক্যাশ অন ডেলিভারি" },
  "why.cod.text": {
    en: "Pay when it arrives. No deposits, no obligation, no questions asked.",
    bn: "পণ্য হাতে পেয়ে টাকা দিন। কোনো অগ্রিম নয়, কোনো ঝামেলা নয়।",
  },
  "why.returns.title": { en: "Easy Returns", bn: "সহজ রিটার্ন" },
  "why.returns.text": {
    en: "14-day returns with complimentary collection and full refund on unused pieces.",
    bn: "১৪ দিনের রিটার্ন — বিনামূল্যে সংগ্রহ ও অব্যবহৃত পণ্যে পূর্ণ রিফান্ড।",
  },
  "why.support.title": { en: "Trusted Support", bn: "নির্ভরযোগ্য সাপোর্ট" },
  "why.support.text": {
    en: "A named concierge for every order, reachable seven days a week.",
    bn: "প্রতিটি অর্ডারের জন্য নির্দিষ্ট সহায়ক, সপ্তাহে সাত দিন পাশে।",
  },

  /* ----------------------------- reviews ----------------------------- */
  "reviews.eyebrow": { en: "Customer Reviews", bn: "ক্রেতাদের রিভিউ" },
  "reviews.sectionTitle": {
    en: "26,000 families. One expectation met.",
    bn: "২৬,০০০ পরিবার। একটাই প্রত্যাশা পূরণ।",
  },
  "reviews.sectionDescription": {
    en: "Verified purchases only — every review below is tied to a confirmed order.",
    bn: "শুধু ভেরিফায়েড ক্রয় — প্রতিটি রিভিউ নিশ্চিত অর্ডারের সাথে যুক্ত।",
  },
  "reviews.count": { en: "2,481 reviews", bn: "২,৪৮১ রিভিউ" },
  "reviews.heading": { en: "Customer reviews", bn: "ক্রেতাদের রিভিউ" },
  "reviews.basedOn": { en: "Based on", bn: "মোট" },
  "reviews.verifiedReviews": { en: "verified reviews", bn: "ভেরিফায়েড রিভিউ" },
  "reviews.write": { en: "Write a review", bn: "রিভিউ লিখুন" },
  "reviews.signInToReview": { en: "Sign in to review", bn: "রিভিউ দিতে সাইন ইন করুন" },
  "reviews.buyToReview": {
    en: "Only delivered orders can be reviewed",
    bn: "শুধু ডেলিভারি হওয়া অর্ডারের রিভিউ দেওয়া যায়",
  },
  "reviews.alreadyReviewed": { en: "You already reviewed this", bn: "আপনি ইতিমধ্যে রিভিউ দিয়েছেন" },
  "reviews.verified": { en: "Verified", bn: "ভেরিফায়েড" },
  "reviews.all": { en: "All", bn: "সব" },
  "reviews.withPhotos": { en: "With photos", bn: "ছবিসহ" },
  "reviews.none": { en: "No reviews match these filters yet.", bn: "এই ফিল্টারে কোনো রিভিউ নেই।" },
  "reviews.submit": { en: "Submit review", bn: "রিভিউ জমা দিন" },
  "reviews.cancel": { en: "Cancel", bn: "বাতিল" },
  "reviews.titlePlaceholder": { en: "Headline", bn: "শিরোনাম" },
  "reviews.bodyPlaceholder": { en: "Tell other families what you think", bn: "আপনার অভিজ্ঞতা লিখুন" },
  "reviews.pendingApproval": {
    en: "Thanks — your review is now live on this page.",
    bn: "ধন্যবাদ — আপনার রিভিউ এখন এই পেজে প্রকাশিত হয়েছে।",
  },

  "reviews.storeReply": { en: "Velocita Vault replied", bn: "ভেলোসিটা ভল্টের উত্তর" },

  /* ---------------------------- showcase ----------------------------- */
  "showcase.eyebrow": { en: "Inside the Vault", bn: "ভল্টের ভেতরে" },
  "showcase.title": {
    en: "A three-minute film on how a Velocita piece is made.",
    bn: "তিন মিনিটের ফিল্মে দেখুন কীভাবে তৈরি হয় ভেলোসিটার পণ্য।",
  },
  "showcase.play": { en: "Play the Velocita Vault film", bn: "ভেলোসিটা ভল্টের ভিডিও চালান" },

  /* ------------------------------ story ------------------------------ */
  "story.eyebrow": { en: "Our Story", bn: "আমাদের গল্প" },
  "story.title": {
    en: "We don't sell toys. We furnish childhoods.",
    bn: "আমরা খেলনা বিক্রি করি না। আমরা শৈশব সাজাই।",
  },
  "story.badge": {
    en: "The year one father decided a toy should be built like an heirloom.",
    bn: "যে বছর এক বাবা ঠিক করলেন খেলনাও হতে হবে উত্তরাধিকারের মতো টেকসই।",
  },

  /* --------------------------- instagram ----------------------------- */
  "instagram.title": { en: "Inside the feed.", bn: "আমাদের ফিড।" },
  "instagram.description": {
    en: "Unboxings, atelier details and the families behind every delivery.",
    bn: "আনবক্সিং, কারিগরির খুঁটিনাটি আর প্রতিটি ডেলিভারির পেছনের পরিবার।",
  },

  /* --------------------------- newsletter ---------------------------- */
  "newsletter.eyebrow": { en: "The Private List", bn: "প্রাইভেট লিস্ট" },
  "newsletter.title": {
    en: "First access to limited releases.",
    bn: "সীমিত সংস্করণে সবার আগে প্রবেশ।",
  },
  "newsletter.description": {
    en: "Join 12,000 collectors and parents who see new arrivals 48 hours before anyone else. No noise — four emails a year.",
    bn: "১২,০০০ কালেক্টর ও অভিভাবকের সাথে যুক্ত হন, যারা নতুন পণ্য ৪৮ ঘণ্টা আগে দেখেন। বছরে মাত্র চারটি ইমেইল।",
  },
  "newsletter.emailLabel": { en: "Email address", bn: "ইমেইল ঠিকানা" },
  "newsletter.subscribe": { en: "Subscribe", bn: "সাবস্ক্রাইব" },
  "newsletter.done": {
    en: "You're on the list — welcome to the Vault.",
    bn: "আপনি তালিকায় যুক্ত হয়েছেন — ভল্টে স্বাগতম।",
  },
  "newsletter.privacy": {
    en: "By subscribing you agree to our privacy policy.",
    bn: "সাবস্ক্রাইব করলে আপনি আমাদের প্রাইভেসি নীতিতে সম্মত হচ্ছেন।",
  },

  /* ------------------------------ footer ----------------------------- */
  "footer.blurb": {
    en: "A curated maison of luxury toys for parents, collectors and gift buyers who refuse to compromise.",
    bn: "অভিভাবক, কালেক্টর ও উপহার ক্রেতাদের জন্য বাছাই করা বিলাসবহুল খেলনার ঠিকানা।",
  },
  "footer.categories": { en: "Categories", bn: "ক্যাটাগরি" },
  "footer.quickLinks": { en: "Quick Links", bn: "দ্রুত লিংক" },
  "footer.customerSupport": { en: "Customer Support", bn: "কাস্টমার সাপোর্ট" },
  "footer.payments": { en: "Accepted Payment Methods", bn: "গ্রহণযোগ্য পেমেন্ট মাধ্যম" },
  "footer.rights": { en: "All Rights Reserved.", bn: "সর্বস্বত্ব সংরক্ষিত।" },
  "footer.cat.rideOn": { en: "Ride-on Cars", bn: "রাইড-অন কার" },
  "footer.cat.electric": { en: "Electric Cars", bn: "ইলেকট্রিক কার" },
  "footer.cat.rc": { en: "RC Cars", bn: "আরসি কার" },
  "footer.cat.educational": { en: "Educational Toys", bn: "শিক্ষামূলক খেলনা" },
  "footer.cat.gifts": { en: "Premium Gifts", bn: "প্রিমিয়াম উপহার" },
  "footer.link.story": { en: "Our Story", bn: "আমাদের গল্প" },
  "footer.link.craft": { en: "Craftsmanship", bn: "কারিগরি" },
  "footer.link.new": { en: "New Arrivals", bn: "নতুন এসেছে" },
  "footer.link.best": { en: "Best Sellers", bn: "বেস্ট সেলার" },
  "footer.link.gift": { en: "Gift Cards", bn: "গিফট কার্ড" },
  "footer.support.shipping": { en: "Shipping & Delivery", bn: "শিপিং ও ডেলিভারি" },
  "footer.support.returns": { en: "Returns & Refunds", bn: "রিটার্ন ও রিফান্ড" },
  "footer.support.warranty": { en: "Warranty", bn: "ওয়ারেন্টি" },
  "footer.support.safety": { en: "Safety Standards", bn: "নিরাপত্তা মান" },
  "footer.support.contact": { en: "Contact", bn: "যোগাযোগ" },

  /* ------------------------------- auth ------------------------------ */
  "auth.memberAccess": { en: "Member access", bn: "মেম্বার অ্যাক্সেস" },
  "auth.back": { en: "Back", bn: "পেছনে" },
  "auth.welcomeBack": { en: "Welcome back", bn: "আবার স্বাগতম" },
  "auth.createAccount": { en: "Create your account", bn: "অ্যাকাউন্ট তৈরি করুন" },
  "auth.resetTitle": { en: "Reset your password", bn: "পাসওয়ার্ড রিসেট করুন" },
  "auth.signupBlurb": {
    en: "Join Velocita Vault to save, track and reorder.",
    bn: "সেভ, ট্র্যাক ও পুনরায় অর্ডারের জন্য ভেলোসিটা ভল্টে যোগ দিন।",
  },
  "auth.resetBlurb": {
    en: "We'll email you a secure link to set a new password.",
    bn: "নতুন পাসওয়ার্ড সেট করার জন্য আমরা আপনাকে একটি নিরাপদ লিংক ইমেইল করব।",
  },
  "auth.email": { en: "Email address", bn: "ইমেইল ঠিকানা" },
  "auth.password": { en: "Password", bn: "পাসওয়ার্ড" },
  "auth.confirmPassword": { en: "Confirm password", bn: "পাসওয়ার্ড নিশ্চিত করুন" },
  "auth.fullName": { en: "Full name", bn: "পুরো নাম" },
  "auth.signIn": { en: "Sign in", bn: "সাইন ইন" },
  "auth.forgotPassword": { en: "Forgot password?", bn: "পাসওয়ার্ড ভুলে গেছেন?" },
  "auth.noAccount": { en: "New to Velocita Vault?", bn: "ভেলোসিটা ভল্টে নতুন?" },
  "auth.createOne": { en: "Create an account", bn: "অ্যাকাউন্ট খুলুন" },
  "auth.haveAccount": { en: "Already have an account?", bn: "আগে থেকেই অ্যাকাউন্ট আছে?" },
  "auth.createAccountCta": { en: "Create account", bn: "অ্যাকাউন্ট তৈরি করুন" },
  "auth.sendResetLink": { en: "Send reset link", bn: "রিসেট লিংক পাঠান" },
  "auth.close": { en: "Close", bn: "বন্ধ করুন" },
} as const;

export type TranslationKey = keyof typeof DICTIONARY;

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // The site is English only — the language is locked and cannot be switched.
  const [language] = useState<Language>("en");

  useEffect(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    document.documentElement.lang = "en";
  }, []);

  const setLanguage = useCallback((_next: Language) => {}, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      toggleLanguage: () => {},
      t: (key) => DICTIONARY[key]?.en ?? key,
    }),
    [language, setLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: "en",
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: (key) => DICTIONARY[key]?.en ?? key,
    };
  }
  return context;
}
