// This is an entrypoint that can be used to replace imports for both react.
// It is very similar to preact/compat, except that instead of also providing
// a compatibility layer for react-dom, it provides one for @remote-ui/react.

import {
  retain,
  release,
  createRemoteRoot,
  RemoteReceiver,
} from '@remote-ui/core';

import {createElement} from '../create-element';
import {createRef} from '../create-ref';
import {isValidElement} from '../is-valid-element';
import {Fragment} from '../Fragment';
import {Component} from '../Component';
import {createContext} from '../create-context';
import {
  useState,
  useReducer,
  useMemo,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useImperativeHandle,
  useDebugValue,
} from '../hooks';

import {render} from './render';
import {Children} from './Children';
import {forwardRef} from './forward-ref';
import {memo} from './memo';
import {PureComponent} from './PureComponent';
import {
  cloneElement,
  createFactory,
  unmountComponentAtNode,
  // eslint-disable-next-line @typescript-eslint/camelcase
  unstable_batchedUpdates,
} from './uncommon';

// trick libraries to think we are react
const version = '16.8.0';

/**
 * Strict Mode is not implemented in mini-react, so we provide a stand-in for it
 * that just renders its children without imposing any restrictions.
 */
const StrictMode = Fragment;

export {
  // @remote-ui/react compatibility
  retain,
  release,
  createRemoteRoot,
  RemoteReceiver,
  render,
  // react compatibility
  version,
  cloneElement,
  createElement,
  createRef,
  createContext,
  isValidElement,
  StrictMode,
  Fragment,
  Component,
  Children,
  forwardRef,
  memo,
  PureComponent,
  createFactory,
  unmountComponentAtNode,
  // eslint-disable-next-line @typescript-eslint/camelcase
  unstable_batchedUpdates,
  useState,
  useReducer,
  useMemo,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useImperativeHandle,
  useDebugValue,
};

// More react compatibility
const React = {
  version,
  cloneElement,
  createElement,
  createRef,
  createContext,
  isValidElement,
  StrictMode,
  Fragment,
  Component,
  Children,
  forwardRef,
  memo,
  PureComponent,
  createFactory,
  unmountComponentAtNode,
  // eslint-disable-next-line @typescript-eslint/camelcase
  unstable_batchedUpdates,
  render,
  useState,
  useReducer,
  useMemo,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useImperativeHandle,
  useDebugValue,
};

export default React;
