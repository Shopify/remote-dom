import {beforeEach, describe, expect, it} from 'vitest';

import {Window} from '../index.ts';

let window: Window;

beforeEach(() => {
  window = new Window();
  Window.setGlobalThis(window);
});

describe('Event cancellation', () => {
  it('returns true when the event is not canceled', () => {
    const target = new window.EventTarget();

    expect(target.dispatchEvent(new window.Event('event'))).toBe(true);
  });

  it('returns false when a cancelable event is canceled', () => {
    const target = new window.EventTarget();
    const event = new window.Event('event', {cancelable: true});
    target.addEventListener('event', (event) => event.preventDefault());

    expect(target.dispatchEvent(event)).toBe(false);
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not cancel a non-cancelable event', () => {
    const target = new window.EventTarget();
    const event = new window.Event('event');
    target.addEventListener('event', (event) => event.preventDefault());

    expect(target.dispatchEvent(event)).toBe(true);
    expect(event.defaultPrevented).toBe(false);
  });

  it('returns the cancellation result when propagation is stopped', () => {
    const target = new window.EventTarget();
    target.addEventListener(
      'event',
      (event) => {
        event.preventDefault();
        event.stopPropagation();
      },
      true,
    );

    expect(
      target.dispatchEvent(new window.Event('event', {cancelable: true})),
    ).toBe(false);
  });

  it('returns true when propagation is stopped without cancellation', () => {
    const target = new window.EventTarget();
    target.addEventListener('event', (event) => event.stopPropagation());

    expect(target.dispatchEvent(new window.Event('event'))).toBe(true);
  });

  it('cancels cancelable events for falsy returnValue assignments', () => {
    for (const value of [false, 0, '', null, undefined]) {
      const event = new window.Event('event', {cancelable: true});

      (event as any).returnValue = value;

      expect(event.defaultPrevented).toBe(true);
      expect(event.returnValue).toBe(false);
    }
  });

  it('does not cancel or uncancel events for truthy returnValue assignments', () => {
    for (const value of [true, 1, 'false', {}]) {
      const event = new window.Event('event', {cancelable: true});

      (event as any).returnValue = value;

      expect(event.defaultPrevented).toBe(false);
      expect(event.returnValue).toBe(true);

      event.preventDefault();
      (event as any).returnValue = value;

      expect(event.defaultPrevented).toBe(true);
      expect(event.returnValue).toBe(false);
    }
  });

  it('does not cancel non-cancelable events through falsy returnValue', () => {
    for (const value of [false, 0, '', null, undefined]) {
      const event = new window.Event('event');

      (event as any).returnValue = value;

      expect(event.defaultPrevented).toBe(false);
      expect(event.returnValue).toBe(true);
    }
  });
});
