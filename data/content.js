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
  var bwDOM = {
    getAllDocuments: function(document) {
      var result = [document];
      var frames = Array.concat(Array.slice(document.getElementsByTagName("frame")), Array.slice(document.getElementsByTagName("iframe")));
      for (let frame of frames) {
        if (frame.contentDocument)
          result = result.concat(bwDOM.getAllDocuments(frame.contentDocument));
      }
      return result;
    },
  };

  switch (self.options.do) {
    case "loadMissingImages":
      for (let doc of bwDOM.getAllDocuments(document)) {
        for (let img of doc.getElementsByTagName("img"))
          img.src = img.src;
      }
      break;
    default:
      self.port.emit("onPageLoad", document.documentURI);
      window.addEventListener("beforeunload", function() {
        self.port.emit("onPageUnload", document.documentURI);
        if (/^about:neterror\?/.test(document.documentURI))
          document.getElementById("errorTryAgain").disabled = true;
      });
      break;
  }
})();
