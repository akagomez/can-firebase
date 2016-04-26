import Model from './model/';

var firebasePlugin = {
  Model
};

// Register the Firebase plugin to the `can` namespace
if (typeof window !== 'undefined' && typeof window.can === 'object') {
  window.can.firebase = firebasePlugin;
}

export default firebasePlugin;