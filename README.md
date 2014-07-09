Cassie
=====
Cassie is a model layer and CQL generator that uses the [node-cassandra-cql](https://github.com/jorgebay/node-cassandra-cql) project and attempts to mimic most of mongoose's API to allow for easy switching between MongoDB and Cassandra. Note that Cassie-ODM is not currently a full 1:1 mapping to mongoose's API (and probably will never be due to certain architectural differences between Cassandra and MongoDB).

Getting Started
----------
```

    var cassie = require('cassie-odm');
    var config = {keyspace: "CassieTest", hosts: ["127.0.0.1:9042"]};
    cassie.connect(config);
    
    var CatSchema = new cassie.Schema({name: String});
    var Cat = cassie.model('Cat', CatSchema);
    
    cassie.syncTables(config, function(err, results) {
    
        var kitty = new Cat({ name: 'Eevee'});
        kitty.save(function(err) {
            if(err) return console.log(err);
            console.log("meow");
            cassie.close();
        });
        
    });
    

```

Modeling
---------
Modeling is the process of defining your Schemas. Although Cassandra is a NoSQL database, it is required to make a column family with a primary key. Cassie makes this process easier by helping you organize your code by defining Schemas in a single location (for easy reference). If you do not specify a primary key, Cassie will automatically generate an 'id' key for you. Modeling also allows you to perform validations and apply pre and post hooks to your models. Finally, Cassie will actually sync your tables forward to make rapid development easier ( tables and fields that don't exist in Cassandra will be created. Cassie does not delete tables or fields as this could lead to data loss. Cassie can warn you if there are unused fields though, see the "Sync" section for more information).

```

    var cassie = require('cassie-odm'),
        Schema = cassie.Schema; //Require cassie module

    var config = {keyspace: "CassieTest", hosts: ["127.0.0.1:9042"]};
    cassie.connect(config); //Connect to local cassandra server

    //User Schema
    var UserSchema = new Schema({
        username: String,
        email: {type: String, required: true},
        hashed_password: {type: String, required: true},
        blogs: [cassie.types.uuid]});

    //Adds a validator for username
    UserSchema.validate('username', function (user) {
        return (user.username !== null);
    });

    //Add a post-save hook
    UserSchema.post('save', function (model) {
        console.log("A new user signed up!");
    });

    //Blog Schema
    var BlogSchema = new Schema({title: {type: String, required: true}, content: String, author: String});

    //Registers the schemas with cassie
    var User = cassie.model('User', UserSchema);
    var Blog = cassie.model('Blog', BlogSchema);

    //Sync the schemas with Cassandra to ensure that they exist and contain the appropriate fields (see additional notes on the limitations of syncing)
    var syncOptions = {debug: true, prettyDebug: true, warning: true};
    cassie.syncTables(config, syncOptions, function (err, results) {
        console.log(err);

        //Creates a new user
        var newUser = new User({username: 'ManBearPig', email: 'AlGore@gmail.com', hashed_password: 'Never-do-this-use-crypto-module'});

        //Asynchronous function that returns to provided callback
        newUser.save({debug: true, prettyDebug: true}, function (err, results) {
            if (err) console.log(err);

            //Creates a new blog
            var newBlog = new Blog({title: 'Global warming and Manbearpig', content: 'Half-man, half-bear, half-pig...', author: newUser.username});

            //.save() without a callback returns a Query object. Here we batch together multiple queries to execute them together
            var firstQuery = newBlog.save();

            //Note that for types other than arrays and maps, cassie tracks changes for saving, however, since blogs is an array, we need to mark it as modified
            //Also note that after running .save(), newBlog has a generated field called 'id'. This only occurs if cassie created the primary key for us (see "Primary Keys" for more info).
            newUser.blogs.push(newBlog.id);
            newUser.markModified('blogs');

            //Get second query to batch
            var secondQuery = newUser.save();

            //Run batch cql commands
            cassie.batch([firstQuery, secondQuery], {consistency: cassie.consistencies.quorum, debug: true, prettyDebug: true}, function (err, results) {
                if (err) console.log(err);

                //Close the connection since we're done
                cassie.close();
            });
        });

    });


```

The above example shows a lot of code, but is relatively simple to understand (particularly if you've used Mongoose). First, we connect to the Cassandra server. Then, we create some schemas with cassie (along with a validator for username and a post-save hook on users). After we register the Schemas with cassie, we sync the tables to make sure that Cassandra knows that they exist (see "Sync" for more information on this and the limitations of syncing). Also note that we haven't provided a primary key in any of our schemas. In general, its good practice to explicitly define a primary key in a NoSQL database (and Cassandra requires it actually). Cassie takes care of this requirement by generating a field called 'id' if we don't specify a primary key. After we call the sync tables function, we can now create users and blogs in our database. First, we create a new user and save it. Then we create a new blog and store the query to be called with some other updates. Once we've done our updates locally, we gather the queries and send them in a batch to our Cassandra server using the cassie.batch command to create our blog post and update our user. Finally, we close the connection when we're done.

Some things to note about the above example:
    First, all fields inside of models must be lowercase. This is because when creating fields in Cassandra through CQL, fields are stored without any uppercase letters. Second, never store a password in plain text, ideally, you would use the crypto module to generate a hash of the user's password and store that in your database. Finally, this data model is not very efficient for a number of reasons that would make more sense if you read through the "Data Modeling Notes" and Cassandra's documentation / architecture (not posting here for brevity).

Queries
----------
Construct and run CQL queries by passing arguments or chaining methods. See the following sections for basic CRUD operations.

CRUD (Create, Read, Update, Delete) Operations
----------
Create, Read, Update, Delete operations on Models.

Create Example (INSERT):

```

    //Create Example (assuming schemas have been defined and sync'ed - see sync for more information)
    var Cat = cassie.model('Cat', CatSchema);

    var kitten = new Cat({name: 'eevee'});
    kitten.save(function(err) {
        //Handle errors, etc.
    });

```

Read Example (SELECT):

```

    //Read Example (assuming schemas have been defined & sync'ed - see sync for more information)
    var Cat = cassie.model('Cat', CatSchema);
    
    Cat.find({id: {$in: [1234, 1235, 1236]}).exec(function(err, cats) {
        console.log(cats.toString());
    });

```

Update Example (UPDATE):
Note: Cassie internally stores a flag to know when you've modified fields - for arrays and maps, you must specified that a field has been modified using the Model.markModified('fieldName'); method though (see 'Modeling' for an example)

```

    //Update Example (assuming schemas have been defined & sync'ed - see sync for more information)

    //Create Example (assuming schemas have been defined and sync'ed - see sync for more information)
    var Cat = cassie.model('Cat', CatSchema);

    var kitten = new Cat({name: 'eevee'});
    kitten.save(function(err) {
        
        //Renaming the cat
        kitten.name = 'bambie';
        
        kitten.save(function(err) {
            //kitten has now been renamed (Cassie internally stores a flag to know when you've modified fields - for arrays and maps, you must specified that a field has been modified using the kitten.markModified('fieldName'); method though (see 'Modeling' for an example).
        });
    });


```

Delete Example (DELETE):

```

    //Delete Example (assuming schemas have been defined & sync'ed - see sync for more information)
    
    var Cat = cassie.model('Cat', CatSchema);
    
    var kitten = new Cat({name: 'eevee'});
    kitten.save(function(err) {
        
        kitten.remove(function(err) {
            //Kitten has been removed.
        });
    });
    

```


Types
----------
Cassie supports the following types. Note that arrays and Maps must have defined types.

String
Number (can specify Int by using cassie.types.Int, Double by cassie.types.Double, or Long by cassie.types.Long) - default is Int if you use Number
Date (a timestamp)
ObjectId (specified by cassie.types.ObjectId or cassie.types.uuid) - this is a uuid v4
Buffer (Cassandra stores as blobs)
Arrays (must specify internal type, like: [String])
Maps (must specify internal types, like {String: String} - arbitrary maps are not supported, use Buffers instead)

Sync
----------
Write Sync stuff.

Primary Keys
----------
Write Primary Key information.

Validations
----------
Write validation stuff.

Hooks
----------
Pre, Post hooks for save, remove. Post hooks for init & validate.

Plugins
----------
Models support plugins. Plugins allow you to share schema properties between models and allow for pre-save hooks, validations, indexes, pretty much anything you can do with a Schema.

Lightweight Transactions
----------
IF NOT EXISTS option when creating queries. Note that IF field = value is not currently supported for updates.

Time to Live (TTL)
----------
TTL option when inserting data.

Limit & Sort
----------
Limit & Sort options

Batching
----------
How to batch queries together (fewer network roundtrips).

Examples
----------
Write additional examples here. Execute Prepared, Stream

Pagination Example

Common schemas / Data models in Cassandra

Client Connections and raw queries
----------
Client connections are handled by node-cassandra-cql. Cassie encapsulates a connection internally, but you can also use the node-cassandra-cql connection directly for CQL queries:

```

    var cassie = require('cassie-odm');
    var connection = cassie.connect({keyspace: "mykeyspace", hosts: ["127.0.0.1:9042"]});
    
    connection.execute("SELECT * FROM cats", [], function(err, results) {
        if(err) return console.log(err);
        console.log("meow");
    });
    
```

Common Issues using Cassandra
----------
Write some common differences between CQL and RDBMs (SQL). What is not supported by CQL. Write some differences between Cassandra and MongoDB.

Why Cassandra
----------
Why would you want to use Cassandra with those limitations? Cassandra provides a truly distributed, fault tolerant design (kind of like auto-sharded, auto-replicated, master-master). Cassandra is designed so that if any one node goes down, you can create another node, attach it to the cluster, and retrieve the "lost" data without any downtime. Cassandra provides linearly scalable reads and writes based on the number of nodes in a cluster. In other words, when you need more reads/sec or writes/sec, you can simply add another node to the cluster. Finally, with Cassie, you get relatively easy data modeling in nodejs that compares to the ease of use of MongoDB using Mongoose (once you understand some data modeling differences).

Data Modelling Notes
----------
Write some notes on how to properly model data in Cassandra.

Session Storage
----------
See [cassie-store](http://github.com/Flux159/cassie-store) for an express compatible session store. Also has notes on how to manually create a session store.

Not yet supported (on roadmap)
----------

Cassie Side:
* Hinting - node-cassandra-cql supports hinting (if you want to use it, use the connection provided or cassie.cql)
* Paging - need to support some form of client side paging for common use case (I'm thinking primary key timestamp based?)
* Default - when adding a column, specify default value (in schema / sync)
* Optional - specify table name when creating (in schema options - should automatically sync to use that tableName)
* Collections - collection modifications (UPDATE/REMOVE collection in single query with IN clause)
* Counters are not supported by Cassie
* Stream rows - node-cassandra-cql supports it, but it was failing in Cassie's tests, so its not included
* Not on roadmap: Connecting to multiple keyspaces (ie multi-tenancy with one app) - Can currently use a new connection and manually run CQL, but can't sync over multiple keyspaces because schemas and models are tied to a single cassie instance. Current way to deal with this is to use a separate server process (ie a different express/nodejs server process) and don't do multitenancy over multiple keyspaces in the same server process.

Driver Side:
* Input Streaming - not supported by node-cassandra-cql yet
* SSL Connections - not supported by node-cassandra-cql yet
* Auto determine other hosts - not supported by node-cassandra-cql yet
* "Smart connections" - Only send CQL request to the hosts that contain the data (requires knowing about how the data is sharded)
* Possibly switch to officially supported native C/C++ driver when out of beta (would need to test performance and wrap in javascript) - https://github.com/datastax/cpp-driver

Testing & Development
----------
Pre-reqs:
Nodejs installed and a Cassandra server running on localhost:9160 (see [wiki](http://wiki) for more information on installing Cassandra).
Clone the repository and run the following from command line:

```

    npm install && npm test

```

Note: 'npm test' creates a keyspace "CassieTest" on your local Cassandra server then deletes it when done.

Get code coverage reports by running 'npm run test-coverage' (coverage reports will go into /coverage directory).

Submit pull requests for any bug fixes!

More information about Cassandra including Installation Guides, Production Setups, and Data Modeling Best Practices
----------

For information on how to Install Cassandra on a developer Mac OS X, Linux, or Windows machine, see the [wiki](http://wiki) or Cassandra's [getting started guide](http://wiki.apache.org/cassandra/GettingStarted).

In addition, for information on developer and minimal production setups (including EC2 setups), see this [wiki link](http://wiki2).

For information on adding nodes, migrating data, and creating snapshots and backups, see this [wiki link](http://wiki3).

For information on Cassandra, including why to choose Cassandra as your database, go to the [Apache Cassandra homepage](http://cassandra.apache.org/).

For information on Cassandra's fault-tolerant, distributed architecture, see [the original Facebook whitepaper on Cassandra annotated with differences](http://www.datastax.com/documentation/articles/cassandra/cassandrathenandnow.html). Alternatively, also read Google's [BigTable architecture whitepaper](http://static.googleusercontent.com/media/research.google.com/en/us/archive/bigtable-osdi06.pdf) and [Amazon's Dynamo whitepaper](http://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf) as Cassandra's design was influenced by both.

For helpful tips on data modeling in Cassandra (particularly if you come from a SQL background), see these two links:
[Cassandra Data Modeling Best Practices Part 1 - Ebay Tech Blog](http://www.ebaytechblog.com/2012/07/16/cassandra-data-modeling-best-practices-part-1/#.U7YP_Y1dU_Q)
[Cassandra Data Modeling Best Practices Part 2 - Ebay Tech Blog](http://www.ebaytechblog.com/2012/08/14/cassandra-data-modeling-best-practices-part-2/#.U7YQGI1dU_Q)
[Datastax Cassandra Tutorials](http://www.datastax.com/dev/tutorials)
