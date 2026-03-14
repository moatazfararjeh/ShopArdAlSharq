import { motion } from "framer-motion";
import heroBanner from "@/assets/hero-banner.jpg";

const HeroBanner = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      className="relative mx-4 rounded-3xl overflow-hidden h-48 sm:h-56"
    >
      <img
        src={heroBanner}
        alt="New collection"
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-foreground/60 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-end p-6">
        <p className="text-primary-foreground/80 text-xs font-medium uppercase tracking-widest mb-1">
          Spring Collection
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-primary-foreground leading-tight">
          New Arrivals
        </h2>
        <button className="mt-3 self-start bg-primary-foreground text-foreground text-xs font-semibold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity">
          Shop Now
        </button>
      </div>
    </motion.div>
  );
};

export default HeroBanner;
