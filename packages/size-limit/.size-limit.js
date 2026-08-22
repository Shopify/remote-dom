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

function bundleCheck(name, fixture, limit) {
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
  bundleCheck('@remote-dom/compat', 'compat', '1500 B'),
  bundleCheck('@remote-dom/core (remote)', 'core-remote', '14000 B'),
  bundleCheck('@remote-dom/core (host)', 'core-host', '2500 B'),
  bundleCheck('@remote-dom/polyfill', 'polyfill', '8000 B'),
  bundleCheck('@remote-dom/preact (remote)', 'preact-remote', '1500 B'),
  bundleCheck('@remote-dom/preact (host)', 'preact-host', '2500 B'),
  bundleCheck('@remote-dom/react (remote)', 'react-remote', '2000 B'),
  bundleCheck('@remote-dom/react (host)', 'react-host', '3000 B'),
  bundleCheck('@remote-dom/signals', 'signals', '1500 B'),
];
