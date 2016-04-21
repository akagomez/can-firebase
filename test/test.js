import QUnit from "steal-qunit";
import Firebase from 'firebase';
import canFirebase from 'can-firebase';

var db = new Firebase('can-firebase.firebaseio.com');

QUnit.module('can-firebase', {
  beforeEach: function () {
    // Empty the database
    db.remove();
  }
});

QUnit.test('Saving a new model creates a child', function (assert) {

  // Get a reference to the `todos` child in the database
  var todosRef = db.child('todos');

  // Configure a Firebase backed Model to use the referenced
  // `todos` child for storage
  var Todo = canFirebase.Model.extend({
    ref: todosRef
  }, {});

  // Create an instance of the Firebase backed Model
  var todo = new Todo({
    name: 'Hop'
  });
  var done = assert.async();
  var todoRef;

  // Save the instance
  todo.save().then(function (todo) {

    QUnit.ok(todo instanceof Todo, 'Resolves to an instance of Todo');
    QUnit.equal(todo.attr('name'), 'Hop', 'Name matches created todo');
    QUnit.ok(todo.attr('id'), 'Has an id property');

    // Get a reference to the created child using the returned `id`
    todoRef = todosRef.child(todo.attr('id'));

    // Get the properties of the returned child
    todoRef.once('value', function (snapshot) {

      var persistedTodo = snapshot.val();
      var clientTodo = todo.serialize();

      // NOTE: Firebase does not return the `id` of the child as a property
      delete clientTodo.id;

      QUnit.deepEqual(persistedTodo, clientTodo,
        'Persisted properties match instance properties');

      done();
    });
  });
});
