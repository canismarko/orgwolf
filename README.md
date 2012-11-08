OrgWolf
=======

OrgWolf is a web server for organizing your life. While it is functional by itself, it is best used in conjunction with client programs and plugins. # TODO: add url to list of clients.
It is conceptually based on org-mode for emacs. While it aims to provide a comparable experience, OrgWolf does not require any org-mode knowledge and can happily be used without even knowing what emacs is.

Project Structure
-----------------
Each app contains a few special files. `models.py` holds python classes that moderately correspond to database entries. `views.py` contains functions that serve up responses to web requests. `tests.py` defines the unit tests that ensure previous work isn't broken by subsequent changes. `urls.py` files are a series of regular expressions that describe how to translate a url to a view.
+ `orgwolf/` contains server-wide components (auth, etc)
+ `orgwolf/settings.py
+ `GettingThingsDone/` contains the GTD components for making lists, etc.
+ `projects/` contains the tools to work on GTD nodes.
+ `wolfmail/` deals with messaging and sending GTD objects via e-mail
+ `plugins/` interact with other sources of information (eg. GMail, org-mode)
+ `local_settings.py` is an optional file that is not tracked by git. It is read by orgwolf/settings.py
+ `templates/` houses all the HTML-like templates that Django uses
+ `templates/base.html` is a generic page that is modified by all other pages. It is never served directly. Global changes should be made here.
+ `templates/registration/` holds the account management templates

Helpful Commands
--------------------
OrgWolf uses Django's management framework. Here are some helpful manage commands. Manage.py should be invoked using `python manage.py <arguments>`. Substitue `python` with `python2`, `python2.7`, etc. if needed.
+ `manage.py runserver` - launch the webserver for testing at 127.0.0.1 port 8000
+ `manage.py test` - run full test suite (including built in Django tests). This does not test of CSS/JS/HTML errors.
+ `manage.py validate` - test whether the models are valid
+ `manage.py shell` - load an interactive shell with the environment set for this project. Apps are not in the default namespace.

Proper git usage is outside the scope of this document. In the interest of helping develops, however, here are a few commands relevant to this project:
+ `git status` - see the current status of the local repository
+ `git pull` - get changes from the origin location (github?)
+ `git diff` - in-line comparison of differences between local and origin repositories
+ `git commit -a` - create a new commit to "save" your changes
+ `git push` - upload your committed changes to origin. Note you need github write access to modify that repo.

Installation
------------

