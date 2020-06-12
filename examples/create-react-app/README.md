# Create React App + remote-ui

This repo demonstrates how to incorporate a few different `@remote-ui` libraries into an app bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Navigating this example

The entrypoint for the application is [the `WorkerRenderer`](src/WorkerRenderer.tsx) component. This component uses the tools provided by [`@remote-ui/web-workers`](../packages/web-workers) to construct a web worker [sandbox](src/sandbox.ts). This sandbox is controlled by the app, and will run the third-party code. The [app entry point](src/index.tsx) provides a script URL for the `WorkerRenderer` to run. This example is [hosted in the repo](worker/example.tsx) and uses the [custom React renderer from `@remote-ui/react`](../packages/react), but could be any URL for a valid JavaScript file that uses the [API our application makes available in the worker context](worker/api). Finally, the `WorkerRenderer` component uses the hooks and components from [`@remote-ui/react/host`](../packages/react) to instantiate the sandbox, run the remote JavaScript file, and map the component definitions to [host-side React implementations](src/components.tsx).

Because `@remote-ui/web-workers` requires custom Webpack configuration, this example uses [react-app-rewired](https://github.com/timarney/react-app-rewired/), which allows setting custom configuration through the [config-overrides file](config-overrides.js).

This example illustrates many of the same concepts as the [comprehensive example](../documentation/comprehensive-example). That guide provides a more detailed explanation on the role of the different remote-ui libraries.

## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.
