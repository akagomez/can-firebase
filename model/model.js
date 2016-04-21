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
  }
}, {});