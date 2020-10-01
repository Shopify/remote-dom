import {Component} from '../Component';
import {shallowDiffers} from './utilities';

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
