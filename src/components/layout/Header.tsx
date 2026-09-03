import { cn } from "@/lib/utils";

const categories = [
  "Home",
  "Shop",
  "About",
  "Contact",
];

export function Header() {
  return (
    <header className={cn("sticky top-0 z-50 border-b bg-background/95 backdrop-blur")}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left: Logo + Search */}
          <div className="flex items-center gap-8">
            <a href="/" className="text-xl font-bold tracking-tight text-gold">
              Velocita
            </a>
            <nav className="hidden lg:flex items-center gap-6">
              {categories.map((item) => (
                <a
                  key={item.name}
                  href={`/category/${item.slug}`}
                  className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
                >
                  {item.name}
                </a>
              ))}
            </nav>
          </div>

          {/* Right: Cart, Wishlist, Account, Search */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="text-foreground/80 hover:text-gold transition-colors"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>
            <Link
              href="/account"
              className="text-foreground/80 hover:text-gold transition-colors"
              aria-label="Account"
            >
              <User className="h-5 w-5" />
            </Link>
            <button
              type="button"
              className="text-foreground/80 hover:text-gold transition-colors lg:hidden"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
