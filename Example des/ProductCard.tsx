import { Heart } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import type { Product } from "@/data/products";

interface ProductCardProps {
  product: Product;
  index: number;
}

const ProductCard = ({ product, index }: ProductCardProps) => {
  const [liked, setLiked] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="flex flex-col"
    >
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-secondary mb-3 group">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {product.isNew && (
          <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
            New
          </span>
        )}
        {product.originalPrice && (
          <span className="absolute top-3 right-12 bg-accent text-accent-foreground text-[10px] font-semibold px-2.5 py-1 rounded-full">
            Sale
          </span>
        )}
        <button
          onClick={() => setLiked(!liked)}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center transition-colors"
        >
          <Heart
            size={16}
            className={liked ? "fill-primary text-primary" : "text-foreground"}
          />
        </button>
      </div>
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
        {product.brand}
      </p>
      <h3 className="text-sm font-medium text-foreground leading-tight mb-1">
        {product.name}
      </h3>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">
          ${product.price}
        </span>
        {product.originalPrice && (
          <span className="text-xs text-muted-foreground line-through">
            ${product.originalPrice}
          </span>
        )}
      </div>
    </motion.div>
  );
};

export default ProductCard;
