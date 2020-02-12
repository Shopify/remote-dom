import {useEffect, useRef} from 'react';
import {terminate, WorkerCreator} from '@remote-ui/web-workers';

export function useWorker<Worker>(
  creator: WorkerCreator<Worker>,
  ...args: Parameters<typeof creator>
) {
  const workerRef = useRef<ReturnType<typeof creator>>(null as any);

  if (workerRef.current === null) {
    workerRef.current = creator(...args);
  }

  const {current: worker} = workerRef;

  useEffect(() => {
    return () => {
      terminate(worker);
    };
  }, [worker]);

  return worker;
}
