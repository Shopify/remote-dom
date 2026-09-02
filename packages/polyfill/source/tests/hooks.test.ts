import {HOOKS, type Hooks, Window} from '../index.ts';

import {expect, expectTypeOf, it, vi} from 'vitest';

type CommentNode = ReturnType<Document['createComment']>;
type HookParameters<Hook extends (...args: any[]) => unknown> =
  Parameters<Hook>;

it('types comment creation for handling hooks', () => {
  expectTypeOf<CommentNode>().toMatchTypeOf<
    HookParameters<Hooks['setText']>[0]
  >();
  expectTypeOf<CommentNode>().toMatchTypeOf<
    HookParameters<Hooks['insertChild']>[1]
  >();
  expectTypeOf<CommentNode>().toMatchTypeOf<
    HookParameters<Hooks['removeChild']>[1]
  >();
});

it('calls handling hooks for comments', () => {
  const window = new Window();
  Window.setGlobalThis(window);

  const insertChild = vi.fn();
  const removeChild = vi.fn();
  const setText = vi.fn();

  window[HOOKS].insertChild = insertChild;
  window[HOOKS].removeChild = removeChild;
  window[HOOKS].setText = setText;

  const parent = document.createElement('div');
  const comment = document.createComment('Comment');

  parent.appendChild(comment);
  comment.data = 'Updated comment';
  parent.removeChild(comment);

  expect(insertChild).toHaveBeenCalledWith(parent, comment, 0);
  expect(setText).toHaveBeenCalledWith(comment, 'Updated comment');
  expect(removeChild).toHaveBeenCalledWith(parent, comment, 0);
});
