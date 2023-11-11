export interface RemoteReceiverOptions {
  retain?(value: any): void;
  release?(value: any): void;
}
