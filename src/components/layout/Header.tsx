import { useEffect, useState } from "react";
import { Menu, Search, Heart, ShoppingBag, User, X, ChevronDown } from "lucide-react";
import {
  navigationMenuTriggerStyle,
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Logo } from "@/components/brand/Logo";
import { CartDrawer, SearchDrawer, WishlistDrawer } from "@/components/layout/HeaderDrawers";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useMockAuth } from "@/lib/mock-auth";
import { useLanguage, type TranslationKey } from "@/lib/language";
import { useTaxonomy } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Collections", href: "/collections" },
  { label: "About", href: "/about" },
];

const categories = [
  { id: 1, name: "Home", href: "/" },
  { id: 2, name: "Shop", href: "/shop" },
  { id: 3, name: "About", href: "/about" },
  { id: 4, name: "Contact", href: "/contact" },
];

export function Header() {
  const { data: taxonomyData } = useTaxonomy();
  const [query, setQuery] = useState("");
  const cartItems = useCartStore((state) => state.items);
  const { cartCount, cartTotal } = useCartTotals();
  const categories = [
    { id: 1, name: "Home", href: "/" },
    { id: 2, name: "Shop", href: "/shop" },
    { id: 3, name: "About", href: "/about" },
    { id: 4, name: "Contact", href: "/contact" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-8 w-auto" />
          <span className="font-bold">Shop</span>
        </Link>

        <div className="relative hidden md:block w-64">
          <Input
            type="search"
            placeholder="Search products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>

        <div className="flex items-center gap-4">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Categories</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[300px] gap-1 p-2">
                    {categories.map((cat) => (
                      <li key={cat.id}>
                        <a
                          href={`/category/${cat.slug}`}
                          className="block px-4 py-2 text-sm hover:bg-accent rounded-md transition-colors"
                        >
                          {cat.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" aria-label="Cart">
            <ShoppingBag className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Wishlist">
            <Heart className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Account">
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
