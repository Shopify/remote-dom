const peerDependencies = [
  '@preact/signals',
  '@preact/signals-core',
  'preact',
  'react',
];

function modifyEsbuildConfig(config) {
  return {
    ...config,
    platform: 'browser',
    format: 'esm',
    target: 'es2020',
  };
}

function packageCheck(name, fixture, limit) {
  return {
    name,
    path: `fixtures/${fixture}.ts`,
    import: '*',
    ignore: peerDependencies,
    modifyEsbuildConfig,
    limit,
  };
}

export default [
  packageCheck('@remote-dom/compat', 'compat', '1500 B'),
  packageCheck('@remote-dom/core', 'core', '14500 B'),
  packageCheck('@remote-dom/polyfill', 'polyfill', '8000 B'),
  packageCheck('@remote-dom/preact', 'preact', '3500 B'),
  packageCheck('@remote-dom/react', 'react', '4000 B'),
  packageCheck('@remote-dom/signals', 'signals', '1500 B'),
];
