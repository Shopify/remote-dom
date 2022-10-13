import type {AbstractChannel} from './protocol';
import {Window} from './dom/Window';
import {Element} from './dom/Element';
import {CHANNEL, ID} from './dom/constants';

export type {Document} from './dom/Document';
export type {Window} from './dom/Window';

export function createDocument(channel: AbstractChannel) {
  function init(initData: typeof channel.initData) {
    if (initData) {
      for (const name of initData!.props) {
        Object.defineProperty(Element.prototype, name, {
          enumerable: true,
          writable: true,
          value: null,
        });
      }
    }
  }

  if (channel.initData) {
    init(channel.initData);
  } else {
    // eslint-disable-next-line promise/catch-or-return
    channel.ready.then(init);
  }

  const window = new Window();
  window[CHANNEL] = channel;
  window.document[CHANNEL] = channel;
  // force `document` to be ID#0
  window.document[ID] = 0;
  // nodeId--;
  return window.document;
}
