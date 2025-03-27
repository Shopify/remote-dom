import '@remote-dom/core/polyfill';
import '@remote-dom/react/polyfill';

import {createEndpoint} from '@remote-ui/rpc';

import '../elements.ts';
import {renderLegacy as renderLegacyRemote} from '../render.ts';

const endpoint = createEndpoint(self as any as Worker);

endpoint.expose({renderLegacy});

async function renderLegacy(channel: any) {
  await renderLegacyRemote(channel);
}
