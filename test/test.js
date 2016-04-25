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

QUnit.test('Saving a new model creates a child', function () {

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
  var todoRef;

  QUnit.stop();

  // Save the instance
  todo.save().then(function (todo) {

    QUnit.ok(todo instanceof Todo, 'Resolves to an instance of Todo');
    QUnit.equal(todo.attr('name'), 'Hop', 'Name matches created todo');
    QUnit.ok(todo.attr('id'), 'Has an id property');

    // Get a reference to the created child  from the db
    // directly using the returned `id`
    todoRef = todosRef.child(todo.attr('id'));

    // Get the properties of the returned child
    todoRef.once('value', function (snapshot) {

      var persistedTodo = snapshot.val();
      var clientTodo = todo.serialize();

      // NOTE: Firebase does not return the `id` of the child as a property
      delete clientTodo.id;

      // Check that the properties match
      QUnit.deepEqual(persistedTodo, clientTodo,
        'Persisted properties match instance properties');

      QUnit.start();
    });
  });
});

QUnit.test('Saving an existing model updates the existing child', function () {

  // Get a reference to the `todos` child in the database
  var todosRef = db.child('todos');

  // Configure a Firebase backed Model to use the referenced
  // `todos` child for storage
  var Todo = canFirebase.Model.extend({
    ref: todosRef
  }, {});

  // Create an instance of the Firebase backed Model
  var todo = new Todo({
    name: 'Hop',
    completed: false
  });
  var createdTodo, todoRef;

  QUnit.stop();

  // Save the instance
  todo.save().then(function (todo) {

    createdTodo = todo;
    todo.attr('completed', true);

    // Save the instance again
    return todo.save();
  }).then(function (todo) {

    QUnit.ok(createdTodo === todo,
      'Both the saved and updated instances are the same');
    QUnit.equal(todo.attr('completed'), true,
      'The completed property was changed');

    // Get a reference to the created child  from the db
    // directly using the returned `id`
    todoRef = todosRef.child(todo.attr('id'));

    // Get the properties of the returned child
    todoRef.once('value', function (snapshot) {

      var persistedTodo = snapshot.val();
      var clientTodo = todo.serialize();

      // NOTE: Firebase does not return the `id` of the child as a property
      delete clientTodo.id;

      // Check that the properties match
      QUnit.deepEqual(persistedTodo, clientTodo,
        'Persisted properties match instance properties');

      todosRef.once('value', function (snapshot) {

        // Check that we haven't created a new child
        QUnit.equal(snapshot.numChildren(), 1, 'Only one child exists');

        QUnit.start();
      });
    });
  });
});

QUnit.test('Deleting an existing model removes the child', function () {
  // Get a reference to the `todos` child in the database
  var todosRef = db.child('todos');

  // Configure a Firebase backed Model to use the referenced
  // `todos` child for storage
  var Todo = canFirebase.Model.extend({
    ref: todosRef
  }, {});

  // Create an instance of the Firebase backed Model
  var todo = new Todo({
    name: 'Hop',
    completed: false
  });
  var createdTodo, todoRef;

  QUnit.stop();

  // Save the instance
  todo.save().then(function (todo) {
    createdTodo = todo;

    // Destroy the instance
    return todo.destroy();
  }).then(function (todo) {
    QUnit.ok(createdTodo === todo,
      'Both the saved and destroyed instances are the same');

    // Get a reference to the created child  from the db
    // directly using the returned `id`
    todoRef = todosRef.child(todo.attr('id'));

    // Get the properties of the returned child
    todoRef.once('value', function (snapshot) {
      QUnit.equal(snapshot.exists(), false, 'Child does not exists');
      QUnit.start();
    });
  });
});

QUnit.test('Changes to the child are reflected in the model', function () {
  // Get a reference to the `todos` child in the database
  var todosRef = db.child('todos');

  // Configure a Firebase backed Model to use the referenced
  // `todos` child for storage
  var Todo = canFirebase.Model.extend({
    ref: todosRef
  }, {});

  // Create an instance of the Firebase backed Model
  var todo = new Todo({
    name: 'Hop',
    completed: false
  });
  var todoRef;

  QUnit.stop();

  // Save the instance
  todo.save().then(function (todo) {

    // Get a reference to the created child  from the db
    // directly using the returned `id`
    todoRef = todosRef.child(todo.attr('id'));

    // Update the db directly
    todoRef.update({
      completed: true
    });

    // Check that the model was updated
    QUnit.equal(todo.attr('completed'), true,
      'Child change was synced to the model');

    QUnit.start();
  });
});