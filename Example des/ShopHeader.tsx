import { Bell, Menu } from "lucide-react";

const ShopHeader = () => {
  return (
    <header className="flex items-center justify-between px-4 py-3">
      <button className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
        <Menu size={20} className="text-foreground" />
      </button>
      <h1 className="font-display text-xl font-semibold text-foreground">
        Boutique
      </h1>
      <button className="relative w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
        <Bell size={20} className="text-foreground" />
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
      </button>
    </header>
  );
};

export default ShopHeader;
