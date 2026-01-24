const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add web-specific configurations
config.resolver.sourceExts.push("web.tsx", "web.ts", "web.jsx", "web.js");

// Optimize for web
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    compress: {
      drop_console: true, // Remove console.logs in production
    },
  },
};

// Configure asset handling for web
config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== "svg",
);
config.resolver.sourceExts.push("svg");

// Web-specific optimizations
if (process.env.EXPO_PLATFORM === "web") {
  config.transformer.enableBabelRCLookup = true;
  config.transformer.enableBabelRuntime = true;
}

module.exports = config;
