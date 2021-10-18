import {Component} from '../Component';

import {shallowDiffers} from './utilities';

// Gets tripped up by us *creating* React instead of *using* React.
/* eslint-disable @shopify/react-initialize-state */

/**
 * Component class with a predefined `shouldComponentUpdate` implementation
 */
export class PureComponent<P = {}, S = {}> extends Component<P, S> {
  // Some third-party libraries check if this property is present
  isPureReactComponent = true;

  shouldComponentUpdate(props: P, state: S) {
    return (
      shallowDiffers(this.props, props) || shallowDiffers(this.state, state)
    );
  }
}

/* eslint-enable @shopify/react-initialize-state */
