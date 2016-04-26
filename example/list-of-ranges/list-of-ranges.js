import can from 'can/util/';
import Firebase from 'firebase';
import canFirebase from 'can-firebase';
import 'can/map/define/';
import 'can/view/autorender/';
import 'can/component/';

var dbRef = new Firebase('can-firebase.firebaseio.com/example/list-of-ranges');

var RangeModel = canFirebase.Model.extend({
  ref: dbRef
}, {
  define: {
    min: {
      value: function () {
        return 100 + Math.round(Math.random() * 400);
      }
    },
    max: {
      value: function () {
        return 500 + Math.round(Math.random() * 499);
      }
    },
    value: {
      value: function () {
        return this.attr('min') + Math.round(Math.random() * (this.attr('max') - this.attr('min')));
      }
    }
  }
});

can.Component.extend({
  tag: 'range-list',
  template: can.view('range-list-template'),
  viewModel: {
    define: {
      rangeListPromise: {
        get: function () {
          return RangeModel.findAll({ orderByKey: [] });
        }
      },
      rangeList: {
        get: function (lastSet, setVal) {
          this.attr('rangeListPromise').then(setVal);
        }
      }
    },
    updateValue: function (rangeModel, el) {
      rangeModel.attr('value', el.val()).save();
    },
    createRange: function () {
      var rangeModel = new RangeModel();
      this.attr('savePromise', rangeModel.save());
    },
    destroyRanges: function () {
      dbRef.remove();
    }
  }
});
