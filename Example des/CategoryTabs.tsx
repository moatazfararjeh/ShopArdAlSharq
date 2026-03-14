import { categories } from "@/data/products";

interface CategoryTabsProps {
  active: string;
  onChange: (cat: string) => void;
}

const CategoryTabs = ({ active, onChange }: CategoryTabsProps) => {
  return (
    <div className="flex gap-2 px-4 overflow-x-auto scrollbar-none py-1">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`whitespace-nowrap text-sm px-4 py-2 rounded-full font-medium transition-all ${
            active === cat
              ? "bg-foreground text-background"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
};

export default CategoryTabs;
