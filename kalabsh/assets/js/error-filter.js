// Suppress noisy browser extension messaging errors without affecting app behavior
(function(){
  var patterns = [
    'listener indicated an asynchronous response',
    'message channel closed before a response was received',
    'The message port closed before a response was received',
  ];

  function textOf(x){
    try {
      if (!x) return '';
      if (typeof x === 'string') return x;
      if (x && typeof x === 'object') {
        if ('message' in x && x.message) return String(x.message);
        if ('toString' in x) return String(x.toString());
      }
      return String(x);
    } catch(_) { return ''; }
  }

  function shouldIgnore(msg, stack){
    var m = String(msg || '');
    var s = String(stack || '');
    if (patterns.some(function(p){ return m.indexOf(p) !== -1; })) return true;
    // Extension-originated stacks
    if (s.indexOf('chrome-extension://') !== -1 || s.indexOf('moz-extension://') !== -1) return true;
    // Extension-originated messages (network errors and overlays)
    if (m.indexOf('chrome-extension://') !== -1 || m.indexOf('moz-extension://') !== -1) return true;
    if (m.indexOf('net::ERR_FILE_NOT_FOUND') !== -1 && (m.indexOf('chrome-extension://') !== -1 || m.indexOf('moz-extension://') !== -1)) return true;
    if (m.indexOf('completion_list.html') !== -1) return true;
    return false;
  }

  // Capture phase to intercept early extension errors
  window.addEventListener('error', function(e){
    var msg = e.message || (e.error && e.error.message);
    var stack = e.error && e.error.stack;
    if (shouldIgnore(msg, stack)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener('unhandledrejection', function(e){
    var reason = e.reason;
    var msg = textOf(reason);
    var stack = reason && reason.stack;
    if (shouldIgnore(msg, stack)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  // Console fallback
  var origError = console.error;
  console.error = function(){
    try {
      var args = Array.prototype.slice.call(arguments);
      var msg = args.map(function(a){ return textOf(a); }).join(' ');
      var stack = '';
      for (var i=0;i<args.length;i++){ if (args[i] && args[i].stack){ stack = args[i].stack; break; } }
      if (shouldIgnore(msg, stack)) return; 
    } catch(_) {}
    return origError.apply(console, arguments);
  };
})();