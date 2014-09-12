<pre>
+-++-++-++-++-++-++-++-+
|M||i||g||r||a||t||o||r|
+-++-++-++-++-++-++-++-+

I migrate your data.
</pre>

Have you ever been building an application and want to track your schema modifications in a meaningful and incremental fashion? Of course you have, we all have! I, for one, had an application that I ported from Rails to express.js and one of the big things I missed was the migrations. I haven't yet ported the "rollbacks", because I didn't use them. Also I didn't port over the abstraction layer because, well people should learn SQL especially when it comes to defining schema.

So what does migrator do?
=========================
migrator will process a directory of migrations, aptly named "./migrations", that are a mix of SQL and JS files and process them in ascending order, skipping over ones that have already been processed. Essentially it allows you to have a uniform way of migrating schema and data in a repeatable and dependable fashion. It comes with a executable "migrator" that assumes the following conventions:

 * You are executing it in the application root which has a directory "migrations" and a file "config.js" in it. The config file has (at least) the following format (note: if you are using mysql, swap 'postgresql' attribute for 'mysql'):

<pre>
module.exports = {
  "development": {
    "postgresql": "tcp:postgres@localhost/dev-db"
  },
  "staging": {
    "postgresql": "tcp:postgres@localhost/stage-db"
  },
  "production": {
    "postgresql": "tcp:postgres@localhost/db"
  }
}
</pre>

 * You define your current operating environment as the "NODE_ENV" environment variable.

If those conventions are hip to you then just install migrator using

<pre>
sudo npm install -g migrator
</pre>

and run it in the following fashion

<pre>
migrator
</pre>

and you are off migrating. If you don't like those conventions, configure them! The package exports a function "migrate" that you can use in the following manner:

<pre>
require("migrator").migrate("app_root_path", "config_hash_with_attribute_as_above", options_hash);
</pre>

For now the options hash just allows you to change the configured editor, it must be a path to the editor for auto opening new migration files. If you don't provide one, it uses your defined "EDITOR" environment variable.

If you opt for the configuration route, it's generally good to wrap it in an executable script and use it in similar manner to how you use the convention-based migrator.


How do I make migrations?
=========================

To create a migration, you can just use

<pre>
migrator -g
</pre>

OR

<pre>
migrator generate
</pre>

That will create a new file with the current timestamp as an integer with the extension `.sql` and open in the defined editor as described above OR the default environment variable EDITOR (run `echo $EDITOR` to find out what this is for your system).

If you want to migrate data, create a JS migration using

<pre>
migrator -g js
</pre>

OR

<pre>
migrator generate js
</pre>

and it will open a new file (similar format) with the extension `.js` with the necessary boilerplate to allow for the DB object to be passed in. If you do use the JS one, be sure to execute the callback parameter once all operations are done with a simple `callback()`.

Q&A
===

You got questions, I got answers (sometimes) - ping me on twitter [@voodootikigod](http://twitter.com/voodootikigod). If you like this, go out and do something awesome with it, I got your back (but not rollback, at least not yet).
