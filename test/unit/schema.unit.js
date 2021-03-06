'use strict';

var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

var types = require('../../lib/types');
var Schema = require('../../lib/schema');

var expect = chai.expect;
chai.use(sinonChai);

describe('Unit :: Schema', function() {
  describe('Sync', function() {
    it('should default sync to true when no options', function() {
      var model = {};
      var schema = new Schema(model);
      expect(schema._sync).to.be.true;
    });

    it('should default sync to true when null', function() {
      var model = {};
      var schema = new Schema(model, { sync: null });
      expect(schema._sync).to.be.true;
    });

    it('should default sync to true when undefined', function() {
      var model = {};
      var schema = new Schema(model, { });
      expect(schema._sync).to.be.true;
    });

    it('should set sync to false when specified', function() {
      var model = {};
      var schema = new Schema(model, { sync: false });
      expect(schema._sync).to.be.false;
    });
  });

  describe('Primary key', function() {
    it('should set the primary key to field when defined in field', function() {
      var model = {
        dog_id: { type: Number, primary: true }
      };
      var schema = new Schema(model);
      expect(schema, '_primary').to.have.property('_primary')
        .which.equals('dog_id');
      expect(schema, '_flatPrimaryList').to.have.property('_flatPrimaryList')
        .which.deep.equals(['dog_id']);
    });

    it('will over ride the primary key if also set in options as string', function() {
      // TODO: Should it be doing this?
      var model = {
        dog_id: { type: Number, primary: true }
      };
      var options = {
        primary: 'cat_id'
      };
      var schema = new Schema(model, options);
      expect(schema, '_primary').to.have.property('_primary')
        .which.equals('cat_id');
      expect(schema, '_flatPrimaryList').to.have.property('_flatPrimaryList')
        .which.deep.equals(['cat_id']);
    });

    it('should set the primary key when defined in options as array', function() {
      var model = {
        dog_id: { type: Number }
      };
      var options = {
        primary: ['cat_id']
      };
      var schema = new Schema(model, options);
      expect(schema, '_primary').to.have.property('_primary')
        .which.deep.equals(['cat_id']);

      // Should this not be 'cat_id'? I think this a bug based on how _flatPrimaryList is used
      expect(schema, '_flatPrimaryList').to.have.property('_flatPrimaryList')
        .which.deep.equals(['0']);
    });

    it('should throw if primary key is set in both field and options as array', function() {
      var model = {
        dog_id: { type: Number, primary: true }
      };
      var options = {
        primary: ['cat_id']
      };

      expect(function() {
        var schema = new Schema(model, options);
      }).to.throw(/Cannot specify multiple primary keys/);
    });

    it('should set the composite key', function() {
      var model = {
        dog_id: { type: Number }
      };
      var options = {
        primary: ['dog_id', 'cat_id']
      };
      var schema = new Schema(model, options);
      expect(schema, '_primary').to.have.property('_primary')
        .which.deep.equals(['dog_id', 'cat_id']);

      // Should this not be ['dog_id', 'cat_id']? I think this a bug based on how _flatPrimaryList is used
      expect(schema, '_flatPrimaryList').to.have.property('_flatPrimaryList')
        .which.deep.equals(['0', '1']);
    });

    it('should set the composite and partition keys', function() {
      var model = {
        dog_id: { type: Number }
      };
      var options = {
        primary: [['dog_id', 'cat_id'], 'fish_id']
      };
      var schema = new Schema(model, options);
      expect(schema, '_primary').to.have.property('_primary')
        .which.deep.equals([['dog_id', 'cat_id'], 'fish_id']);

      // Should this not be ['dog_id', 'cat_id', 'fish_id']? I think this a bug based on how _flatPrimaryList is used
      expect(schema, '_flatPrimaryList').to.have.property('_flatPrimaryList')
        .which.deep.equals(['0', '1']);
    });

    it('should set the primary key to id if none provided', function() {
      var model = {
        dog_id: { type: Number }
      };
      var options = {};
      var schema = new Schema(model, options);
      expect(schema, '_primary').to.have.property('_primary')
        .which.equals('id');
      expect(schema, '_flatPrimaryList').to.have.property('_flatPrimaryList')
        .which.deep.equals(['id']);
    });

    it('should create id field if no primary key is provided', function() {
      var model = {
        dog_id: { type: Number }
      };
      var options = {};
      var schema = new Schema(model, options);
      expect(schema).to.have.property('_fields')
        .which.has.property('id')
        .that.deep.equals({
          type: types.datatypes.uuid,
          primary: true,
        });
    });

    it('should throw if id field exists and no primary key is provided', function() {
      var model = {
        id: { type: Number }
      };
      var options = {};
      expect(function() {
        var schema = new Schema(model, options);
      }).to.throw(/must specify a primary key/);
    });
  });

  describe('Fields', function () {
    it('should set fields to the model fields', function () {
      var model = {
        dog_id: { type: Number, primary: true },
        breed: { type: String }
      };
      var schema = new Schema(model);
      expect(schema).to.have.property('_fields')
        .which.deep.equals(model);
    });

    it('should add a validator for each field', function () {
      var model = {
        dog_id: { type: Number, primary: true },
        breed: { type: String }
      };
      var schema = new Schema(model);
      expect(schema).to.have.property('validators')
        .which.deep.equals({
          dog_id: [],
          breed: []
        }, schema.validators);
    });

    it('should add default required validator for each required field', function () {
      var model = {
        dog_id: { type: Number, primary: true, required: true },
        breed: { type: String },
      };
      var schema = new Schema(model);
      expect(schema).to.have.property('validators');
      expect(schema.validators).to.have.property('dog_id');
      expect(schema.validators.dog_id[0]).to.have.property('func')
        .and.is.a('function');
      expect(schema.validators.dog_id[0]).to.have.property('str')
        .which.equals('Field: dog_id is required.');
    });
  });

  describe('Create Options', function () {
    it('should set create options to undefined if not set', function () {
      var model = {
        dog_id: { type: Number, primary: true },
        breed: { type: String }
      };
      var schema = new Schema(model);
      expect(schema).to.have.property('_createOptions')
        .which.is.undefined;
    });

    it('should set create options to if set', function () {
      var model = {
        dog_id: { type: Number, primary: true },
        breed: { type: String }
      };
      var schema = new Schema(model, { create_options: 42 });
      expect(schema).to.have.property('_createOptions')
        .which.equals(42);
    });
  });

  describe('PRE', function () {
    var model = {
      dog_id: { type: Number, primary: true },
      breed: { type: String }
    };
    var hook = function () {};

    it('should throw if invalid pre hook', function() {
      // TODO: Should throw Error objects not strings
      var schema = new Schema(model);
      expect(function() {
        schema.pre('invalid', hook)
      }).to.throw(/only supports/);
    });

    it('should add a pre save hook', function() {
      var schema = new Schema(model);
      schema.pre('save', hook);
      expect(schema).to.have.property('preFunctions')
        .which.has.property('save')
        .that.includes(hook);
    });

    it('should add a pre remove hook', function() {
      var schema = new Schema(model);
      schema.pre('remove', hook);
      expect(schema).to.have.property('preFunctions')
        .which.has.property('remove')
        .that.includes(hook);
    });
  });

  describe('POST', function () {
    var model = {
      dog_id: { type: Number, primary: true },
      breed: { type: String }
    };
    var hook = function () {};

    it('should throw if invalid post hook', function() {
      // TODO: Should throw Error objects not strings
      var schema = new Schema(model);
      expect(function() {
        schema.post('invalid', hook)
      }).to.throw(/only supports/);
    });

    it('should add a post save hook', function() {
      var schema = new Schema(model);
      schema.post('save', hook);
      expect(schema).to.have.property('postFunctions')
        .which.has.property('save')
        .that.includes(hook);
    });

    it('should add a post remove hook', function() {
      var schema = new Schema(model);
      schema.post('remove', hook);
      expect(schema).to.have.property('postFunctions')
        .which.has.property('remove')
        .that.includes(hook);
    });

    it('should add a post validate hook', function() {
      var schema = new Schema(model);
      schema.post('validate', hook);
      expect(schema).to.have.property('postFunctions')
        .which.has.property('validate')
        .that.includes(hook);
    });

    it('should add a post init hook', function() {
      var schema = new Schema(model);
      schema.post('init', hook);
      expect(schema).to.have.property('postFunctions')
        .which.has.property('init')
        .that.includes(hook);
    });
  });

  describe('Validate', function () {
    var model = {
      dog_id: { type: Number, primary: true },
      breed: { type: String }
    };
    var validator = function () {};

    it('should add validator to field', function() {
      var schema = new Schema(model);
      schema.validate('breed', validator, 'Breed is not cool enough');
      expect(schema).to.have.property('validators');
      expect(schema.validators).to.have.property('breed');
      expect(schema.validators.breed[0]).to.have.property('func')
        .and.is.a('function');
      expect(schema.validators.breed[0]).to.have.property('str')
        .which.equals('Breed is not cool enough');
    });

    it('should add validator to non-existing field', function() {
      // TODO: Wonder if it should actually throw in this case
      var schema = new Schema(model);
      schema.validate('age', validator, 'Dog is to old');
      expect(schema).to.have.property('validators');
      expect(schema.validators).to.have.property('age');
      expect(schema.validators.age[0]).to.have.property('func')
        .and.is.a('function');
      expect(schema.validators.age[0]).to.have.property('str')
        .which.equals('Dog is to old');
    });
  });

  describe('Add', function () {
    var model = {
      dog_id: { type: Number, primary: true },
      breed: { type: String }
    };

    it('should add a new field to the model', function () {
      var schema = new Schema(model);
      expect(schema).to.have.property('_fields')
        .which.have.all.keys('dog_id', 'breed');

      schema.add({ age: Number });
      expect(schema).to.have.property('_fields')
        .which.have.all.keys('dog_id', 'breed', 'age');
      expect(schema._fields.age).to.equal(Number);
    });

    it('should not add field as primary', function () {
      // TODO: Maybe we should throw here? Fail fast and all that
      var schema = new Schema(model);
      expect(schema).to.have.property('_fields')
        .which.have.all.keys('dog_id', 'breed');

      schema.add({ age: { type: Number, primary: true } });
      expect(schema).to.have.property('_fields')
        .which.have.all.keys('dog_id', 'breed', 'age');
      expect(schema._fields.age).to.deep.equals({
        type: Number,
        primary: false
      });
    });

    it('should over write existing fields', function () {
      var schema = new Schema(model);
      expect(schema).to.have.property('_fields')
        .which.have.all.keys('dog_id', 'breed');
      expect(schema._fields.breed).to.deep.equals({ type: String });

      schema.add({ breed: { type: Number } });
      expect(schema).to.have.property('_fields')
        .which.have.all.keys('dog_id', 'breed');
      expect(schema._fields.breed).to.deep.equals({ type: Number });
    });
  });

  describe('Add Query', function () {
    var model = {
      dog_id: { type: Number, primary: true },
      breed: { type: String }
    };

    it('should not add the query if not a function', function () {
      // TODO: Should this not throw?
      var schema = new Schema(model);
      schema.addQuery({ get: 42 });
      expect(schema).to.have.property('_addQueries')
        .which.deep.equals({});
    });

    it('should add custom query', function () {
      var get = function() {};
      var schema = new Schema(model);
      schema.addQuery({ get: get });
      expect(schema).to.have.property('_addQueries')
        .which.has.property('get')
        .that.equals(get);
    });
  });

  describe('Index', function () {
    //TODO: If index is invalid we just log, should we not throw?

    it('should set field\'s index to true', function() {
      var model = {
        dog_id: { type: Number, primary: true },
        breed: { type: String }
      };
      var schema = new Schema(model);
      schema.index('breed');
      expect(schema).to.have.property('_fields')
        .which.has.property('breed')
        .that.has.property('index')
        .which.is.true;
    });

    it('should set field\'s index to true when field is just Type', function() {
      var model = {
        dog_id: { type: Number, primary: true },
        breed: String
      };
      var schema = new Schema(model);
      schema.index('breed');
      expect(schema).to.have.property('_fields')
        .which.has.property('breed')
        .that.has.property('index')
        .which.is.true;
    });
  });

  describe('Virtual', function () {
    // TODO: If field does not exist we just log, should we rather throw in this case?
    // TODO: If we forget to pass in the virtual function we just log, should we throw??

    it('should add the virtual field', function () {
      var model = {
        dog_id: { type: Number, primary: true },
        breed: { type: String }
      };
      var field = function () {}

      var schema = new Schema(model);
      schema.virtual('name', field);

      expect(schema).to.have.property('_virtuals')
        .which.has.property('name')
        .that.has.property('get')
        .which.equals(field);
    });

    it('should add the virtual field with getter and setter', function () {
      var model = {
        dog_id: { type: Number, primary: true },
        breed: { type: String }
      };
      var get = function () {}
      var set = function () {}

      var schema = new Schema(model);
      schema.virtual('name', { get: get, set: set });

      expect(schema).to.have.property('_virtuals')
        .which.has.property('name')
        .that.deep.equals({
          get: get,
          set: set
        });
    })

  });

  describe('Plugin', function () {
    it('should throw if not a function', function () {
      var model = {
        dog_id: { type: Number, primary: true },
        breed: { type: String }
      };
      var schema = new Schema(model);

      expect(function () {
        schema.plugin('oops');
      }).to.throw(/must be a function/);
    });

    it('should invoke plugin function', function () {
      var model = {
        dog_id: { type: Number, primary: true },
        breed: { type: String }
      };
      var plugin = sinon.stub();
      var options = { hello: 'world' };

      var schema = new Schema(model);
      schema.plugin(plugin, options);

      expect(plugin).to.have.been.calledOnce;
      expect(plugin).to.have.been.calledWith(schema, options);
    });
  });
});
