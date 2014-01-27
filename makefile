# Builds CSS from LESS files and
# minifies and combines javascript files

STATIC = orgwolf/static/
ORGWOLF_CSS = $(STATIC)orgwolf.css
MOBILE_CSS = $(STATIC)orgwolf_m.css
MIN_JS = $(STATIC)orgwolf-min.js
OW_JS = $(STATIC)orgwolf.js
GTD_MODELS = gtd/static/gtd-models.js
GTD_CTRL = gtd/static/gtd-ctrl.js
WM_MODELS = wolfmail/static/wolfmail-models.js
WM_CTRL = wolfmail/static/wolfmail-ctrl.js
MOBILE_OW_JS = $(STATIC)orgwolf_m.js
MOBILE_MIN_JS = $(STATIC)orgwolf_m.min.js
LESS = lessc --yui-compress
DIVIDER = @echo "========================="
YUI = yuicompressor
JSLINT = @jslint --color --white --terse
bold = `tput bold`
normal = `tput sgr0`

all: $(ORGWOLF_CSS) $(MOBILE_CSS) $(MIN_JS) $(MOBILE_MIN_JS)

$(ORGWOLF_CSS): $(STATIC)orgwolf.less $(STATIC)social/auth-buttons.css
	@echo "$(bold)Building stylesheet $(ORGWOLF_CSS)...$(normal)"
	$(YUI) $(STATIC)social/auth-buttons.css >> $(ORGWOLF_CSS)
	$(LESS) $(STATIC)orgwolf.less >> $(ORGWOLF_CSS)
	$(DIVIDER)
$(MOBILE_CSS): $(STATIC)orgwolf_m.less $(STATIC)social/auth-buttons.css $(STATIC)jqm-icons.css
	@echo "$(bold)Building stylesheet $(MOBILE_CSS)...$(normal)"
	$(YUI) $(STATIC)social/auth-buttons.css > $(MOBILE_CSS)
	$(YUI) $(STATIC)jqm-icons.css >> $(MOBILE_CSS)
	$(LESS) $(STATIC)orgwolf_m.less >> $(MOBILE_CSS)
	$(DIVIDER)

$(MIN_JS): $(OW_JS) $(GTD_MODELS) $(GTD_CTRL) $(WM_MODELS) $(WM_CTRL) $(STATIC)persona.js $(STATIC)jquery.cookie.js
	@echo "$(bold)Preparing javascript files...$(normal)"
	$(JSLINT) $(OW_JS)
	$(JSLINT) $(GTD_MODELS)
	$(JSLINT) $(GTD_CTRL)
	$(JSLINT) $(WM_MODELS)
	$(JSLINT) $(WM_CTRL)
	$(JSLINT) $(STATIC)persona.js
	$(YUI) $(STATIC)jquery.cookie.js > $(MIN_JS)
	$(YUI) $(OW_JS) >> $(MIN_JS)
	$(YUI) $(GTD_MODELS) >> $(MIN_JS)
	$(YUI) $(GTD_CTRL) >> $(MIN_JS)
	$(YUI) $(WM_MODELS) >> $(MIN_JS)
	$(YUI) $(WM_CTRL) >> $(MIN_JS)
	$(YUI) $(STATIC)persona.js >> $(MIN_JS)
	$(DIVIDER)

$(MOBILE_MIN_JS): $(MOBILE_OW_JS) $(STATIC)jquery.cookie.js
	@echo "$(bold)Preparing mobile javascript files...$(normal)"
	$(YUI) $(STATIC)jquery.cookie.js > $(MOBILE_MIN_JS)
	$(JSLINT) $(MOBILE_OW_JS)
	$(YUI) $(MOBILE_OW_JS) >> $(MOBILE_MIN_JS)
	$(DIVIDER)
