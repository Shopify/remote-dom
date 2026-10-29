describe('Vue compatibility', () => {
  it('requires a Vue version that checks object children for the VNode flag', () => {
    const {peerDependencies} = jest.requireActual('../../package.json');

    expect(peerDependencies.vue).toBe('>=3.5.9 <4.0.0');
  });
});
