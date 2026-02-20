const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ensure .cjs files are resolved (axios ships .cjs)
if (!config.resolver.sourceExts.includes('cjs')) {
  config.resolver.sourceExts.push('cjs');
}

// Force Metro to prefer browser/react-native builds over Node builds
config.resolver.unstable_conditionNames = [
  'react-native',
  'browser',
  'require',
  'import',
];

// Direct override: force axios to resolve to its browser CJS build
// This prevents Metro from using the Node build which imports Node stdlib
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'axios') {
    return context.resolveRequest(
      context,
      path.resolve(__dirname, 'node_modules/axios/dist/browser/axios.cjs'),
      platform,
    );
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
