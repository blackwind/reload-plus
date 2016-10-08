// Reload Plus - Supercharge your reload button and hotkeys!
// Copyright © 2007-2016 bwProductions <http://blackwind.org/>
//
// This add-on is free software: you can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the Free
// Software Foundation, either version 3 of the License, or (at your option)
// any later version.
//
// This add-on is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
// more details.
//
// You should have received a copy of the GNU General Public License along
// with this add-on. If not, see <http://www.gnu.org/licenses/>.

"use strict";

(function() {
  var Ci = Components.interfaces;

  addMessageListener("createLoader", function() {
    var webNav = docShell.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation);
    var entry = webNav.sessionHistory.getEntryAtIndex(webNav.sessionHistory.index, false).QueryInterface(Ci.nsISHEntry);

    var currentURI = webNav.currentURI.spec;
    var loadFlags = Ci.nsIWebNavigation.LOAD_FLAGS_BYPASS_HISTORY;
    var postData = entry.postData;
    var referrerURI = entry.referrerURI;

    addMessageListener("reload", function callee() { removeMessageListener("reload", callee);
      webNav.loadURI(currentURI, loadFlags, referrerURI, postData, null);
    });

    sendAsyncMessage("response", {
      "posted": false,
      "url": currentURI,
    });
  });
})();
