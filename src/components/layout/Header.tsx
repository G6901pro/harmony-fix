import { useEffect, useState } from "react";
import { Menu, Search, Heart, ShoppingBag, User, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { CartDrawer, SearchDrawer, WishlistDrawer } from "@/components/layout/HeaderDrawers";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import { AccountPanel } from "@/components/account/AccountPanel";
import { useShopState } from "@/lib/shop-store";
import { useNotificationBadges } from "@/lib/notification-badges";

import { useMockAuth } from "@/lib/mock-auth";
import { useLanguage, type TranslationKey } from "@/lib/language";
import { useTaxonomy } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

const NAV: { key: TranslationKey; href: string }[] = [
  { key: "nav.shopAll", href: "/shop" },
  { key: "nav.collections", href: "/#collections" },
  { key: "nav.bestSellers", href: "/#best-sellers" },
  { key: "nav.newArrivals", href: "/#new-arrivals" },
  { key: "nav.shopByAge", href: "/#shop-by-age" },
  { key: "nav.ourStory", href: "/#story" },
];

/** Navigation entry: either a translated static link or a live category. */
type NavEntry = { label: string; href: string };





export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { cart, wishlist } = useShopState();
  const { requireAuth, user } = useMockAuth();
  const { total: unreadTotal } = useNotificationBadges();
  const { t } = useLanguage();
  const { categoryTree } = useTaxonomy();
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  // Static links first, then every active top-level category from the database
  // so a category created in the Control Room shows up in the navigation.
  const navEntries: NavEntry[] = [
    ...NAV.map((item) => ({ label: t(item.key), href: item.href })),
    ...categoryTree.map((category) => ({
      label: category.name,
      href: `/shop?category=${encodeURIComponent(category.name)}`,
    })),
  ];




  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const locked = menuOpen || cartOpen || wishlistOpen || searchOpen || accountOpen;
    document.body.style.overflow = locked ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen, cartOpen, wishlistOpen, searchOpen, accountOpen]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
        scrolled ? "glass border-b py-2" : "border-b border-transparent py-4",
      )}
    >
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 lg:px-10">
        <div className="flex min-w-0 items-center gap-10">
          <a href="#top" className="min-w-0" aria-label="Velocita Vault home">
            <Logo compact={scrolled} />
          </a>
          <nav aria-label="Primary" className="hidden min-w-0 xl:block">
            <ul className="flex items-center gap-8">
              {navEntries.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="relative text-[11px] tracking-[0.22em] whitespace-nowrap text-muted-foreground uppercase transition-colors duration-300 hover:text-foreground after:absolute after:-bottom-2 after:left-0 after:h-px after:w-0 after:bg-gold after:transition-all after:duration-500 hover:after:w-full"
                  >
                    {item.label}
                  </a>
                </li>
              ))}

            </ul>
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
          <ErrorBoundary boundary="header_notification_bell" silent>
            <NotificationBell onRequireAuth={() => requireAuth(() => setAccountOpen(true), "account")} />
          </ErrorBoundary>
          <button
            type="button"
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
            className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:text-gold sm:size-10"
          >
            <Search className="size-[18px]" />
          </button>
          <button
            type="button"
            aria-label={`Wishlist, ${wishlist.length} items`}
            onClick={() => requireAuth(() => setWishlistOpen(true), "wishlist")}
            className="relative grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:text-gold sm:size-10"
          >
            <Heart className="size-[18px]" />
            {wishlist.length > 0 ? (
              <span className="absolute top-0.5 right-0 grid size-4 place-items-center rounded-full bg-[image:var(--gradient-gold)] text-[9px] font-semibold text-primary-foreground sm:top-1 sm:right-0.5">
                {wishlist.length}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            aria-label={unreadTotal > 0 ? `Account, ${unreadTotal} unread updates` : "Account"}
            onClick={() => requireAuth(() => setAccountOpen(true), "account")}
            className="relative grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:text-gold sm:size-10"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="Your profile"
                className="size-7 rounded-full border border-gold/30 object-cover sm:size-8"
              />
            ) : (
              <User className="size-[18px]" />
            )}
            {unreadTotal > 0 ? (
              <span
                aria-hidden
                className="absolute top-0.5 right-0.5 size-2.5 rounded-full bg-destructive ring-2 ring-background sm:top-1 sm:right-1"
              />
            ) : null}
          </button>

          <button
            type="button"
            aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
            onClick={() => setCartOpen(true)}
            className="relative grid size-9 place-items-center rounded-full text-foreground transition-colors hover:text-gold sm:size-10"
          >
            <ShoppingBag className="size-[18px]" />
            {cartCount > 0 ? (
              <span className="absolute top-0.5 right-0 grid size-4 place-items-center rounded-full bg-[image:var(--gradient-gold)] text-[9px] font-semibold text-primary-foreground sm:top-1 sm:right-0.5">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="relative z-[70] grid size-9 place-items-center rounded-full text-foreground transition-colors hover:text-gold sm:size-10 xl:hidden"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

      </div>

      <SearchDrawer open={searchOpen} onClose={() => setSearchOpen(false)} />
      <WishlistDrawer open={wishlistOpen} onClose={() => setWishlistOpen(false)} />
      <ErrorBoundary boundary="cart_drawer" silent>
        <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      </ErrorBoundary>
      <ErrorBoundary boundary="header_account_panel" silent>
        <AccountPanel
          open={accountOpen}
          onClose={() => setAccountOpen(false)}
          onOpenWishlist={() => setWishlistOpen(true)}
        />
      </ErrorBoundary>


      {/* Mobile menu */}
      <div
        className={cn(
          "fixed inset-0 z-[60] h-[100dvh] w-full bg-background transition-opacity duration-300 xl:hidden",
          menuOpen
            ? "pointer-events-auto visible opacity-100"
            : "pointer-events-none invisible opacity-0",
        )}
      >
        <nav
          aria-label="Mobile"
          className="flex h-full flex-col justify-center gap-2 overflow-y-auto bg-background px-8 py-24"
        >
          {navEntries.map((item, index) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              style={{ transitionDelay: `${index * 60}ms` }}
              className={cn(
                "border-b border-border py-5 font-display text-2xl tracking-wide transition-all duration-500",
                menuOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
              )}
            >
              {item.label}
            </a>
          ))}

          
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-[11px] tracking-[0.22em] text-muted-foreground uppercase">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setSearchOpen(true);
              }}
              className="inline-flex items-center gap-2 uppercase transition-colors hover:text-gold"
            >
              <Search className="size-4" />
              {t("action.search")}
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                requireAuth(() => setWishlistOpen(true), "wishlist");
              }}
              className="inline-flex items-center gap-2 uppercase transition-colors hover:text-gold"
            >
              <Heart className="size-4" />
              {t("action.wishlist")}
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                requireAuth(() => setAccountOpen(true), "account");
              }}
              className="inline-flex items-center gap-2 uppercase transition-colors hover:text-gold"
            >
              <User className="size-4" />
              {t("action.account")}
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setCartOpen(true);
              }}
              className="inline-flex items-center gap-2 uppercase transition-colors hover:text-gold"
            >
              <ShoppingBag className="size-4" />
              {t("action.cart")}
            </button>
            <a href="/#story" onClick={() => setMenuOpen(false)} className="uppercase transition-colors hover:text-gold">
              {t("action.support")}
            </a>
          </div>
        </nav>
      </div>

    </header>
  );
}
