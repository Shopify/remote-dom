// This is an entrypoint that can be used to replace imports for both react.
// It is very similar to preact/compat, except that instead of also providing
// a compatibility layer for react-dom, it provides one for @remote-ui/react.

import {retain, release, createRemoteRoot} from '@remote-ui/core';
import type {RemoteReceiver} from '@remote-ui/core';

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
import {createRemoteReactComponent} from './create-component';
import {Children} from './Children';
import {forwardRef} from './forward-ref';
import {memo} from './memo';
import {PureComponent} from './PureComponent';
import {useRemoteSubscription} from './hooks';
import {StrictMode} from './StrictMode';
import {version} from './version';
import {
  cloneElement,
  createFactory,
  unmountComponentAtNode,
  unstable_batchedUpdates,
} from './uncommon';
import {React} from './react';

export type {RemoteReceiver};
export {
  // @remote-ui/react compatibility
  retain,
  release,
  createRemoteRoot,
  render,
  createRemoteReactComponent,
  useRemoteSubscription,
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

export default React;
