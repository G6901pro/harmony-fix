import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, Search, Heart, ShoppingBag, User, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const categories = [
  { id: 1, name: "Home", href: "/" },
  { id: 2, name: "Shop", href: "/shop" },
  { id: 3, name: "About", href: "/about" },
  { id: 4, name: "Contact", href: "/contact" },
];

export function Header() {
  const [query, setQuery] = useState("");
  const cartItems = useCartStore((state) => state.items);
  const { cartCount, cartTotal } = useCartTotals();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-8 w-auto" />
            <span className="font-bold">Shop</span>
          </Link>

          {/* Search */}
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

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Link href="/cart" className="relative text-muted-foreground hover:text-gold transition-colors">
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full bg-gold text-[10px] font-bold text-primary-foreground">
                  {cartCount}
                </span>
              ) : null}
            </Link>
            <Link href="/wishlist" className="text-muted-foreground hover:text-gold transition-colors">
              <Heart className="h-5 w-5" />
            </Link>
            <Link href="/account" className="text-muted-foreground hover:text-gold transition-colors">
              <User className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
