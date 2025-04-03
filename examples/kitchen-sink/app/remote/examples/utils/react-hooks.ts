import {useEffect, useState} from 'react';

export const useTimer = (ms: number) => {
  const [ellapsed, setEllapsed] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => {
      setEllapsed(true);
    }, ms);

    return () => {
      clearTimeout(timeout);
    };
  }, [setEllapsed]);
  return ellapsed;
};

export const useRenders = (max: number) => {
  const [renders, setRenders] = useState(1);

  useEffect(() => {
    if (renders >= max) {
      return;
    }

    const timeout = setTimeout(() => {
      setRenders((r) => r + 1);
    }, 200);

    return () => clearTimeout(timeout);
  }, [setRenders, renders]);

  return renders;
};
