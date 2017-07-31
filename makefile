# Builds CSS from LESS files and
# minifies and combines javascript files

STATIC = orgwolf/static/orgwolf/
ORGWOLF_CSS = $(STATIC)orgwolf.css
ORGWOLF_LESS = $(STATIC)orgwolf.less $(STATIC)orgwolf-animations.less
MIN_JS = $(STATIC)orgwolf-min.js
GTD_JS = gtd/static/gtd-models.js gtd/static/gtd-services.js gtd/static/gtd-directives.js gtd/static/gtd-filters.js gtd/static/gtd-main.js
WM_JS = wolfmail/static/wolfmail-models.js wolfmail/static/wolfmail-services.js wolfmail/static/wolfmail-directives.js wolfmail/static/wolfmail-filters.js wolfmail/static/wolfmail-ctrl.js
OW_JS = $(STATIC)orgwolf-services.js $(STATIC)orgwolf-directives.js $(STATIC)orgwolf-filters.js $(STATIC)orgwolf-controllers.js
LESS = lessc --clean-css
DIVIDER = @echo "========================="
YUI = yuicompressor -v
JSLINT = @jslint --color --white --terse
bold = `tput bold`
normal = `tput sgr0`

all: $(ORGWOLF_CSS) $(MIN_JS)

$(ORGWOLF_CSS): $(ORGWOLF_LESS) $(STATIC)social/auth-buttons.css
	$(DIVIDER)
	@echo "$(bold)Building stylesheet $(ORGWOLF_CSS)...$(normal)"
	$(YUI) $(STATIC)social/auth-buttons.css > $(ORGWOLF_CSS)
	$(LESS) $(STATIC)orgwolf.less >> $(ORGWOLF_CSS)
	$(LESS) $(STATIC)orgwolf-animations.less >> $(ORGWOLF_CSS)

$(MIN_JS): $(GTD_JS) $(WM_JS) $(OW_JS) $(STATIC)jquery.cookie.js
	$(DIVIDER)
	@echo "$(bold)Linting javascript files...$(normal)"
	-$(JSLINT) $(GTD_JS) $(WM_JS) $(OW_JS)
	$(DIVIDER)
	@echo "$(bold)Minifying javascript files...$(normal)"
	uglifyjs $(STATIC)jquery.cookie.js $(GTD_JS) $(WM_JS) $(OW_JS) -o $(MIN_JS)
