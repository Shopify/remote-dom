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
import {StrictMode} from './StrictMode';
import {
  cloneElement,
  createFactory,
  unmountComponentAtNode,
  unstable_batchedUpdates,
} from './uncommon';
import {version} from './version';

// More react compatibility
export const React = {
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
