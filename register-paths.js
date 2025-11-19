/**
 * Runtime path alias resolver for production builds
 * Registers tsconfig path mappings for the compiled dist/ directory
 */

const tsConfigPaths = require('tsconfig-paths');
const tsConfig = require('./tsconfig.json');

// Get base URL and paths from tsconfig
const baseUrl = './dist'; // Override to use dist instead of src
const paths = {};

// Convert src paths to dist paths
Object.keys(tsConfig.compilerOptions.paths).forEach(key => {
  const srcPaths = tsConfig.compilerOptions.paths[key];
  paths[key] = srcPaths.map(p => p.replace('src/', ''));
});

// Register the paths
tsConfigPaths.register({
  baseUrl,
  paths,
});
