const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// When METRO_CACHE_DIR is set (Docker builds), direct Metro's FileStore cache
// to the Docker-mounted volume so bundle cache persists across deploys.
if (process.env.METRO_CACHE_DIR) {
  config.cacheStores = ({ FileStore }) => [
    new FileStore({ root: process.env.METRO_CACHE_DIR }),
  ];
}

module.exports = withNativeWind(config, { input: './global.css' });
