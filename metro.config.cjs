const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Limit workers so Docker builds don't exhaust container resources
config.maxWorkers = 2;

module.exports = withNativeWind(config, { input: './global.css' });
