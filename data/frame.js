(function() {
  var Ci = Components.interfaces;

  addMessageListener("createLoader", function() {
    var webNav = docShell.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation);
    var entry = webNav.sessionHistory.getEntryAtIndex(webNav.sessionHistory.index, false).QueryInterface(Ci.nsISHEntry);

    var currentURI = webNav.currentURI.spec;
    var loadFlags = Ci.nsIWebNavigation.LOAD_FLAGS_NONE;
    var postData = entry.postData;
    var referrerURI = entry.referrerURI;

    addMessageListener("reload", function() { removeMessageListener("reload", arguments.callee);
      webNav.loadURI(currentURI, loadFlags, referrerURI, postData, null);
    });

    sendAsyncMessage("response", {
      "posted": Boolean(postData),
      "url": currentURI,
    });
  });
})();
