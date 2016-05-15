import QUnit from "steal-qunit";
import Firebase from 'firebase';
import canFirebase from 'can-firebase';
import can from 'can/util/';

var db = new Firebase('can-firebase.firebaseio.com/tests');

QUnit.module('can-firebase', {
  beforeEach: function () {
    // Empty the test database
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

      QUnit.start();

      // NOTE: Firebase does not return the `id` of the child as a property
      delete clientTodo.id;

      // Check that the properties match
      QUnit.deepEqual(persistedTodo, clientTodo,
        'Persisted properties match instance properties');
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

        QUnit.start();

        // Check that we haven't created a new child
        QUnit.equal(snapshot.numChildren(), 1, 'Only one child exists');
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
      QUnit.start();
      QUnit.equal(snapshot.exists(), false, 'Child does not exists');
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

    QUnit.start();

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
  });
});

QUnit.test('Child value is bound when the id is set', function () {
  // Get a reference to the `todos` child in the database
  var todosRef = db.child('todos');

  // Create a child so we can get its id
  var todoRef = todosRef.push({
    name: 'Hop',
    completed: false
  });

  // Configure a Firebase backed Model to use the referenced
  // `todos` child for storage
  var Todo = canFirebase.Model.extend({
    ref: todosRef
  }, {});

  // Create an empty Firebase model instance
  var todo = new Todo();

  // Assign the todo the id of the child todo
  todo.attr('id', todoRef.key());

  // Check that the child properties were synced to the model
  QUnit.equal(todo.attr('name'), 'Hop',
    'The name property was set');
  QUnit.equal(todo.attr('completed'), false,
    'The completed property was set');

  // Update the child
  todoRef.update({
    completed: true
  });

  // Check that the model instance was updated
  QUnit.equal(todo.attr('completed'), true,
    'The completed property was updated');
});

QUnit.test('Child value is unbound when the id is removed', function () {
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

  QUnit.stop();

  // Save the model instance so that an id is set and
  // the child value is bound
  todo.save().then(function () {

    QUnit.start();

    // Will work now that the model has an id
    var todoRef = todo.getRef();

    // Change the child
    todoRef.update({
      completed: true
    });

    // Check that the model instance was updated
    QUnit.equal(todo.attr('completed'), true, 'Update was synced');

    // Remove the id
    todo.removeAttr('id');

    /// Change the child
    todoRef.update({
      name: 'Skip'
    });

    // Check that the model instance was not updated
    QUnit.notEqual(todo.attr('name'), 'Skip', 'Update was not synced');
  });
});

QUnit.test('Queries are created with findAll - orderByChild', function () {
  // Get a reference to the `todos` child in the database
  var todosRef = db.child('todos');

  // Configure a Firebase backed Model to use the referenced
  // `todos` child for storage
  var Todo = canFirebase.Model.extend({
    ref: todosRef
  }, {});

  QUnit.stop();

  // Create and save todos
  Promise.all([
    new Todo({
      name: 'Hop',
      completed: false
    }).save(),
    new Todo({
      name: 'Skip',
      completed: false
    }).save(),
    new Todo({
      name: 'Jump',
      completed: false
    }).save()
  ]).then(function () {

    // Query for items using findAll syntax
    Todo.findAll({
      orderByChild: 'name'
    }).then(function (todos) {
      var expectedNames = ['Hop', 'Jump', 'Skip'];

      QUnit.start();

      todos.forEach(function (model, index) {

        // Check the model names and indexes
        QUnit.equal(model.attr('name'), expectedNames[index],
          'Correct model added at correct index');
      });

      QUnit.equal(todos.attr('length'), 3, 'Corrrect number of items added');
    });
  });
});

QUnit.test('Queries are created with findAll - orderByKey', function () {
  // Get a reference to the `todos` child in the database
  var todosRef = db.child('todos');

  // Configure a Firebase backed Model to use the referenced
  // `todos` child for storage
  var Todo = canFirebase.Model.extend({
    ref: todosRef
  }, {});

  QUnit.stop();

  new Todo({
    name: 'Hop',
    completed: false
  }).save().then(new Todo({
    name: 'Skip',
    completed: false
  }).save()).then(new Todo({
    name: 'Jump',
    completed: false
  }).save()).then(function () {

    // Query for items using findAll syntax
    Todo.findAll({
      orderByKey: []
    }).then(function (todos) {

      var expectedNames = ['Hop', 'Skip', 'Jump'];

      QUnit.start();

      todos.forEach(function (model, index) {

        // Check the model names and indexes
        QUnit.equal(model.attr('name'), expectedNames[index],
          'Correct model added at correct index');
      });

      QUnit.equal(todos.attr('length'), 3, 'Corrrect number of items added');

    });
  });
});

QUnit.test('Models instantiated with an id bind to child value', function () {
  // Get a reference to the `todos` child in the database
  var todosRef = db.child('todos');

  // Configure a Firebase backed Model to use the referenced
  // `todos` child for storage
  var Todo = canFirebase.Model.extend({
    ref: todosRef
  }, {});

  // Create a todo child
  var todoRef = todosRef.push({
    name: 'Hop',
    completed: false
  });

  // Create a model with the same child id
  var todo = new Todo({
    id: todoRef.key()
  });

  // Check that value was bound and the initial properties set
  QUnit.equal(todo.attr('name'), 'Hop',
    'Name property was set by value event');

  todoRef.update({
    completed: true
  });

  // Check that value was bound and the updated properties set
  QUnit.equal(todo.attr('completed'), true,
    'Name property was set by value event');
});

QUnit.test('Removing a child removes the model', function () {
  // Get a reference to the `todos` child in the database
  var todosRef = db.child('todos');

  // Configure a Firebase backed Model to use the referenced
  // `todos` child for storage
  var Todo = canFirebase.Model.extend({
    ref: todosRef
  }, {});

  todosRef.push({
    name: 'Hop'
  });
  todosRef.push({
    name: 'Skip'
  });
  todosRef.push({
    name: 'Jump'
  });

  QUnit.stop();

  Todo.findAll({
    orderByKey: []
  }).then(function (todos) {

    todos.bind('remove', function () {

      QUnit.start();

      QUnit.equal(todos.attr('length'), 2, 'An item was removed');
      QUnit.equal(todos.attr('0.name'), 'Hop', 'The first item has the correct name');
      QUnit.equal(todos.attr('1.name'), 'Jump', 'The second item has the correct name');
      QUnit.ok(true, 'The correct item was removed');

      todos.unbind('remove');
    });

    var secondTodoId = todos.attr('1.id');
    todosRef.child(secondTodoId).remove();
  });
});

QUnit.test('Removing a parent removes all models', function () {
  // Get a reference to the `todos` child in the database
  var todosRef = db.child('todos');

  // Configure a Firebase backed Model to use the referenced
  // `todos` child for storage
  var Todo = canFirebase.Model.extend({
    ref: todosRef
  }, {});

  // Create a list of children
  todosRef.push({
    name: 'Hop'
  });
  todosRef.push({
    name: 'Skip'
  });
  todosRef.push({
    name: 'Jump'
  });

  QUnit.stop();

  // Query the list of children
  Todo.findAll({
    orderByKey: []
  }).then(function (todos) {

    QUnit.start();

    // Bind to query events
    todos.bind('add', can.noop);

    // Remove the parent
    todosRef.remove();

    // Check that the all models are removed from the list
    QUnit.equal(todos.attr('length'), 0, 'All items were removed');

    // Bind to query events
    todos.unbind('add');
  });
});
