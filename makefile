# Builds CSS from LESS files and 
# minifies and combines javascript files

ORGWOLF_CSS = orgwolf/static/orgwolf.css
MIN_JS = orgwolf/static/orgwolf-min.js
OW_JS = orgwolf/static/orgwolf.js
LESS = lessc --yui-compress --verbose
YUI = yuicompressor --verbose -o
JSLINT = jslint --color --white

all: $(ORGWOLF_CSS) $(MIN_JS)

$(ORGWOLF_CSS): orgwolf/static/orgwolf.less
	echo "Building stylesheet $(ORGWOLF_CSS)..."
	$(LESS) orgwolf/static/orgwolf.less $(ORGWOLF_CSS)

$(MIN_JS): $(OW_JS)
	echo "Cleaing $(OW_JS)..."
	$(JSLINT) $(OW_JS)
	echo "Compacting $(OW_JS)..."
	$(YUI) $(MIN_JS) $(OW_JS)
