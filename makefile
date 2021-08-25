# Builds CSS from LESS files and
# minifies and combines javascript files

STATIC = orgwolf/static/orgwolf/
ORGWOLF_CSS = $(STATIC)orgwolf.css
ORGWOLF_LESS = $(STATIC)orgwolf.scss
MIN_JS = orgwolf/static/orgwolf.js
GTD_JS = gtd/static/gtd-models.js gtd/static/gtd-services.js gtd/static/gtd-directives.js gtd/static/gtd-filters.js gtd/static/gtd-controllers.js
WM_JS = wolfmail/static/wolfmail-models.js wolfmail/static/wolfmail-services.js wolfmail/static/wolfmail-directives.js wolfmail/static/wolfmail-filters.js wolfmail/static/wolfmail-controllers.js
OW_JS = $(STATIC)orgwolf-services.js $(STATIC)orgwolf-directives.js $(STATIC)orgwolf-filters.js $(STATIC)orgwolf-controllers.js
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

$(MIN_JS): $(GTD_JS) $(WM_JS) $(OW_JS) $(ORGWOLF_LESS)
	$(WEBPACK) --config webpack.prod.js
