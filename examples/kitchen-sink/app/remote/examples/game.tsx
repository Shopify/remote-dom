/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import {render, type RenderableProps} from 'preact';
import {signal, computed} from '@preact/signals';

// import '../elements.ts';
import type {RemoteElement} from '@remote-dom/core/elements';
import type {RenderAPI} from '../../types.ts';

type IgnoreKeys =
  | symbol
  | number
  | 'children'
  | keyof HTMLElement
  | keyof RemoteElement;

type PropsForElement<T extends keyof HTMLElementTagNameMap> = RenderableProps<
  {
    [K in keyof HTMLElementTagNameMap[T] as `${K extends IgnoreKeys ? '' : K}`]?: HTMLElementTagNameMap[T][K];
  },
  HTMLElementTagNameMap[T]
>;

declare global {
  namespace preact.JSX {
    interface IntrinsicElements {
      'ui-stack': PropsForElement<'ui-stack'>;
      'ui-text': PropsForElement<'ui-text'>;
      'ui-button': PropsForElement<'ui-button'>;
      'ui-modal': PropsForElement<'ui-modal'>;
    }
  }
}

let api!: RenderAPI;

export function renderGame(root: Element, _api: RenderAPI) {
  api = _api;
  render(<App />, root);
}

abstract class Entity {
  #x = signal(0);
  #y = signal(0);
  width = 1;
  height = 1;

  set x(x: number) {
    this.#x.value = x;
  }
  get x() {
    return this.#x.value;
  }
  set y(y: number) {
    this.#y.value = y;
  }
  get y() {
    return this.#y.value;
  }

  constructor(
    protected game: Game,
    x = 0,
    y = 0,
  ) {
    this.x = x;
    this.y = y;
  }

  moveBy(dx: number, dy: number) {
    this.x += dx;
    this.y += dy;
  }

  moveTo(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  _isIntersecting(entity: Entity) {
    const {x: x1, y: y1, width: w1, height: h1} = this;
    const {x: x2, y: y2, width: w2, height: h2} = entity;
    return x1 + w1 > x2 && x1 < x2 + w2 && y1 + h1 > y2 && y1 < y2 + h2;
  }

  collidesWith(entity: Entity): boolean | void {}

  tick(time: number, delta: number): void {}

  draw(context: OffscreenCanvasRenderingContext2D): void {}

  respond(event: Event, action: string): boolean | void {}
}

class Bird extends Entity {
  width = 60;
  height = 60;
  dead = signal(0);
  flapping = signal(false);
  flapState = signal(0);
  flapTime = signal(0);
  flapUntil = signal(0);
  velocity = signal(0);
  acceleration = signal(0);
  constructor(game: Game) {
    super(game, 100, 200);
  }
  tick(time: number, delta: number) {
    const MAX = 5;

    if (this.dead.value) {
      this.dead.value += delta;
      if (this.dead.value > 1500) {
        this.game.stop();
      }
    }

    const flapping = this.flapping.value && !this.dead.value;
    this.flapTime.value -= delta * 9.6;
    if (flapping) {
      this.flapTime.value += delta * 9.6 * 1.5;
      if (this.flapUntil.value < time) {
        this.flapping.value = false;
      }
    }
    const velocity = Math.max(
      -MAX,
      Math.min((this.flapTime.value / 2000) * 2, MAX),
    );
    this.y -= velocity;
    const onGround = this.y + this.height >= this.game.screen.height - 50;
    if (onGround) {
      this.y = this.game.screen.height - this.height - 50;
    }
    if (!this.dead.value) {
      this.flapState.value =
        (this.flapState.value + (flapping ? 2 : onGround ? 0.1 : 0.5)) % 500;
      if (!onGround) {
        this.x += Math.sin(time / 1000) * 0.5;
      }
    }
  }
  draw(ctx: OffscreenCanvasRenderingContext2D) {
    ctx.translate((this.width / 2) | 0, (this.height / 2) | 0);
    ctx.scale(7, 7);

    const angle = (Math.sin(this.flapState.value * 0.15) * Math.PI) / 20;
    ctx.rotate(angle);

    // Draw the bird body
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.moveTo(-4, -1);
    ctx.lineTo(-8, -2);
    ctx.lineTo(-9, -4);
    ctx.lineTo(-9, 4);
    ctx.lineTo(-8, 3);
    ctx.lineTo(-4, 1);
    ctx.closePath();
    ctx.fill();

    // Draw the flapping wings
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const wingAngle = 3 + (Math.sin(this.flapState.value * 0.2) * Math.PI) / 4;
    ctx.rotate(wingAngle);
    ctx.lineTo(8, -4);
    ctx.lineTo(8, 4);
    ctx.closePath();
    ctx.fill();
    ctx.rotate(-wingAngle);

    // Draw the beak
    ctx.fillStyle = 'rgb(249, 236, 121)';
    ctx.beginPath();
    ctx.moveTo(5, 0);
    ctx.lineTo(8, -1);
    ctx.lineTo(8, 1);
    ctx.closePath();
    ctx.fill();

    // Draw the eye
    ctx.fillStyle = 'rgb(204, 255, 255';
    ctx.beginPath();
    ctx.arc(3, -2, 1, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    // }
    // ctx.fillRect(0, 0, 10, 5);

    if (this.dead.value) {
      ctx.rotate(-angle);
      const alpha = Math.min(this.dead.value / 2000, 1) * 180;
      ctx.fillStyle = `rgb(${255 - alpha}, 20, 0)`;
      ctx.beginPath();
      // ctx.arc(0, 0, this.flapState.value / 10, 0, Math.PI * 2);
      ctx.ellipse(
        0,
        0,
        this.dead.value / 7,
        Math.min(this.dead.value / 4, 7),
        0,
        0,
        Math.PI * 2,
      );
      ctx.closePath();
      ctx.fill();
    }
  }
  respond(event: Event, action: string) {
    switch (action) {
      case 'flap':
        if (!this.flapping.peek()) {
          this.flapping.value = true;
          this.flapTime.value = 0;
        }
        this.flapUntil.value = Date.now() + 200;
        return true;
    }
  }
  collidesWith(entity: Entity) {
    // return entity instanceof Block || entity instanceof Ground;
    return entity instanceof Block;
  }
  collision(entity: Entity) {
    // if (entity instanceof Block) {
    this.dead.value = 1;
    if (entity instanceof Block) {
      entity.velocity = 0;
    }
    // }
  }
  // collidesWith(entity: Entity) {
  //   if (entity instanceof Block) {
  //     const {x: x1, y: y1, width: w1, height: h1} = this;
  //     const {x: x2, y: y2, width: w2, height: h2} = entity;
  //     return x1 + w1 > x2 && x1 < x2 + w2 && y1 + h1 > y2 && y1 < y2 + h2;
  //   }
  // }
}

class Ground extends Entity {
  height = 50;
  time = signal(0);
  constructor(game: Game) {
    super(game);
    this.y = game.screen.height - this.height;
  }

  tick(time: number, delta: number) {
    this.time.value += delta;
  }

  draw(ctx: OffscreenCanvasRenderingContext2D) {
    ctx.fillStyle = 'rgb(115, 63, 28)';
    ctx.beginPath();
    // let startY = Math.sin(this.time.value / 500) * 10;
    // let endY = Math.sin(this.time.value / 1300) * 10;
    ctx.moveTo(0, 0);
    ctx.lineTo(this.game.screen.width, 0);
    ctx.lineTo(this.game.screen.width, this.height);
    ctx.lineTo(0, this.height);
    ctx.closePath();
    ctx.fill();
  }
}

class Sky extends Entity {
  height = 50;
  time = signal(0);
  tick(time: number, delta: number) {
    this.time.value += delta;
  }
  draw(ctx: OffscreenCanvasRenderingContext2D) {
    ctx.fillStyle = 'rgb(204, 255, 255)';
    ctx.beginPath();
    let startY = Math.sin(this.time.value / 500) * 10;
    let endY = Math.sin(this.time.value / 1300) * 10;
    ctx.moveTo(0, 0);
    ctx.lineTo(this.game.screen.width, 0);
    ctx.lineTo(this.game.screen.width, this.height + endY);
    ctx.lineTo(0, this.height + startY);
    ctx.closePath();
    ctx.fill();
  }
}

class Background extends Entity {
  draw(ctx: OffscreenCanvasRenderingContext2D) {
    const {width, height} = this.game.screen;
    ctx.fillStyle = 'rgb(194, 195, 203)';
    ctx.fillRect(0, 0, width, height);
  }
}

class Block extends Entity {
  velocity = 300;
  width = 50;
  height = 100;
  constructor(game: Game) {
    super(game);
    this.x = game.screen.width * 2;
    this.y = (game.screen.height / 2) | 0;
  }

  tick(time: number, delta: number) {
    const {width, height} = this.game.screen;
    this.x -= (delta / 1000) * this.velocity;
    if (this.x < -this.width) {
      this.height = (130 + Math.random() * 120) | 0;
      this.width = (30 + Math.random() * 20) | 0;
      this.x = (width * (1.2 + Math.random())) | 0;
      this.y =
        Math.random() < 0.2
          ? 50 + Math.random() * (height - 100)
          : Math.random() > 0.5
            ? 0
            : (height - this.height - 50) | 0;
    }
  }

  draw(ctx: OffscreenCanvasRenderingContext2D) {
    ctx.fillStyle = 'rgb(60, 87, 28)';
    ctx.fillRect(0, 0, this.width, this.height);
    // ctx.beginPath();
    // ctx.moveTo(0, 0);
    // ctx.lineTo(this.game.screen.width, endY);
    // ctx.lineTo(this.game.screen.width, this.height);
    // ctx.lineTo(0, this.height);
    // ctx.closePath();
    // ctx.fill();
  }
}

abstract class Game {
  icon = '';
  tagLine = '';
  status = signal('stopped');
  statusText = computed(() => {
    let status = `${this.tagLine} Click to start.`;
    if (this.status.value === 'running') {
      status = `Running @ ${this.fps.value | 0} FPS`;
    }
    return `   ${this.icon}   ${status}`;
  });
  clock = signal(Date.now());
  fps = signal(0);
  _renders = 0;
  _lastTick = Date.now();
  entities = signal<Entity[]>([]);
  canvas!: OffscreenCanvas;
  context!: OffscreenCanvasRenderingContext2D;
  // canvas = new OffscreenCanvas(
  //   this.screen.width / this.screen.scale,
  //   this.screen.height / this.screen.scale,
  // );
  // context = this.canvas.getContext('2d', {
  //   alpha: false,
  //   willReadFrequently: true,
  // })!;
  output = signal<string[]>([]); // lines
  controls = signal([{label: 'Start', action: 'start'}]);

  actions: Record<string, (...args: any[]) => any> = {};

  get screen() {
    return {
      scale: 10,
      width: 650,
      height: 650,
    };
  }

  constructor() {
    this.resized();
    this.action = this.action.bind(this);
    this.next = this.next.bind(this);
    // this.context.imageSmoothingEnabled = false;
    // this.context.imageSmoothingQuality = 'high';
  }

  resized() {
    this.canvas = new OffscreenCanvas(
      this.screen.width / this.screen.scale,
      this.screen.height / this.screen.scale,
    );
    this.context = this.canvas.getContext('2d', {
      alpha: false,
      willReadFrequently: true,
    })!;
    this.context.imageSmoothingEnabled = false;
    // this.context.imageSmoothingEnabled = true;
    // this.context.imageSmoothingQuality = 'high';
  }

  async action(event: Event) {
    const target = event.target as Element;
    let action = target.getAttribute('data-action') || '';
    let args = [];
    const m = action.match(/^([^(]+)(?:\((.*?)\))?$/);
    if (m) {
      action = m[1]!;
      args = JSON.parse(`[${m[2] || ''}]`);
    }
    const fn = this.actions[action] || (this as any)[action];
    if (fn) await fn.apply(this, args);
    for (const entity of this.entities.peek()) {
      if (entity.respond?.(event, action) === true) {
        break;
      }
    }
  }

  start() {
    this.status.value = 'running';
    this.next();
  }

  stop() {
    this.status.value = 'stopped';
    this.controls.value = [{label: 'Start', action: 'start'}];
  }

  next() {
    if (this.status.value !== 'running') return;
    const now = Date.now();
    const delta = now - this.clock.peek();
    this.clock.value = now;
    this._renders++;
    const ctx = this.context;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.save();
    const scale = 1 / this.screen.scale;
    ctx.scale(scale, scale);
    const entities = this.entities.value;
    for (const entity of entities) {
      entity.tick?.(now, delta);
      if (entity.collidesWith !== Entity.prototype.collidesWith) {
        for (const other of entities) {
          if (
            other !== entity &&
            entity.collidesWith(other) &&
            entity._isIntersecting(other)
          ) {
            // collision
            entity.collision(other);
          }
        }
      }
    }
    for (const entity of entities) {
      ctx.save();
      // ctx.moveTo(entity.x.peek(), entity.y.peek());
      ctx.translate(entity.x, entity.y);
      entity.draw?.(ctx);
      ctx.resetTransform();
      ctx.restore();
    }
    ctx.resetTransform();
    ctx.restore();
    this.flush();
    if (now - this._lastTick >= 1000) {
      const fps = this._renders / ((now - this._lastTick) / 1000);
      this.fps.value = fps;
      this._renders = 0;
      this._lastTick = Date.now();
    }
    setTimeout(this.next, 10);
  }

  colors = [
    [255, 255, 255, '🗯️'],
    [217, 217, 217, '⬜️'],
    [194, 195, 203, '🌫️'],
    [170, 170, 170, '📰'],
    [134, 134, 134, '🩶'],
    [126, 125, 124, '🪦'],
    [110, 110, 104, '🪨'],
    [72, 77, 96, '🌚'],
    [40, 54, 81, '🌑'],
    [33, 33, 33, '🖤'],
    [0, 0, 0, '⬛️'],
    [78, 51, 39, '💼'],
    [115, 63, 28, '🟫'],
    [174, 116, 76, '🟤'],
    [191, 100, 60, '🏈'],
    [177, 128, 86, '📦'],
    [188, 161, 121, '📜'],
    [238, 152, 17, '🩳'],
    [245, 211, 178, '🤲🏻'],
    [222, 181, 143, '🤲🏼'],
    [187, 140, 103, '🤲🏽'],
    [153, 97, 59, '🤲🏾'],
    [88, 66, 56, '🤲🏿'],
    [231, 172, 121, '🧅'],
    [240, 184, 171, '🐷'],
    [251, 153, 183, '🧠'],
    [221, 104, 147, '🎀'],
    [255, 191, 59, '🌞'],
    [190, 149, 83, '🥠'],
    [237, 200, 113, '📔'],
    [233, 228, 216, '🦷'],
    [224, 220, 213, '🥚'],
    [201, 197, 188, '🧻'],
    [60, 87, 28, '🫑'],
    [170, 172, 63, '🍐'],
    [2, 177, 1, '🟩'],
    [215, 217, 149, '🍈'],
    [249, 236, 121, '🌝'],
    [253, 224, 58, '🌕'],
    [242, 188, 0, '🟨'],
    [255, 139, 4, '🟧'],
    [181, 71, 15, '🧶'],
    [244, 125, 63, '🍑'],
    [197, 64, 21, '🍅'],
    [169, 34, 21, '🟥'],
    [223, 88, 75, '🛑'],
    [241, 64, 173, '🩷'],
    [186, 48, 255, '🟪'],
    [2, 93, 242, '🟦'],
    [141, 228, 255, '🩵'],
    [204, 255, 255, '💠'],
  ] as const;

  flush() {
    const {context, canvas, colors} = this;
    const w = canvas.width;
    const h = canvas.height;
    const data = context.getImageData(0, 0, w, h).data;
    let px = 0;

    const color = (r: number, g: number, b: number) => {
      let closest = -1;
      let closestChar;
      for (const [cr, cg, cb, char] of colors) {
        const dist = Math.sqrt((cr - r) ** 2 + (cg - g) ** 2 + (cb - b) ** 2);
        if (closest === -1 || dist < closest) {
          closest = dist;
          closestChar = char;
        }
      }
      return closestChar;
    };

    const out: string[] = [];
    // Loop through the pixels
    for (let ih = 0; ih < h; ih++) {
      let chars = '';
      for (let iw = 0; iw < w; iw++) {
        let r = data[px++]!;
        let g = data[px++]!;
        let b = data[px++]!;
        px++; // no alpha
        const char = color(r, g, b);
        chars += char;
      }
      out.push(chars);
    }

    // console.clear();
    // console.log('%c' + out.join('\n'), 'font-size: 6px;');

    this.output.value = out;
  }
}

class FlappyBird extends Game {
  icon = '🐧';
  tagLine = 'A fun game.';

  start() {
    this.controls.value = [{label: 'Flap', action: 'flap'}];
    this.entities.value = [
      new Background(this),
      new Sky(this),
      new Ground(this),
      new Block(this),
      new Bird(this),
    ];
    super.start();
  }
}

class Cam extends Game {
  icon = '📸';
  frame: ImageBitmap | null = null;
  input = signal<string>('');
  devices: MediaDeviceInfo[] = [];
  statusText = computed(() => {
    let status = `Click to start.`;
    if (this.status.value === 'running') {
      const device = this.devices.find((d) => d.deviceId === this.input.value);
      status = `${(device?.label || '...').replace(/ \(.*?\)$/, '')} (${this.fps.value | 0}FPS)`;
    }
    return `   ${this.icon}   ${status}`;
  });

  stream?: {stop: () => void};
  async setup() {
    this.devices = await api.enumerateDevices();
    const {deviceId} = this.devices[0]!;
    this.input.value = deviceId;
    this.stream = await api.getUserMedia(
      (frame: ImageBitmap) => {
        const last = this.frame;
        this.frame = frame;
        if (frame.width !== last?.width || frame.height !== last?.height)
          this.resized();
        last?.close();
      },
      {deviceId},
    );
    this.controls.value = [
      {
        label: 'Switch Camera',
        action: 'nextinput',
      },
    ];
  }
  nextinput() {
    const index =
      this.devices.findIndex((d) => d.deviceId === this.input.value) + 1;
    const deviceId = this.devices[index % this.devices.length]!.deviceId;
    this.input.value = deviceId;
    this.stream?.switchDevice(deviceId);
  }

  start() {
    super.start();
    this.setup();
    this.entities.value = [
      new (class extends Entity {
        declare game: Cam;
        draw(ctx: OffscreenCanvasRenderingContext2D) {
          const frame = this.game.frame;
          const size = this.game.screen.height;
          if (!frame) return;
          const min = Math.min(frame.width, frame.height);
          const scale = size / min;
          const width = (frame.width * scale) | 0;
          const height = (frame.height * scale) | 0;
          ctx.scale(-1, 1);
          // ctx.filter = 'blur(1px)';
          ctx.drawImage(
            frame,
            -((size - width) / 2) | 0,
            ((size - height) / 2) | 0,
            -width,
            height,
          );
        }
      })(this),
    ];
  }
}

const flappyBird = new FlappyBird();

const cam = new Cam();

function App() {
  return (
    <ui-stack spacing>
      <Renderer game={flappyBird} />
      <Line />
      <Renderer game={cam} />
    </ui-stack>
  );
}

const Line = () => (
  <ui-text monospace>
    - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  </ui-text>
);

function Renderer({game}: {game: Game}) {
  return (
    <ui-stack>
      <ui-text>
        {game.controls.value.map(({label, action}) => (
          <ui-button data-action={action} onpress={game.action}>
            {label}
          </ui-button>
        ))}
        <ui-text>{game.statusText}</ui-text>
      </ui-text>
      <ui-stack spacing={false}>
        {game.output.value.map((line) => (
          <ui-text monospace>{line}</ui-text>
        ))}
      </ui-stack>
    </ui-stack>
  );
}
