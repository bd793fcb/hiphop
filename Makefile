#* Generated file, don't edit
#*=====================================================================*/
#*    serrano/prgm/project/hiphop/hiphop/Makefile.in                   */
#*    -------------------------------------------------------------    */
#*    Author      :  Manuel Serrano                                    */
#*    Creation    :  Fri Jan 20 14:35:57 2006                          */
#*    Last change :  Fri Apr 24 12:14:50 2020 (serrano)                */
#*    Copyright   :  2006-20 Manuel Serrano                            */
#*    -------------------------------------------------------------    */
#*    Generic Makefile to build Hop weblets.                           */
#*=====================================================================*/
## run "make" to build the .hz file

#*---------------------------------------------------------------------*/
#*    Weblet description                                               */
#*---------------------------------------------------------------------*/
HZ=hiphop
HZVERSION=0.3.0
DATE="25 April 2020"

CATEGORY=programming
LICENSE=gpl

HOPREPOSITORY=/home/serrano/prgm/distrib
HOPLIBDIR=/usr/local/lib
HOPVERSION=3.3.0
HOPBUILDID=0789b20931ecad27ea8ca35f25504db4
HOPBUILDARCH=linux-x86_64
HOPSODIR=/usr/local/lib/hop/3.3.0/node_modules

HOP = hop
HOPC = hopc
HFLAGS = -O2

HOPCOMPOPTS = -v2 --no-server --so-policy aot --so-target src -q

NODE_MODULES=$(HOPLIBDIR)/hop/$(HOPVERSION)/node_modules
LOCAL_NODE_MODULES=$$HOME/.node_modules

#*---------------------------------------------------------------------*/
#*    targets                                                          */
#*---------------------------------------------------------------------*/
so: ChangeLog
	HOPTRACE="nodejs:compile" NODE_PATH=$$PWD $(HOP) $(HOPCOMPOPTS) -j 'require("./lib/hiphop.js")'

#*---------------------------------------------------------------------*/
#*    install                                                          */
#*---------------------------------------------------------------------*/
.PHONY: install-dir install install-local

install:
	$(MAKE) install-dir TARGET_DIR=$(DESTDIR)$(HOPLIBDIR)/$(HZ)/$(HZVERSION)
	cd $(HOPSODIR) && rm -f $(HZ) && ln -s $(DESTDIR)$(HOPLIBDIR)/$(HZ)/$(HZVERSION) $(HZ)
	chmod a+rx $(DESTDIR)$(TARGET_DIR)/$(HZ)

install-local:
	$(MAKE) install-dir TARGET_DIR=$$HOME/.node_modules/$(HZ)

install-dir:
	mkdir -p $(TARGET_DIR)
	cp -rf package.json $(TARGET_DIR)
	cp -rf package-lock.json $(TARGET_DIR)
	cp -rf node_modules $(TARGET_DIR)
	cp -rf ulib $(TARGET_DIR)
	cp -rf lib $(TARGET_DIR)
	cp -rf preprocessor $(TARGET_DIR)
	cp -rf so $(TARGET_DIR)
	chmod a+rx -R $(TARGET_DIR)

#*---------------------------------------------------------------------*/
#*    clean                                                            */
#*---------------------------------------------------------------------*/
clean:
	rm -rf so
	rm -rf lib/so
	rm -rf ulib/so
	rm -rf preprocessor/so

cleanall: clean
	rm -f config.status
	rm -f lib/config.js
	rm -rf arch/debian/debian

distclean: cleanall

#*---------------------------------------------------------------------*/
#*    hz                                                               */
#*---------------------------------------------------------------------*/
.PHONY: distrib tgz

distrib: hz
hz: tgz
tgz: $(HOPREPOSITORY)/$(HZ)-$(HZVERSION).tar.gz

$(HOPREPOSITORY)/$(HZ)-$(HZVERSION).tar.gz: \
  package.json \
  package-lock.json \
  node_modules \
  ulib \
  lib \
  preprocessor \
  configure \
  Makefile.in Makefile \
  $(OBJECTS) \
  $(FILES) \
  LICENSE \
  arch \
  docker \
  etc \
  doc \
  .travis.yml.in \
  ChangeLog
	mkdir -p $(HOPREPOSITORY) && \
	(cd ..; \
	 cp -r $(HZ) $(HZ)-$(HZVERSION); \
         tar cvfz $@ \
             --exclude='$(HZ)/private' \
             --exclude=.gitignore \
             --exclude=.git \
             --exclude=so \
             --exclude=arch/debian/build.$(HZ) \
             --exclude='*~' $(^:%=$(HZ)-$(HZVERSION)/%); \
         rm -rf $(HZ)-$(HZVERSION))

#*---------------------------------------------------------------------*/
#*    ChangeLog                                                        */
#*---------------------------------------------------------------------*/
ChangeLog:
	git log --pretty=format:"hiphop ($(HZVERSION)-1) unstable; urgency=low%n%n  * %s%n%n -- %an <%ae>  %cD%n" > ChangeLog
