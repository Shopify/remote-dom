import type {RemoteFragment} from '@remote-ui/core';

import {mount} from '../src';
import {render, createRemoteReactComponent} from '../../react/src';

const StandardComponent =
  createRemoteReactComponent<'StandardComponent'>('StandardComponent');

const FragmentPropsComponent = createRemoteReactComponent<
  'FragmentPropsComponent',
  {someProp: RemoteFragment}
>('FragmentPropsComponent', {
  fragmentProps: ['someProp'],
});

describe('mount()', () => {
  it('find() and findAll() are able to find a standard component', () => {
    const wrapper = mount((root) => render(<StandardComponent />, root));

    expect(wrapper.find(StandardComponent)).not.toBeNull();

    expect(wrapper.findAll(StandardComponent)[0]).toBeDefined();
    expect(wrapper.findAll(StandardComponent)[0]).not.toBeNull();
  });

  it('find() and findAll() are able to find a component with fragment props', () => {
    const wrapper = mount((root) =>
      render(<FragmentPropsComponent someProp={<></>} />, root),
    );

    expect(wrapper.find(FragmentPropsComponent)).not.toBeNull();

    expect(wrapper.findAll(FragmentPropsComponent)[0]).toBeDefined();
    expect(wrapper.findAll(FragmentPropsComponent)[0]).not.toBeNull();
  });
});
