module.exports.migrate = function (app_root, app_config, options) {
  
  
  var editor = "$EDITOR";
  if (options && options.editor) {
    editor = options.editor;
  }
  
  var db, OPEN_TRANSACTION, CLOSE_TRANSACTION;

  // determine working condition.
  if (app_config.postgresql) {
    // load postgresql library
    var postgres = require("pg").native;

    // create and connect db
    db = new postgres.Client(app_config.postgresql);
    db.connect();
    OPEN_TRANSACTION = "BEGIN; ";
    CLOSE_TRANSACTION = "COMMIT; ";

  } else if (app_config.mysql) {
    var mysql = require("mysql");

    // create and connect db
    db = mysql.createClient(app_config.mysql);
    OPEN_TRANSACTION = "START TRANSACTION; ";
    CLOSE_TRANSACTION = "COMMIT; ";

  } else {
    console.log("You must specify a connection string for either PostgreSQL or MySQL");
    process.exit(-1);
    
  }


  // load FS library to handle migration creation and processing
  var fs = require("fs");



  // set up the migrations directory
  var migrations_dir = app_root + "migrations/";

  //for execing
  var exec = require("child_process").exec;

  // if requested with no parameters
  if (process.argv.length == 2) {


    // function used to migrate the through all of the defined migrations, skipping over those already done.


    function migrate(cb) {

      // get all already executed migrations.
      db.query('SELECT "version" FROM "schema_migrations"', function(err, resp) {
        var migrations_run = 0;
        var executed = [];

        // if there is an error assume we are at the default state, and run root migration 
        if (err) {

          // attempt to run file located at app_root/migrations/schema/root.sql -- good for previous data force load (e.g. Rails)
          var schema = fs.readFileSync(migrations_dir + "schema/root.sql").toString();
          db.query(schema); // populate with root schema if not populated.
        } else {
          // if no error, dump all versions into an array called executed for quick searching.
          for (var rl = resp.rows.length; rl > 0; rl--) {
            executed.push(resp.rows[rl - 1].version);
          }
        }


        // function loop to execute through the remainin "torun" migrations
        var run_migrations = (function(torun) {

          // get the next migration
          var current = torun.pop();

          // if there is a migration
          if (current) {

            // test if already executed
            if (executed.indexOf(current.id) < 0) {
              // alert of execution
              console.log("Executing migration: " + current.id);

              // check if migration is SQL
              if (current.sql) {

                // suffix with schema migrations insertion so we dont run again if successful.
                var sql = OPEN_TRANSACTION+current.sql + "; INSERT INTO schema_migrations VALUES (" + current.id + "); "+CLOSE_TRANSACTION;

                // execute the full query
                db.query(sql, function(e, r) {
                  if (e) {
                    db.query("ROLLBACK;", function () {
                      // if error, dump why we couldn't migrate and process no more.
                      console.log("Could not migrate database. Error provided below.")
                      console.log(e);
                      db.end();
                    });
                  } else {

                    // otherwise add to counter and run the rest of the "torun" array
                    migrations_run++;
                    run_migrations(torun);
                  }
                });

                // if migration is JS code
              } else if (current.js) {

                // pass our db object and execute with callback to insert into schema migration AND recurse with rest of "torun" array
                current.js(db, function() {
                  db.query("INSERT INTO schema_migrations VALUES (" + current.id + ")", function(err, results) {
                    migrations_run++;
                    run_migrations(torun);
                  });
                });
              }
            } else {

              // if no idea what to do, just skip!
              run_migrations(torun);

            }

            // if no more migrations
          } else {
            // only output if we done work.
            if (migrations_run > 0) console.log("Migrations run: " + migrations_run);

            // if there is a callback, exec it
            if (cb) {
              cb();
            }
          }
        });




        // populate all existing migrations by reading the migrations directory
        fs.readdir(migrations_dir, function(err, list) {
          var migrations = [];


          for (var li = 0, ll = list.length; li < ll; li++) {

            // if the file has a .sql extension, load it as a file read for sql schema updating
            if (m = list[li].match(/(.*)\.sql/)) {
              migrations.push({
                id: m[1],
                sql: fs.readFileSync(migrations_dir + m[0]).toString()
              });

              // if the file has a .js extension, load via require system and set js attribute as .migrate function
            } else if (j = list[li].match(/(.*)\.js/)) {
              migrations.push({
                id: j[1],
                js: require(migrations_dir + "/" + list[li]).migrate
              });
            }
          }

          //recursively run through all migrations after they have been sorted by ID in ascending order
          run_migrations(migrations.sort((function(a, b) {
            return (parseInt(b.id) - parseInt(a.id));
          })));
        });
      });
    }


    // run the migration with the final callback being a DB close.
    migrate(function() {
      db.end();
    });

    // if provided a generate argument: ./script/migrate generate or ./script/migrate -g
  } else if (process.argv[2] == "generate" || process.argv[2] == "-g") {
    // create new file name as the current timestamp
    filename = +(new Date())

    // if final argument was "js"
    if (process.argv[3] == "js") {
      // make a JS file and open it with the default EDITOR pre-populated with the rough boilerplate required.
      filename = migrations_dir + filename + ".js"
      exec("echo 'module.exports.migrate = function(db, callback) {\n}' > " + filename + "; "+editor+" " + filename);
    } else {
      // make a SQL file and open it with the default EDITOR
      filename = migrations_dir + filename + ".sql"
      exec(editor+" " + filename);
    }
  }
}
