# Builds CSS from LESS files and 
# minifies and combines javascript files

ORGWOLF_CSS = orgwolf/static/orgwolf.css
MIN_JS = orgwolf/static/orgwolf-min.js
OW_JS = orgwolf/static/orgwolf.js
LESS = lessc --yui-compress --verbose
YUI = yuicompressor --verbose -o
JSLINT = jslint --color --white
bold = `tput bold`
normal = `tput sgr0`

all: $(ORGWOLF_CSS) $(MIN_JS)

$(ORGWOLF_CSS): orgwolf/static/orgwolf.less
	echo "$(bold)Building stylesheet $(ORGWOLF_CSS)...$(normal)"
	$(LESS) orgwolf/static/orgwolf.less $(ORGWOLF_CSS)

$(MIN_JS): $(OW_JS)
	echo "$(bold)Cleaing $(OW_JS)...$(normal)"
	$(JSLINT) $(OW_JS)
	echo "$(bold)Compacting $(OW_JS)...$(normal)"
	$(YUI) $(MIN_JS) $(OW_JS)
