import React, {useMemo, forwardRef, useRef} from 'react';

export const Button = ({
  onPress,
  children,
}: {
  onPress: () => void;
  children: React.ReactNode;
}) => (
  <button className="Button" onClick={() => onPress()} type="button">
    {children}
  </button>
);

export const File = ({onChange}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  class A {
    constructor() {
      console.log('A constructor');
    }

    testMe() {
      return 12;
    }
  }

  return (
    <input
      type="file"
      ref={fileInputRef}
      onChange={() => {
        if (fileInputRef.current && fileInputRef.current.files) {
          onChange(Array.from(fileInputRef.current.files));
        }
      }}
    />
  );
};

export const TextField = forwardRef<HTMLInputElement, {label: string}>(
  ({label}, ref) => {
    const id = useMemo(() => nanoId(), []);

    return (
      <div className="TextField">
        <label className="Label" htmlFor={id}>
          {label}
        </label>
        <div className="InputContainer">
          <input id={id} className="Input" type="text" ref={ref}></input>
          <div className="InputBackdrop"></div>
        </div>
      </div>
    );
  },
);

// @see https://github.com/ai/nanoid/blob/main/non-secure/index.js

// This alphabet uses `A-Za-z0-9_-` symbols. The genetic algorithm helped
// optimize the gzip compression for this alphabet.
const urlAlphabet =
  'ModuleSymbhasOwnPr-0123456789ABCDEFGHNRVfgctiUvz_KqYTJkLxpZXIjQW';

function nanoId(size = 21) {
  let id = '';
  // A compact alternative for `for (var i = 0; i < step; i++)`.
  let i = size;
  while (i--) {
    // `| 0` is more compact and faster than `Math.floor()`.
    id += urlAlphabet[(Math.random() * 64) | 0];
  }
  return id;
}
