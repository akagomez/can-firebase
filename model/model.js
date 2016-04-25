import can from 'can/util/';
import Model from 'can/model/';

export default Model.extend({
  create: function (data) {
    var dfd = new can.Deferred();

    // Create a new child
    var child = this.ref.push(data);

    // Get the persisted data
    child.once('value', function (snapshot) {

      // Add the `id` property to the data and resolve
      dfd.resolve(can.extend(snapshot.val(), {
        id: child.key()
      }));
    });

    return dfd;
  },
  update: function (id, data) {
    var dfd = new can.Deferred();

    // Don't write the `id` property to the child
    delete data.id;

    // Get a reference to the child
    var child = this.ref.child(id);

    // Update the properties of the child
    child.update(data);

    // Get the resulting data
    child.once('value', function (snapshot) {
      dfd.resolve(can.extend(snapshot.val(), {
        id: child.key()
      }));
    });

    return dfd;
  },
  destroy: function (id) {
    var dfd = new can.Deferred();

    // Get a reference to the child
    var child = this.ref.child(id);

    // Get the existing data
    child.once('value', function (snapshot) {

      // Remove the child
      child.remove();

      dfd.resolve(snapshot.val());
    });

    return dfd;
  }
}, {
  setup: function () {
    Model.prototype.setup.apply(this, arguments);
    this.bind('id', this._idChange);
    delete this._init;
  },
  _idChange: function (ev, newVal, oldVal) {
    var ref = this.constructor.ref;
    var newChild = ref.child(newVal);
    var oldChild = oldVal && ref.child(oldVal);

    if (oldChild) {
      oldChild.off('value', this._childValueHandler);
    }

    if (newChild) {
      this._childValueHandler = can.proxy(this._childValueChange, this);
      newChild.on('value', this._childValueHandler);
    }
  },
  destroy: function () {
    var ref = this.constructor.ref;
    var id = this.attr('id');
    var child = ref.child(id);
    var childValueHandler = this._childValueHandler;

    return Model.prototype.destroy.apply(this, arguments).then(function (model) {
      child.off('value', childValueHandler);
      return model;
    });
  },
  _childValueChange: function (snapshot) {
    this.attr(can.extend({
      id: this.attr('id')
    }, snapshot.val()), true); // Replace others
  }
});