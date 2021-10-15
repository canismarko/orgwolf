# Builds CSS from LESS files and
# minifies and combines javascript files

STATIC = orgwolf/static/orgwolf/
ORGWOLF_SCSS = $(STATIC)orgwolf.scss
MIN_JS = orgwolf/static/orgwolf.js
GTD_JS = gtd/static/gtd/*.js
WM_JS = wolfmail/static/*.js
OW_JS = $(STATIC)*.js
PO_JS = gtd/static/project-outline/*.js
AL_JS = gtd/static/action-list/*.js
WR_JS = gtd/static/weekly-review/*.js
DIVIDER = @echo "========================="
YUI = yuicompressor -v
JSLINT = @jslint --color --white --terse
WEBPACK = npx webpack
bold = `tput bold`
normal = `tput sgr0`

.DEFAULT: all

.PHONY: serve

all: $(MIN_JS)

serve:
	$(WEBPACK) --config webpack.dev.js --watch

$(MIN_JS): $(GTD_JS) $(WM_JS) $(OW_JS) $(PO_JW) $(AL_JS) $(WR_JS) $(ORGWOLF_SCSS)
	$(WEBPACK) --config webpack.prod.js
