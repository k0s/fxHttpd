
VERSION = $(shell sed -n 's,^.*<em:version>\(.*\)</em:version>.*$$,\1,p' install.rdf)
TARGET = fxHttpd-${VERSION}.xpi
DIRS = content modules locale skin defaults
FILES = install.rdf bootstrap.js chrome.manifest README.md LICENSE.txt
CONTENTS = $(shell find ${DIRS} ! -name ".*")

.PHONY: clean
clean:
	-rm ${TARGET}

${TARGET}: ${FILES} ${CONTENTS}
	@if [ -f ${TARGET} ];then rm ${TARGET}; fi
	zip $@ -r ${FILES} ${CONTENTS}
	@echo created $@

.xpi: ${TARGET}
	@ls -l ${TARGET}

xpi: .xpi

install: xpi
	-/cygdrive/d/usr/Firefox/firefox.exe ${TARGET}

# vim: set noet:
