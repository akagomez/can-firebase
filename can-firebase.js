import Model from './model/';

var firebasePlugin = {
  Model
};

// Register the Firebase plugin to the `can` namespace
if (typeof window !== 'undefined' && !require.resolve && window.can) {
  window.can.Firebase = firebasePlugin;
}

export default firebasePlugin;