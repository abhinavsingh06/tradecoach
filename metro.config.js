// Metro config for Expo SDK 56.
// Workaround for TanStack Query v5: @tanstack/query-core declares a
// `react-native` field pointing to TS source, but Metro's modern build of
// @tanstack/react-query bare-imports the package and resolution can fail in
// some setups. We force-resolve the few @tanstack core packages to their
// TS source. See https://github.com/TanStack/query/pull/8653

const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const TANSTACK_SOURCE_OVERRIDES = {
  '@tanstack/query-core': 'node_modules/@tanstack/query-core/src/index.ts',
};

const previousResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (ctx, moduleName, platform) => {
  const override = TANSTACK_SOURCE_OVERRIDES[moduleName];
  if (override) {
    return {
      type: 'sourceFile',
      filePath: path.join(__dirname, override),
    };
  }
  if (previousResolveRequest) {
    return previousResolveRequest(ctx, moduleName, platform);
  }
  return ctx.resolveRequest(ctx, moduleName, platform);
};

module.exports = config;
