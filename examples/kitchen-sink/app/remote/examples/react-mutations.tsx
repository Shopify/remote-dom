/** @jsxRuntime automatic */
/** @jsxImportSource react */

import { createRemoteComponent } from '@remote-dom/react';
import { createRoot } from 'react-dom/client';

import { useEffect, useState } from 'react';
import type { RenderAPI } from '../../types.ts';
import { Stack as StackElement, Text as TextElement } from '../elements.ts';
import { useRenders } from './utils/react-hooks.ts';

const Stack = createRemoteComponent('ui-stack', StackElement);
const Text = createRemoteComponent('ui-text', TextElement);

const data1 = <Text key="d1">Data: 1</Text>;
const data2 = <Text key="d2">Data: 2</Text>;
const data3 = <Text key="d3">Data: 3</Text>;
const data4 = <Text key="d4">Data: 4</Text>;
const done = <Stack key="done" testId="test-done" />;
const loading1 = <Text key="l1">Loading: 1</Text>;
const loading2 = <Text key="l2">Loading: 2</Text>;

const Example1 = () => {
  const renders = useRenders(2);

  return (
    <Stack spacing testId="test-stack">
      <>
        {renders === 1 && loading1}
        {renders === 2 && (
          <>
            {data1}
            {data2}
          </>
        )}
      </>
      <>
        {renders === 1 && loading2}
        {renders === 2 && (
          <>
            {data3}
            {data4}
          </>
        )}
      </>
      {renders === 2 && done}
    </Stack>
  );
};

const Example2 = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, [setLoading]);

  return (
    <Stack spacing testId="test-stack">
      <>
        {loading && loading1}
        {!loading && (
          <>
            {data1}
            {data2}
          </>
        )}
      </>
      <>
        {loading && loading2}
        {!loading && (
          <>
            {data3}
            {data4}
          </>
        )}
      </>
      {!loading && done}
    </Stack>
  );
};


const Example3 = () => {
  const renders = useRenders(2);

  return (
    <Stack spacing testId="test-stack">
      {renders === 2 && data1}
      {data2}
      {renders === 1 && data3}
      {renders === 2 && done}
    </Stack>
  );
};


function App({api}: {api: RenderAPI}) {
  const {example} = api;

  return example === 'react-mutations-1' ? (
    <Example1 />
  ) : example === 'react-mutations-2' ? (
    <Example2 />
  ) : example === 'react-mutations-3' ? (
    <Example3 />
  ) : null;
}

export function renderUsingReact(root: Element, api: RenderAPI) {
  createRoot(root).render(<App api={api} key={api.example} />);
}
