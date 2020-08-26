import {createRemoteRoot} from '../root';

describe('root', () => {
  describe('createComponent', () => {
    it('does not throw error when no allowed components are set', () => {
      const root = createRemoteRoot(() => {});

      expect(() => {
        root.createComponent('Card');
      }).not.toThrowError();
    });

    it('does not throw error for allowed components', () => {
      const components = ['Card'];
      const root = createRemoteRoot(() => {}, {components});

      expect(() => {
        root.createComponent('Card');
      }).not.toThrowError();
    });

    it('throws error for not allowed components', () => {
      const components = ['Card'];
      const root = createRemoteRoot(() => {}, {components});

      expect(() => {
        root.createComponent('Button');
      }).toThrowError();
    });

    it('throws error when empty components is set', () => {
      const components: string[] = [];
      const root = createRemoteRoot(() => {}, {components});

      expect(() => {
        root.createComponent('Button');
      }).toThrowError();
    });
  });

  describe('createText', () => {
    it('does not throw error when appending a child created by the remote root', () => {
      const components: string[] = [];
      const root = createRemoteRoot(() => {}, {components});

      expect(() => {
        root.createText();
      }).not.toThrowError();
    });
  });

  describe('appendChild', () => {
    it('does not throw error when appending a child created by the remote root', () => {
      const root = createRemoteRoot(() => {});

      expect(() => {
        const card = root.createComponent('Card');
        root.appendChild(card);
      }).not.toThrowError();
    });

    it('throws error when appending a child not created by the remote root', () => {
      const root = createRemoteRoot(() => {});

      expect(() => {
        const card = {} as any;
        root.appendChild(card);
      }).toThrowError();
    });
  });

  describe('insertChildBefore', () => {
    it('does not throw error when calling insertChildBefore for a component created by the remote root', () => {
      const root = createRemoteRoot(() => {});

      expect(() => {
        const card = root.createComponent('Card');
        const image = root.createComponent('Image');
        root.appendChild(image);
        root.insertChildBefore(card, image);
      }).not.toThrowError();
    });

    it('throws error when calling insertChildBefore for a component not created by the remote root', () => {
      const root = createRemoteRoot(() => {});

      expect(() => {
        const card = root.createComponent('Card');
        const button = {} as any;
        root.appendChild(card);
        root.insertChildBefore(button, card);
      }).toThrowError();
    });
  });
});
