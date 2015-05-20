(function() {
  var bwDOM = {
    getAllDocuments: function(document) {
      var result = [document];
      var frames = Array.concat(Array.slice(document.getElementsByTagName("frame")), Array.slice(document.getElementsByTagName("iframe")));
      for each (var frame in frames) {
        if (frame.contentDocument)
          result = result.concat(arguments.callee(frame.contentDocument));
      }
      return result;
    },
  }

  switch (self.options.do) {
    case "loadMissingImages":
      for each (var doc in bwDOM.getAllDocuments(document)) {
        for each (var img in doc.getElementsByTagName("img"))
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
