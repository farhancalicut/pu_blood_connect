const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add web-specific configurations
config.resolver.sourceExts.push("web.tsx", "web.ts", "web.jsx", "web.js");

// Add SVG to source extensions
config.resolver.sourceExts.push("svg");

// Optimize for web
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    compress: {
      drop_console: true, // Remove console.logs in production
    },
  },
};

// Web-specific optimizations
if (process.env.EXPO_PLATFORM === "web") {
  config.transformer.enableBabelRCLookup = true;
  config.transformer.enableBabelRuntime = true;
  
  // Ensure proper platform resolution for web
  config.resolver.platforms = ["web", "ios", "android"];
}

module.exports = config;
