import {createProject, quiltPackage} from '@quilted/craft';

export default createProject((project) => {
  project.use(
    quiltPackage({
      react: {importSource: 'preact'},
    }),
  );
});
