import can from 'can/util/';
import Model from 'can/model/';

var FirebaseModel = Model.extend({
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
    delete data[this.id];

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
  },
  findAll: function (queryParams) {
    var query = this.ref;
    var queryTypes = {
      order: ['orderByChild', 'orderByKey', 'orderByValue', 'orderByPriority'],
      limit: ['limitToFirst', 'limitToLast', 'limit'],
      range: ['startAt', 'endAt', 'equalTo']
    };
    var orderType;

    can.each(queryTypes, function (methods, type) {
      can.each(methods, function (method) {
        if (method in queryParams) {
          if (type === 'order') {
            orderType = method;
          }

          var params = can.makeArray(queryParams[method]);

          query = query[method].apply(query, params);
        }
      });
    });

    return Promise.resolve(new this.List(query, orderType));
  }
}, {
  setup: function () {
    Model.prototype.setup.apply(this, arguments);

    this.bind(this.constructor.id, this._idChange);

    if (typeof this[this.constructor.id] !== 'undefined') {
      // TODO: Find a better way
      this._idChange(null, this[this.constructor.id]);
    }

    delete this._init; // Because sort.js does this
  },
  destroy: function () {
    var ref = this.constructor.ref;
    var id = this.attr(this.constructor.id);
    var child = ref.child(id);
    var childValueHandler = this._childValueHandler;

    return Model.prototype.destroy.apply(this, arguments).then(function (model) {
      child.off('value', childValueHandler);
      return model;
    });
  },
  getRef: function () {
    var id = this.attr(this.constructor.id);
    return id && this.constructor.ref.child(id);
  },
  _idChange: function (ev, newVal, oldVal) {
    var ref = this.constructor.ref;
    var newChild = newVal && ref.child(newVal);
    var oldChild = oldVal && ref.child(oldVal);

    if (oldChild) {
      oldChild.off('value', this._childValueHandler);
    }

    if (newChild) {
      this._childValueHandler = can.proxy(this._childValueChange, this);
      newChild.on('value', this._childValueHandler);
    }
  },
  _childValueChange: function (snapshot) {
    this.attr(can.extend({
      id: this.attr(this.constructor.id) // Set the id
    }, snapshot.val()), true); // Replace others
  }
});

FirebaseModel.List = Model.List.extend({}, {
  setup: function () {
    // Exclude arguments
    Model.List.prototype.setup.apply(this);
  },
  init: function (query, orderType) {
    this.query = query;
    this.orderType = orderType;
  },
  bind: function () {
    var context = this;
    var bindResult = Model.List.prototype.bind.apply(this, arguments);
    var eventMap = {
      'child_added': this._childAdded,
      'child_removed': this._childRemoved
    };

    if (this._bindings > 0 && ! this._childBindings) {
      context._childBindings = {};

      can.each(eventMap, function (handler, eventName) {
        // Save a reference to each handler created
        context._childBindings[eventName] = can.proxy(handler, context);

        // Bind to the event
        context.query.on(eventName, context._childBindings[eventName]);
      });
    }

    return bindResult;
  },
  unbind: function () {
    var context = this;
    var unbindResult = Model.List.prototype.unbind.apply(this, arguments);

    if (this._bindings === 0 && this._childBindings) {
      can.each(this._childBindings, function (handler, eventName) {
        context.query.off(eventName, handler);
      });
    }

    return unbindResult;
  },
  _indexOfChildId: function (id) {
    var indexOf = -1;
    var idKey = this.constructor.id;

    this.each(function (item, index) {
      if (item.attr(idKey) === id) {
        indexOf = index;
        return false; // Stop iterating
      }
    });

    return indexOf;
  },
  _childAdded: function (snapshot, prevChildKey) {
    var data = can.extend({
      id: snapshot.key()
    }, snapshot.val());
    var model = new this.constructor.Map(data);

    if (prevChildKey === null) {
      return this.unshift(model);
    } else {
      var siblingIndex = this._indexOfChildId(prevChildKey);

      if (siblingIndex === -1) {
        return this.push(model);
      }
      else {
        return this.splice(siblingIndex + 1, 0, model);
      }
    }
  },
  _childRemoved: function (snapshot) {
    var childIndex = this._indexOfChildId(snapshot.key());

    if (childIndex > -1) {
      this.splice(childIndex, 1);
    }
  }
});

export default FirebaseModel;