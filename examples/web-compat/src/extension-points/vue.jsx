import {extend, document} from '../client';
import {
  createApp as baseCreateApp,
  defineComponent,
  h,
} from 'vue/dist/vue.esm-bundler';

// silence warnings about unregistered custom elements:
function createApp(component, props) {
  const app = baseCreateApp(component, props);
  app.config.isCustomElement = (tag) => tag.startsWith('ui-');
  return app;
}

// this is just to enable syntax highlighting for Vue templates:
const html = String;

const Counter = defineComponent({
  data() {
    return {count: 0};
  },
  methods: {
    click() {
      this.count++;
    },
  },
  template: html`
    <ui-stack align="center">
      <ui-stack-item>
        <ui-button @click="click">Increment</ui-button>
      </ui-stack-item>
      <ui-stack-item>Count is {{ count }}</ui-stack-item>
    </ui-stack>
  `,
});

const Chat = defineComponent({
  data() {
    return {messages: []};
  },
  methods: {
    async click() {
      const {api} = this.$attrs;
      const message = await api.getMessage();
      const time = new Date().toLocaleTimeString();
      const log = `Received (${time}): ${JSON.stringify(message)}`;
      this.messages.push(log);
    },
  },
  render({messages}) {
    return (
      <ui-view borderWidth="base" borderRadius={5} padding="base">
        <ui-block-stack>
          <ui-text size="medium">Chat</ui-text>
          <button onClick={this.click}>Get Message</button>
        </ui-block-stack>
        <ui-stack vertical>
          {messages.map((message) => (
            <ui-stack-item padding="med">{message}</ui-stack-item>
          ))}
        </ui-stack>
      </ui-view>
    );
  },
});

/** A Vue-based extension */
extend('vue', async (root, api) => {
  const stack = document.createElement('ui-block-stack');
  stack.padding = 'lg';
  root.append(stack);

  const counter = document.createElement('ui-view');
  const chat = document.createElement('ui-view');
  stack.append(counter, chat);

  createApp(Counter, {api}).mount(counter);
  createApp(Chat, {api}).mount(chat);
});
