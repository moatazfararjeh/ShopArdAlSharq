import { Home, Search, Heart, ShoppingBag, User } from "lucide-react";
import { useState } from "react";

const navItems = [
  { icon: Home, label: "Home" },
  { icon: Search, label: "Search" },
  { icon: Heart, label: "Wishlist" },
  { icon: ShoppingBag, label: "Cart", badge: 3 },
  { icon: User, label: "Profile" },
];

const BottomNav = () => {
  const [active, setActive] = useState("Home");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t border-border safe-bottom">
      <div className="flex items-center justify-around py-2 px-4">
        {navItems.map(({ icon: Icon, label, badge }) => (
          <button
            key={label}
            onClick={() => setActive(label)}
            className={`relative flex flex-col items-center gap-0.5 p-2 transition-colors ${
              active === label ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon size={22} strokeWidth={active === label ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium">{label}</span>
            {badge && (
              <span className="absolute -top-0.5 right-0 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
