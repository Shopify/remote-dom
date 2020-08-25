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

  describe('appendChild', () => {
    it('does not throw error for component created by appendChild', () => {
      const root = createRemoteRoot(() => {});

      expect(() => {
        const card = root.createComponent('Card');
        const button = root.createComponent('Button');
        card.appendChild(button);
        root.appendChild(card);
      }).not.toThrowError();
    });

    it('throws error for component which is not created by appendChild', () => {
      const root = createRemoteRoot(() => {});

      expect(() => {
        const card = {} as any;
        root.appendChild(card);
      }).toThrowError();
    });
  });

  describe('insertChildBefore', () => {
    it('does not throw error for component created by insertChildBefore', () => {
      const root = createRemoteRoot(() => {});

      expect(() => {
        const card = root.createComponent('Card');
        const button = root.createComponent('Button');
        const text = root.createComponent('Text');
        const image = root.createComponent('Image');
        card.appendChild(button);
        card.insertChildBefore(text, button);
        root.appendChild(image);
        root.insertChildBefore(card, image);
      }).not.toThrowError();
    });

    it('throws error for component which is not created by insertChildBefore', () => {
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
