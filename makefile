# Builds CSS from LESS files and 
# minifies and combines javascript files

STATIC = orgwolf/static/
ORGWOLF_CSS = $(STATIC)orgwolf.css
MOBILE_CSS = $(STATIC)orgwolf_m.css
MIN_JS = $(STATIC)orgwolf-min.js
OW_JS = $(STATIC)orgwolf.js
MOBILE_OW_JS = $(STATIC)orgwolf_m.js
MOBILE_MIN_JS = $(STATIC)orgwolf_m.min.js
LESS = lessc --yui-compress
DIVIDER = @echo "========================="
YUI = yuicompressor
JSLINT = jslint --color --white
bold = `tput bold`
normal = `tput sgr0`

all: $(ORGWOLF_CSS) $(MOBILE_CSS) $(MIN_JS) $(MOBILE_MIN_JS)

$(ORGWOLF_CSS): $(STATIC)orgwolf.less $(STATIC)timepicker/timepicker.css $(STATIC)datepicker/datepicker.css $(STATIC)social/auth-buttons.css $(STATIC)persona-buttons.css
	@echo "$(bold)Building stylesheet $(ORGWOLF_CSS)...$(normal)"
	$(YUI) $(STATIC)datepicker/datepicker.css > $(ORGWOLF_CSS)
	$(YUI) $(STATIC)timepicker/timepicker.css >> $(ORGWOLF_CSS)
	$(YUI) $(STATIC)persona-buttons.css >> $(ORGWOLF_CSS)
	$(YUI) $(STATIC)social/auth-buttons.css >> $(ORGWOLF_CSS)
	$(LESS) $(STATIC)orgwolf.less >> $(ORGWOLF_CSS)
	$(DIVIDER)
$(MOBILE_CSS): $(STATIC)orgwolf_m.less $(STATIC)social/auth-buttons.css $(STATIC)jqm-icons.css $(STATIC)persona-buttons.css
	@echo "$(bold)Building stylesheet $(MOBILE_CSS)...$(normal)"
	$(YUI) $(STATIC)persona-buttons.css >> $(ORGWOLF_CSS)
	$(YUI) $(STATIC)social/auth-buttons.css > $(MOBILE_CSS)
	$(YUI) $(STATIC)jqm-icons.css >> $(MOBILE_CSS)
	$(LESS) $(STATIC)orgwolf_m.less >> $(MOBILE_CSS)
	$(DIVIDER)

$(MIN_JS): $(OW_JS) $(STATIC)jquery.cookie.js $(STATIC)datepicker/bootstrap-datepicker.js $(STATIC)timepicker/bootstrap-timepicker.js
	@echo "$(bold)Preparing javascript files...$(normal)"
	$(YUI) $(STATIC)jquery.cookie.js > $(MIN_JS)
	$(YUI) $(STATIC)datepicker/bootstrap-datepicker.js >> $(MIN_JS)
	$(YUI) $(STATIC)timepicker/bootstrap-timepicker.js >> $(MIN_JS)
	$(JSLINT) $(OW_JS)
	$(YUI) $(OW_JS) >> $(MIN_JS)
	$(DIVIDER)

$(MOBILE_MIN_JS): $(MOBILE_OW_JS) $(STATIC)jquery.cookie.js 
	@echo "$(bold)Preparing mobile javascript files...$(normal)"
	$(YUI) $(STATIC)jquery.cookie.js > $(MOBILE_MIN_JS)	
	$(JSLINT) $(MOBILE_OW_JS)
	$(YUI) $(MOBILE_OW_JS) >> $(MOBILE_MIN_JS)
	$(DIVIDER)
