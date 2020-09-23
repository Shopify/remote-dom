// This is an entrypoint that can be used to replace imports for both react.
// It is very similar to preact/compat, except that instead of also providing
// a compatibility layer for react-dom, it provides one for @remote-ui/react.

import {
  retain,
  release,
  createRemoteRoot,
  RemoteReceiver,
} from '@remote-ui/core';

import {cloneElement} from '../clone-element';
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

export {
  // @remote-ui/react compatibility
  retain,
  release,
  createRemoteRoot,
  RemoteReceiver,
  render,
  // react compatibility
  cloneElement,
  createElement,
  createRef,
  createContext,
  isValidElement,
  Fragment,
  Component,
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
  cloneElement,
  createElement,
  createRef,
  createContext,
  isValidElement,
  Fragment,
  Component,
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
