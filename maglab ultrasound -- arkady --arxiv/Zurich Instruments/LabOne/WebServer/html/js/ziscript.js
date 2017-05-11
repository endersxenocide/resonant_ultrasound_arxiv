
// Inform JSLint that jQuery is defined external
/*jslint browser: true, devel: true, todo: true, white: true */


//$(window).ready(function () {
//  "use strict";
// Do not add code here. Some browsers can not handle it.
//});

function ziSilentError(message) {
  "use strict";
  // Place here an alert or breakpoint
}

function dummyFn() { }

var onTheFlight, subsequent404Errors, subsequent0Errors;  // http://bugs.jquery.com/ticket/14207

var usingWebSocket = false;
var webSocket = null;

var requestQueue = new Queue();

function postRequest(requestObject) {
  "use strict";
  requestQueue.enqueue(requestObject);
}

function getPendingRequests() {
  "use strict";
  var payload = "", request, reqStr, key, htmlEnc;
  while (!requestQueue.isEmpty()) {
    request = requestQueue.dequeue();
    reqStr = "";
    for (key in request) {
      // ("" + obj) is a conversion to string that presumably would behave same as encodeURIComponent(obj)
      // http://stackoverflow.com/questions/1354064/how-to-convert-characters-to-html-entities-using-plain-javascript
      htmlEnc = ("" + request[key]).replace(/[\u0026\u003C\u003E\u00A0-\u2666]/g, function(c) {
          return '&#'+c.charCodeAt(0)+';';
        });
      reqStr = reqStr + ((reqStr.length === 0) ? "?" : "&") + key + "=" + encodeURIComponent(htmlEnc);
    }
    if (payload.length > 0) {
      payload = payload + ";";
    }
    payload = payload + reqStr;
  }
  return payload;
}

var ZI_SESSION_ID = -1;
function getZiSessionId() {
  "use strict";
  if (ZI_SESSION_ID < 0) {
    ZI_SESSION_ID = Math.max(0, parseInt(sessionStorage.getItem('ziSessionId'), 10));
  }
  // console.log("Current session id: " + ZI_SESSION_ID);
  return ZI_SESSION_ID;
}

// On IE9 the console object is not defined unless the
// developer tools are activated. This will trigger 
// errors that result in illegal behavior of the 
// Javascript code (problem with drop, select, update,...
// We use a simple fix to cure it. No own log.
// See http://stackoverflow.com/questions/6889376 for
// more infos.
window.console || (window.console = { log: function () { "use strict"; } });

// fixes wrong window.location.origin value for IE
if (!window.location.origin) { window.location.origin = window.location.protocol + "//" + window.location.host; }

function openNewTab(urlString, appendSessionId) {
  "use strict";
  if (!urlString) { return; }
  if (appendSessionId) {
    urlString = urlString + '&ziSessionId=' + getZiSessionId();
  }

  window.open(urlString, '_blank');
  window.focus();
}


function isMobileSafari() {
  "use strict";
  return navigator.userAgent.match(/(iPod|iPhone|iPad)/) && navigator.userAgent.match(/AppleWebKit/);
}

function download(urlString) {
  "use strict";
  var urlWithSession, a;
  urlWithSession = urlString + '&ziSessionId=' + getZiSessionId();
  // console.log('Post download: ' + urlWithSession);
  a = document.createElement("a");
  a.href = urlWithSession;
  a.download = "";
  if (isMobileSafari()) {  // ipad needs to open it new tab otherwise we loose the session
    a.target = "_blank";
  }
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function sendCommand(id, format, data) {
  if (id && format) {
    postRequest({
      action: 'command',
      id: id,
      format: format,
      data: data
    });
  }
}

function messageSync(urlString, dataJSON, onSuccess, onError) {
  "use strict";
  if (typeof onSuccess === "undefined") { onSuccess = dummyFn; }
  if (typeof onError === "undefined") { onError = dummyFn; }

  $.ajax({
    type: "GET",
    async: false,
    url: urlString,
    headers: { "ziSessionId": getZiSessionId() },
    data: dataJSON,
    //dataType: 'text',
    //dataType: "xml",  // don't define as we accept both text and xml
    accepts: {
      xml: 'text/xml',
      text: 'text/plain'
    },
    cache: false,
    success: onSuccess,
    error: onError
  });
}

function serverLog(message) {
  postRequest({ action: 'set', path: '/local/logentrytransfer', id: 'none', data: message });
}

var ziFullScreen = {
  isSupported: (document.documentElement.requestFullscreen || document.documentElement.mozRequestFullScreen || document.documentElement.webkitRequestFullscreen || document.documentElement.msRequestFullscreen),
  isActive: function () {
    "use strict";
    return (document.fullscreenElement ||    // alternative standard method
      document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement) ? true : false;
    // return document.fullscreenEnabled || document.mozFullscreenEnabled || document.webkitIsFullScreen ? true : false;
  },
  initBtn: function () {
    "use strict";
    var btn = document.getElementById("zifullscreen");

    if (!btn || !ziFullScreen.isSupported) { return; }

    if (btn.parentNode) {
      btn.parentNode.style.display = "";
    }
  },
  handleBtnClick: function () {
    "use strict";
    //var btn = document.getElementById("zifullscreen");

    if (ziFullScreen.isActive()) {
      ziFullScreen.exit();
      //btn.setAttribute("data-zichecked", "false");
    } else {
      ziFullScreen.enter();
      //btn.setAttribute("data-zichecked", "true");
    }
  },
  enter: function () {
    "use strict";
    if (ziFullScreen.isSupported) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      } else if (document.documentElement.msRequestFullscreen) {
        document.documentElement.msRequestFullscreen();
      } else if (document.documentElement.mozRequestFullScreen) {
        document.documentElement.mozRequestFullScreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
      }
    }
  },
  exit: function () {
    "use strict";
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
};


var windowSize = {
  minWidth: 900,  // minimal width of the window. Below this scrollbar appears
  width: $(window).width(),
  height: $(window).height()
};


var ziPressedKeys = [];

///////////////////////////
// Do not add handlers here if the element does not exist
// all the time!
function initMainframe() {
  "use strict";
  //var footer = document.getElementsByTagName('footer')[0],
  // footerOffset; // 3*5px for margins

  setTheme();
  handlers.refresh(document.getElementById(seshDialog.id));
  handlers.refresh(document.getElementById(actionDialog.id));
  handlers.refresh(document.getElementById(msgDialog.id));

  //if (footer) {
  //  footerOffset = document.getElementById("sidebar").offsetWidth + 3 * 5;
  //  footer.style.width = (windowSize.width - footerOffset) + 'px';  // initial footer width; hidden class is added in index.html
  //}

  // send ajax when user leaves or reloads the page
  // NOTE: ajax has to be synchronous in order to be delivered
  window.onunload = function () {
    // no need to unload if connection is lost
    if (subsequent404Errors > 1 || subsequent0Errors > 1) { console.log("No need to unload the session..."); return; }

    messageSync('/', {
      action: 'unload',
      format: 'message',
      data: "Session  " + getZiSessionId() + " is closed by the user."
    });

  };


  $(window).resize(function () {
    var newWidth = $(this).width(),
       newHeight = $(this).height(),
      dialogs, i;

    if (newWidth !== windowSize.width || newHeight !== windowSize.height) {  // fix for iPad which triggers resize also on window scroll
      // TODO: hack for minWidth - the constant below must match the min-width for #mainframe CSS

      if (newWidth < windowSize.minWidth) { newWidth = windowSize.minWidth; }
      postRequest({ action: 'resize', x: newWidth, y: newHeight });

      // restore position of visible dialogs
      dialogs = document.querySelectorAll(".ui-dialog-content");
      for (i = 0; i <= dialogs.length; i++) {
        if ($(dialogs[i]).dialog("isOpen")) {
          $(dialogs[i]).dialog("option", "position", $(dialogs[i]).dialog("option", "position"));
        }
      }

      sidebar.animate();

      windowSize.width = newWidth;
      windowSize.height = newHeight;
    }
  })
  .keydown(function (evt) {
    if (!ziPressedKeys[evt.which]) {
      ziPressedKeys[evt.which] = true;
    }
  })
  .keyup(function (evt) {
    if (ziPressedKeys[evt.which]) {
      ziPressedKeys[evt.which] = false;
    }
  });
  
  $(document.body)
    .on("mouseenter", ".tooltip.colortip .color-cell", colorpicker.tip.cellHoverIn)
    .on("mouseleave", ".tooltip.colortip .cells-cont", colorpicker.tip.cellHoverOut)
    .on("click", ".tooltip.colortip .color-cell", colorpicker.tip.cellClick)
    .on("click", ".tooltip.colortip", colorpicker.tip.onClick)
    .on("change", ".tooltip .color-hex input.hex", colorpicker.tip.hexInputChange)
    .on("keypress", ".tooltip input[type=text]", onKeypressInputMain);  // controlls which keys can be entered inside tooltip

  var screen_change_events = "webkitfullscreenchange mozfullscreenchange fullscreenchange";
  $(document)
    .on("click", function () { $('.tooltip').remove(); })   // remove all shown tooltips on body click
    .on("click", ".ui-widget-overlay", function () {
      var $dialog = $(this).siblings(".ui-dialog:visible:not(.no-close)");
      if (!$dialog.length) { return; }

      $dialog.find("button.ui-dialog-titlebar-close:visible").click();
    })
  .on("keydown keypress", function (e) {
      /*
      * this swallows backspace keys on any non-input element.
      */
    if (e.which == 8) { // 8 == backspace
      var rx = /INPUT|TEXTAREA/i;
      if (!rx.test(e.target.tagName) || e.target.disabled || e.target.readOnly) {
        e.preventDefault();
      }
    }
  });



  

  /*.on(screen_change_events, function (event) {  // on fullscreen change
    if (ziFullScreen.isActive()) {
      console.log("FS changed to ON");
    } else {
      console.log("FS changed to OFF");
    }
  });*/


  /*$(document.getElementById("dialogError")).dialog({
    title: "There was an error",
    resizable: false,
    modal: true,
    draggable: false,
    autoOpen: false,
    dialogClass: 'error-dialog zi-dialog',
    buttons: {
      Reload: function () {
        location.reload();
        //$(this).dialog("close");
        $(this).closest('div.error-dialog.ui-dialog').hide();
      }
    }
  });*/

  $(document.getElementById("dialogInstOpt")).dialog({
    title: "Feature Code",
    resizable: false,
    width: 780,
    //height: 235,
    modal: true,
    draggable: false,
    autoOpen: false,
    dialogClass: 'zi-dialog featurecode-dialog centered',
    buttons: {
      Cancel: function () {
        $(this).dialog("close");
      },
      OK: function () {
        var realInputBox = document.getElementById(this.getAttribute("data-linked")),
          helperInputBox = this.querySelector('input#usrCode'),
          featureCode;

        if (!realInputBox || !helperInputBox) { return; }

        featureCode = helperInputBox.value.trim();
        if (!featureCode) { return; }

        $(realInputBox).val(featureCode).change();
        $(this).dialog("close");
      }
    }
  });

  $(document.getElementById(actionDialog.id))
    .on("click", "[data-action]", actionDialog.onClickAction)
    .dialog({
      closeOnEscape: true,
      title: "Dialog",
      resizable: false,
      width: "85%",
      //height: 235,
      modal: true,
      draggable: false,
      autoOpen: false,
      dialogClass: 'zi-dialog centered action-dialog',
      beforeClose: actionDialog.beforeClose
    });

  $(document.getElementById(msgDialog.id))
    // .on("click", "[data-action]", msgDialog.onClickAction)
    .dialog({
      closeOnEscape: true,
      title: "Message",
      resizable: false,
      width: "600px",
      //height: 235,
      modal: true,
      draggable: false,
      autoOpen: false,
      dialogClass: 'zi-dialog centered msg-dialog no-close'
    });

  $(document.getElementById(seshDialog.id))
    .on("click", "[data-action]", seshDialog.onClickAction)
    .on("dblclick", "[data-action]", seshDialog.onClickAction)
    .on("dragover", ".drop2upload", function (e) {
      "use strict";
      e.stopPropagation();
      e.preventDefault();
    })
    .on("dragenter", ".drop2upload", function (e) {
      "use strict";
      e.stopPropagation();
      e.preventDefault();
      seshDialog.counter++
      $(this).addClass("active");
    })
    .on("dragleave", ".drop2upload", function (e) {
      "use strict";
      e.stopPropagation();
      e.preventDefault();
      seshDialog.counter--;
      if (seshDialog.counter === 0) {
        $(this).removeClass("active");
      }
    })
    .on("drop", ".drop2upload", function (e) {
      "use strict";
      var action = this.getAttribute("data-action"),
        parentId = this.getAttribute("data-linked"),
        urlString;
      seshDialog.counter = 0;
      if (!action) {log.error("No upload action attribute defined!"); return; }
      if (!parentId) {log.error("No parent id attribute defined!"); return; }

      urlString = '/upload?action=' + action + '&id=' + parentId;

      e.stopPropagation();
      e.preventDefault();

      $(this).removeClass("active");
      ziUpload(e.originalEvent.dataTransfer.files, urlString);
    })
    .on("change", "input[data-action]", seshDialog.onChangeAction)
    .on("change", "select[data-action]", seshDialog.onChangeAction)
    .dialog({
      closeOnEscape: false,
      title: "Devices and Settings",
      resizable: false,
      width: "85%",
      //height: 235,
      modal: true,
      draggable: false,
      autoOpen: false,
      dialogClass: 'zi-dialog centered devsel-dialog',
      //open: function(){
      //  "use strict";
      //  var objDiv = this.querySelector("div.msg-wrapper");
      //  if (!objDiv) return;
      //  objDiv.scrollTop = objDiv.scrollHeight;
      //},
      beforeClose: function () {
        "use strict";
        var el = document.getElementById("seshDialogCancel");
        if (!el) { console.warn("Failed to communicate close action to the server."); return; }
        $(el).click();  // communicate it to the server as well
        //return false;
      }
    });

  $(document.getElementById("dialogConfirmation")).dialog({
    title: "Confirm",
    resizable: false,
    modal: true,
    draggable: false,
    autoOpen: false,
    dialogClass: 'zi-dialog centered',
    buttons: {
      Cancel: function () {
        $(this).dialog("close");
      },
      OK: function () {
        var $field = $(document.getElementById(this.getAttribute("data-zilinked")));

        if ($field.length) {
          $field.addClass("confirmed").trigger({  // trigger click on original button
            type: 'click',
            which: 1
          }).removeClass("confirmed");
        }
        $(this).dialog("close");

      }
    }
  });

  // initialize polyfill to eliminate 300ms delay on touch devices
  // see https://github.com/ftlabs/fastclick
  FastClick.attach(document.body);
}
//*************************************
// Action Dialog Handlers
//*************************************
var actionDialog = {
  id: "actiondialog",
  open: function (value, el) {
    "use strict";
    var $dialog = $(document.getElementById(actionDialog.id)),
      title;

    if (!$dialog.length) return value;

    title = (el.options && el.options.length > value) ? el.options[value].label : "";

    if ((value == 0 || !title)) {
      if ($dialog.dialog("isOpen"))
        $dialog.dialog("close");
    } else {
      ctrlsideShowHideRowSel(value, el);
      $dialog.dialog("option", "title", title);
      $dialog.dialog("option", "position", { my: "center", at: "center", of: window });  // center

      if (!$dialog.dialog("isOpen")) {  // open
        $dialog.dialog("open");
      }
    }
    return value;
  },
  beforeClose: function () {
    "use strict";
    $("#" + actionDialog.id + "cancel").click();
  },
  onClickAction: function () {
    "use strict";
    var $dialog = $(document.getElementById(actionDialog.id)),
      action = this.getAttribute("data-action");

    if (!$dialog.length || !action) { return; }

    if (action === 'cancel') {
      $dialog.dialog("close");
    }
  }
};

//*************************************
// Message Dialog Handlers
//*************************************
var nodeDialog = {
  onClickAction: function (element) {
    "use strict";
    var $dialog = $(element).closest(".node-dialog");
    if (!$dialog.length) { return; }
    $dialog.dialog("close");
  },
  open: function () {
    "use strict";
    if (isReadonly(this)) { return; }
    var $dialog = $(this).closest(".single-tree-cont").find(".node-dialog"),
      $parent = $(this).closest(".sidetabs");
    if (!$dialog.length) { console.error("No tree node dialog found"); }
    if (!$parent.length) { console.error("Tree node dialog has no valid parent."); }
    
    $dialog.dialog("option", "position", { my: "right top", at: "left-5 top", of: $parent });  // adjust the dialog position
    $dialog.dialog("option", "height", $parent.height() + 2);
    $dialog.dialog("open");
  }
};

//*************************************
// Message Dialog Handlers
//*************************************
var msgDialog = {
  id: "msgdialog"
  //onClickAction: function (e) {
  //  "use strict";
  //  var $dialog = $(document.getElementById(msgDialog.id)),
  //    action = this.getAttribute("data-action");

    
  //  if (!$dialog.length || !action) { return; }

  //  if (action === 'ok' && !isReadonly(this)) {
  //    $dialog.dialog("close");
  //  }
  //}
};

var plotMath = {
  onDoubleClick: function () {
    "use strict";
    selectText(this.id);
  },
  onClickAction: function (e) {
    "use strict";
    var id = $(this).closest(".plotmath-cont")[0].id,
      action = this.getAttribute("data-action"),
      elId = this.getAttribute("data-linked"),
      rowIds;

    if (!id || !action || !elId) { return; }

    if (action === 'selectall') {
      selectText(elId);
    } else if (action === 'clearselected') {
      rowIds = plotMath.getSelectedRows(elId);
      if (!rowIds.length) { return; }
      sendCommand(id, action, rowIds);
    }

  },
  getSelectedRows: function (elId) {  // see http://help.dottoro.com/ljxgoxcb.php
    "use strict";
    var $rows = $(document.getElementById(elId)).find("tr.selectable"), row, curRowId, i,
      selectedRows = [], boldRange, selection, selRange, startPoints, endPoints;

    if (!$rows.length) { return selectedRows; }

    for (i = 0; i < $rows.length; i++) {
      curRowId = $rows[i].id;
      if (!curRowId) { continue; }

      row = document.getElementById(curRowId);

      if (document.createRange) {         // all browsers, except IE before version 9
        boldRange = document.createRange();
        // select the contents of the text node inside the bold tag
        // it is the smallest range that contains the entire text 
        boldRange.selectNodeContents(row);

        selection = window.getSelection();
        if (!selection.toString().length) { continue; }  // empty string selection

        if (selection.rangeCount > 0) {
          selRange = selection.getRangeAt(0);
          if (selRange.compareBoundaryPoints(Range.START_TO_END, boldRange) <= 0) {
            //console.log("The selection is before the row " + curRowId);
          } else {
            if (selRange.compareBoundaryPoints(Range.END_TO_START, boldRange) >= 0) {
              //console.log("The selection is after the row " + curRowId);
            } else {
              startPoints = selRange.compareBoundaryPoints(Range.START_TO_START, boldRange);
              endPoints = selRange.compareBoundaryPoints(Range.END_TO_END, boldRange);

              if (startPoints < 0) {
                if (endPoints < 0) {
                  //console.log("The selection is before the row but intersects it " + curRowId);
                  selectedRows.push(curRowId);
                } else {
                  //console.log("The selection contains the row " + curRowId);
                  selectedRows.push(curRowId);
                }
              } else {
                if (endPoints > 0) {
                  //console.log("The selection is after the row but intersects it " + curRowId);
                  selectedRows.push(curRowId);
                } else {
                  if (startPoints === 0 && endPoints === 0) {
                    //console.log("The selected text and the row are the same " + curRowId);
                    selectedRows.push(curRowId);
                  } else {
                    //console.log("The selection is inside the row " + curRowId);
                    selectedRows.push(curRowId);
                  }
                }
              }
            }
          }
        } else {
          //console.log("Please select some content!");
        }
      } else {
        //console.log("Your browser does not support this example!");
      }
    }
    return selectedRows;
  }
};

//*************************************
// Session Dialog Handlers
//*************************************
var seshDialog = {
  id: "seshDialog",
  devAndsSttingsId: "dialogDevices",
  counter: 0,
  open: function () {
    "use strict";
    var $dialog = $(document.getElementById(seshDialog.id));

    $dialog.dialog("option", "position", { my: "center", at: "center", of: window });  // center

    if (!$dialog.dialog("isOpen")) {  // open
      $dialog.dialog("open");
    }
  },
  onChangeAction: function (e) {
    var rowId = $(this).closest("tr")[0].id,
      action = this.getAttribute("data-action");

    if (!seshDialog.devAndsSttingsId || !rowId || !action || isReadonly(this)) { return; }

    if (action === 'seshcomment') {
      sendCommand(seshDialog.devAndsSttingsId, 'seshcomment', [rowId, this.value]);
    } else if (action === 'deviceinterfacesel') {
      e.stopPropagation();
      sendCommand(seshDialog.devAndsSttingsId, action, [rowId, $(this).val()]);
    } else if (action == 'devicedataserversel') {
      sendCommand(seshDialog.devAndsSttingsId, 'devicedataserversel', [rowId, this.value]);
    }
  },
  onClickAction: function (e) {
    "use strict";
    var action = this.getAttribute("data-action"), sortDirection, rowId, dblClickUIBtn,
      $dialog = $(document.getElementById(seshDialog.id)), isChecked;
    if (!action || isReadonly(this)) { return; }

    // user double clicks on the device/settings row
    if (e.type === "dblclick") {
      if (action === "devicerowsel") {  // start default UI
        dblClickUIBtn = document.getElementById("sseshDialogStartdefault");
      } else if (action === "seshrowsel") {  // load device and UI settings and start the UI
        dblClickUIBtn = document.getElementById("seshDialogstartdeviceui");
      }

      if (dblClickUIBtn && !isReadonly(dblClickUIBtn) && !$(this).hasClass("read-only")) {
        $(dblClickUIBtn).click();
        action = "startui";
      }
    }

    if (action === 'seshfavorite' || action === 'deviceconnect') {
      //if (isReadonly(this)) return;
      //if (action !== 'deviceconnect')
      e.stopPropagation();  // select also the row when clicked on device connect

      isChecked = (this.getAttribute("data-zichecked") === "true" ? "false" : "true");

      rowId = $(this).closest("tr")[0].id;

      if (!rowId || !seshDialog.devAndsSttingsId) { return; }

      // this.setAttribute("data-zichecked", isChecked);
      $(this).addClass("waiting");

      sendCommand(seshDialog.devAndsSttingsId, action, [rowId, isChecked]);
    } else if (action === 'seshrowsel' || action === "devicerowsel") {
      rowId = this.id;

      if ($(this).hasClass("read-only") || ($(this).attr("aria-selected") === "true") || !rowId || !seshDialog.id) { return; }

      $(this).attr("aria-selected", "true").siblings().attr("aria-selected", "false");

      sendCommand(seshDialog.devAndsSttingsId, action, [rowId]);
    } else if (action === "seshcomment") {
      e.stopPropagation();  // prevent row selection
    } else if (action === 'deviceinterfacesel') {
      return false;
    } else if (action === 'devicedataserversel') {
      return false;
    } else if (action === 'seshsort' || action === 'devicesort') {
      if (!seshDialog.devAndsSttingsId) { return; }

      sortDirection = (this.getAttribute("aria-sort") === "descending") ? "ascending" : "descending";

      sendCommand(seshDialog.devAndsSttingsId, action, [$(this).index(), sortDirection]);
    } else if (action === 'startui') {
      $dialog.dialog("option", "title", "Loading...");
      //$dialog.find("#seshDialogmessage").val("");  // clear message 
      showHideSeshDialog(3);
    } else if (action === 'cancel') {
      // $(document.getElementById(seshDialog.id)).dialog("close");
      showHideSeshDialog(0);  // close dialog
    } else if (action === 'reload') {
      showHideSeshDialog(500);
    } else if (action === 'retry') {
      showHideSeshDialog(0);  // close dialog
      pollStart();
    } else if (action === 'seshcomment'  // click on comment input should not do anything
      || action === 'swupdate_settings') {  // handled by upload listener
      return e;
    } else if (action === 'localonly'
      || action === 'swupdate') {  // just stop propagation, handling done via paths
      return false;
    } else {
      console.warn("No defined action for " + action);
      return;
    }
  }
};
//*************************************
// Sidebar handlers
//*************************************
var sidebar = {
  marginTop: 0,
  animate: function () {
    "use strict";
    var $sidebar = $(document.getElementById("sidebar")),
      upper = $(window).height() - $(document.getElementById("sidebarnavigation")).height() - 10,
    currMarginPos = parseInt($sidebar.css('marginTop'), 10);

    //this.element.stop(); // stop any pending animation
    if (currMarginPos > 0) {
      sidebar.marginTop = 0;
      //$('#sidebar').animate({ marginTop: 0 }, 400);
    } else if ((upper < 0) && (currMarginPos < upper)) {
      sidebar.marginTop = upper;
      //$('#sidebar').animate({ marginTop: upper }, 400);
    } else if (currMarginPos < upper) {
      sidebar.marginTop = 0;
      //$('#sidebar').animate({ marginTop: 0 }, 400);
    } else {
      sidebar.marginTop = currMarginPos;
      //this.element.css('marginTop', currMarginPos);
    }
    sidebar.translatey(this.marginTop);
    //sidebar.that.css('marginTop', this.marginTop);
  },
  translatey: function (y) {
    "use strict";
    var sidebar = document.getElementById("sidebar");
    // sidebar.that.css("-webkit-transform", "translate(0px," + y + "px)").css("-ms-transform", "translate(0px," + y + "px)").css("transform", "translate(0px," + y + "px)");
    // sidebar.that.css('margin-top', y);
    if (sidebar) { sidebar.style.marginTop = y + "px"; }
  },
  onWheel: function (evt, delta) {  // sidebar.onWheel
    "use strict";
    evt.preventDefault(); // prevent window scroll
    sidebar.translatey(sidebar.marginTop + 25 * delta);
    sidebar.animate();
  },
  icon: {
    click: function () { // sidebar.icon.click
      "use strict";
      var htmlPath = $(this).closest('div.icon').attr('data-zipath'), // nameOfTab.html
        $tabs = $("ul.tab"),
      tabClass, activeTabList, activeRow = 0, pos2drop;

      blurActiveElement(); // force blur (fix for jquery UI sortable blur problem)

      if (htmlPath) {
        tabClass = htmlPath.substring(0, htmlPath.indexOf(".")).concat('-tab');    // change string/class to: "nameOfTab-tab"
        activeTabList = $('label.' + tabClass, $tabs);                       // get all the active tabs that are of the same tabClass

        if (activeTabList.length) {                                         // if there is already at least one tab of that kind open
          activeTabList.first().trigger({                                   // trigger left click TODO: in case there are multiple equal tabs, which one to chose?
            type: 'mousedown',
            which: 1
          });

        } else {
          if (typeof $('div#sidebar').data('activeRowIndex') !== "undefined") {
            activeRow = $('div#sidebar').data('activeRowIndex');    // retreive index of the active row
          } else {
            activeRow = $tabs.length - 1;
          }
          activeRow = Math.min(activeRow, ($tabs.length - 1));
          pos2drop = $('li.tabaddtab', $tabs).eq(activeRow)[0];
          if (!pos2drop) { return; }

          $(pos2drop).find("label").text('Loading...');
          pos2drop.style.display = 'block';
          pos2drop.style.background = 'transparent';
          if (pos2drop) {
            createTab(pos2drop, htmlPath, -1);
          }
        }
      }
    },
    dragStart: function () { // sidebar.icon.dragStart
      "use strict";
      //var $tabs = $("ul.tab");
      //$('li.tabaddtab', $tabs).addClass('drag-active').show();
      //$('label.tabaddrow', $tabs).addClass('drag-active');
    },
    drag: function (event, ui) {  // sidebar.icon.drag
      "use strict";
      if (ui.position.left >= 30) {
        sidebar.animate();
        if ($(ui.helper)[0].style.zIndex < 0) {
          $(ui.helper)[0].style.zIndex = 2700; // show
        }
      } else {
        sidebar.translatey(sidebar.marginTop + ui.position.top - ui.originalPosition.top);
        ui.position.left = ui.originalPosition.left; // prevent horizontal movement
        if ($(ui.helper)[0].style.zIndex > 0) {
          $(ui.helper)[0].style.zIndex = -100; // hide
        }
      }
    },
    dragStop: function () {  // sidebar.icon.dragStop
      "use strict";
      //var $tabs = $("ul.tab");
      //$('li.tabaddtab', $tabs).removeClass('drag-active').hide();
      //$('label.tabaddrow', $tabs).removeClass('drag-active');
      sidebar.animate();
    }
  }
};

//*************************************
// SVG navigation buttons handlers
//*************************************
var navBtn = {
  clickedPoint: null,
  handle: function (event, id, data, highlight) { // former "clicked2" function
    "use strict";
    var matrix, point;
    if (event.type === 'touchstart') {
      //console.log('Clicked: touchstart');
      if (event.touches.length === 1) {
        //if (highlight) { event.target.setAttribute('fill-opacity', 0.4); }
        matrix = event.currentTarget.getScreenCTM();
        point = event.currentTarget.ownerSVGElement.createSVGPoint();
        point.x = event.touches[0].clientX;
        point.y = event.touches[0].clientY;
        point = point.matrixTransform(matrix.inverse());
        navBtn.clickedPoint = { x: point.x, y: point.y };

        // Block event propagation
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    } else if (event.type === 'touchend') {
      if (navBtn.clickedPoint) {
        //if (highlight) { event.target.setAttribute('fill-opacity', 0.1); }
        postRequest({ action: 'clicked', id: id, data: data, x: navBtn.clickedPoint.x, y: navBtn.clickedPoint.y });
        navBtn.clickedPoint = null;
      }
    } else if (event.type === 'click') {
      matrix = event.currentTarget.getScreenCTM();
      point = event.currentTarget.ownerSVGElement.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      point = point.matrixTransform(matrix.inverse());

      postRequest({ action: 'clicked', id: id, data: data, x: point.x, y: point.y });

      // Block event propagation
      event.preventDefault();
      event.stopPropagation();

    }
  },
  /*hover: function (evt) {
  "use strict";
  var target = $(evt.target).siblings("image.navbtn-image")[0],
  imgLink = target.getAttributeNS("http://www.w3.org/1999/xlink", "href");

  if (imgLink) {
  if (evt.type === "mouseenter") {
  target.setAttributeNS("http://www.w3.org/1999/xlink", "href", imgLink.replace('_out', '_over'));
  } else {
  target.setAttributeNS("http://www.w3.org/1999/xlink", "href", imgLink.replace('_over', '_out'));
  }
  }
  },*/
  push: {
    isTouchStarted: false,
    handle: function (evt, id, path) {
      "use strict";
      if (evt.type === 'click') {
        navBtn.push.sendCommand(id, path);
        evt.preventDefault();
        evt.stopPropagation();
      } else if (evt.type === 'touchstart') {
        navBtn.push.isTouchStarted = true;
        evt.preventDefault();
        evt.stopPropagation();
      } else if (evt.type === 'touchend') {
        if (navBtn.push.isTouchStarted) {
          navBtn.push.sendCommand(id, path);
          navBtn.push.isTouchStarted = false;
        }
        evt.preventDefault();
        evt.stopPropagation();
      }
    },
    sendCommand: function (id, path) {
      "use strict";
      postRequest({ action: 'set', path: path, id: id, format: 'int', data: 1 });  // data is dummy for push buttons
    }
  },
  pushjs: {
    isTouchStarted: false,
    handle: function (evt, id, action) {
      "use strict";
      if (evt.type === 'click') {
        navBtn.pushjs.sendCommand(id, action);
        evt.preventDefault();
        evt.stopPropagation();
      } else if (evt.type === 'touchstart') {
        navBtn.pushjs.isTouchStarted = true;
        evt.preventDefault();
        evt.stopPropagation();
      } else if (evt.type === 'touchend') {
        if (navBtn.pushjs.isTouchStarted) {
          navBtn.pushjs.sendCommand(id, action);
          navBtn.pushjs.isTouchStarted = false;
        }
        evt.preventDefault();
        evt.stopPropagation();
      }
    },
    sendCommand: function (id, action) {
      "use strict";
      download('download?action=' + action + '&id=' + id);
    }
  },
  multi: {  // subclass which handles toggle menu buttons
    isTouchStarted: false,
    handle: function (evt) {
      "use strict";
      if (evt.type === 'click') {
        navBtn.multi.toggleMenu(evt);
        evt.preventDefault();
        evt.stopPropagation();
      } else if (evt.type === 'touchstart') {
        navBtn.multi.isTouchStarted = true;

        evt.preventDefault();
        evt.stopPropagation();
      } else if (evt.type === 'touchend') {
        if (navBtn.multi.isTouchStarted) {
          navBtn.multi.toggleMenu(evt);
          navBtn.multi.isTouchStarted = false;
        }
      }
    },
    toggleMenu: function (evt) {
      "use strict";
      var $target = $(evt.target).siblings('g.dropdown-menu-cont:first'),
        isDisplayed = ($target.attr('display') === 'none') ? false : true;

      navBtn.multi.hideAllMenus(evt.target); // hide all
      if (!isDisplayed && $target.length) {
        $target.attr('display', 'block'); // toggle clicked one
        evt.target.setAttribute('data-zichecked', 'true');
      }

    },
    onMenuClick: function (evt, id, path, sel) {
      "use strict";
      navBtn.multi.hideAllMenus(evt.target);
      postRequest({ action: 'set', path: path, id: id, format: 'int', data: sel });
      evt.preventDefault();
      evt.stopPropagation();
    },
    update: function (text, target) {
      "use strict";
      var sel,
      imgTarget = $(target).siblings("image.navbtn-image")[0],
      imageName = imgTarget.getAttribute("zi:image");

      if (imageName && imgTarget) {
        sel = parseInt(text, 10);
        if (!(isNaN(sel))) {
          imgTarget.setAttributeNS("http://www.w3.org/1999/xlink", "href", imageName.replace('$sel$', sel + 1));
        }
      }
    },
    hideAllMenus: function (target) {
      "use strict";
      var $parent = $(target).closest('svg');
      $parent.find('g.dropdown-menu-cont').attr('display', 'none');           // hide all drop menus
      $parent.find('rect.dropdown_toggle').attr('data-zichecked', 'false');  // remove toggle indicator from the base button
    }
  }
};


function hasThisClass(el, cl) {  // mainly for checking on SVG elements
  "use strict";
  return (" " + el.getAttribute("class") + " ").indexOf(" " + cl + " ") > -1;
}


//*************************************
// SVG event handlers
//*************************************
var handleSVG = {
  dragSVG: false,
  start: { x: 0, y: 0 },
  end: { x: 0, y: 0 },
  last: { x: 0, y: 0 },
  drag: { time: 0, velocity: 0 },
  live: false,                // true when dragged box require live update of the values
  panSVG: [],
  path: '',
  timer: "",
  lastDelta: { x: 0, y: 0 },  // used to check if the delta has changed for live dragging
  timerInterval: 100,         // desired time interval between sending cursor posistions in ms
  isLive: function () {       // helper function to conver true/false to server CmdParser understandable booleans 0/1
    "use strict";
    return handleSVG.live ? 1 : 0;
  },
  onMousemoveUpdate: function () {
    "use strict";
    var deltaX = handleSVG.end.x - handleSVG.start.x,
        deltaY = handleSVG.end.y - handleSVG.start.y;

    if (handleSVG.dragSVG && handleSVG.isLive() && ((deltaX - handleSVG.lastDelta.x) || (deltaY - handleSVG.lastDelta.y))) {  // if dragging and there is a movement compared with previous call
      //console.log("deltaX " + deltaX + ", deltaY: " + deltaY);
      postRequest({ action: 'pan', path: handleSVG.path, x: deltaX, y: deltaY, id: handleSVG.panSVG[0], velocity: handleSVG.drag.velocity, live: handleSVG.isLive() });
      handleSVG.lastDelta.x = deltaX;
      handleSVG.lastDelta.y = deltaY;
    }
  },
  onDoubleClick: function (evt) {
    "use strict";
    var id = evt.currentTarget.getAttribute('data-eventhandler');
    if (!id) { return; }

    postRequest({ action: 'clicked', id: id, data: "doubleclick" });
  },
  onMousedown: function (evt) {
    "use strict";
    var idarray, divParent;

    if (evt.shiftKey && $(evt.target).length) {
      evt.preventDefault();

      divParent = $(evt.target).closest('div'); // gets the (closest) Div parent (one above svg) 
      if (divParent.length && divParent.attr('id')) {

        handleSVG.zoomRect.start(evt.pageX - divParent.offset().left,                        //(start drawing at position (x, y) within parent with id)
                                     evt.pageY - divParent.offset().top, divParent);    // added scrolling offset for correct coordinate calculation if scrolling is active TODO: test its behavior inside the frame
      }
    } else {
      this.start.x = evt.clientX;
      this.start.y = evt.clientY;
      this.end.x = this.start.x;
      this.end.y = this.start.y;
      this.last.x = this.start.x;
      this.last.y = this.start.y;
      this.drag.time = (new Date()).getTime();
      this.drag.velocity = 0;
      if (evt.currentTarget) {
        this.path = evt.currentTarget.getAttribute('data-eventhandler');
        idarray = evt.currentTarget.getAttribute('data-panhandler');
        this.panSVG = idarray.split(',');
        if (this.path) {
          this.dragSVG = true;
          if (hasThisClass(evt.currentTarget, "livepan")) {
            this.live = true;
            this.timer = setInterval(this.onMousemoveUpdate, this.timerInterval);  // turn on the timer which will send the delta of the cursor (related to this.start) to update it on the fly
          }
        }
      }
    }
  },
  onMousemove: function (evt) {
    "use strict";
    //console.log('mousemove');
    var deltaX, deltaY, currentTime, deltaTime, id, node, length, divParent;
    if (evt.shiftKey && handleSVG.zoomRect.draw) {
      evt.preventDefault();
      divParent = $(handleSVG.zoomRect.rect).closest('div'); // gets the Div element (one above svg)
      if (divParent.length) {
        handleSVG.zoomRect.update(evt.clientX - divParent.offset().left + $(window).scrollLeft(),   // added scrolling offset for correct coordinate calculation if scrolling is active
                                        evt.clientY - divParent.offset().top + $(window).scrollTop());    // TODO: test its behavior inside the frame
      } else {
        handleSVG.zoomRect.cancel();
      }
    }
    if (this.dragSVG) {
      // handleSVG.styleCursor(evt.target.id, "move");
      this.end.x = evt.clientX;
      this.end.y = evt.clientY;
      evt.preventDefault();
      evt.stopPropagation();
      deltaX = this.end.x - this.start.x;
      deltaY = this.end.y - this.start.y;
      currentTime = (new Date()).getTime();
      deltaTime = currentTime - this.drag.time;
      this.drag.time = currentTime;
      if (deltaTime > 0) {
        this.drag.velocity = (this.end.x - this.last.x) / deltaTime;
      }
      this.last.x = this.end.x;
      length = this.panSVG.length;

      for (id = 0; id < length; id++) {
        node = document.getElementById(this.panSVG[id]);
        if (node) {
          if (this.panSVG[id].charAt(this.panSVG[id].length - 1) === 'x') {
            node.setAttribute('transform', 'translate(' + deltaX + ',0)');
          } else if (this.panSVG[id].charAt(this.panSVG[id].length - 1) === 'y') {
            node.setAttribute('transform', 'translate(0,' + deltaY + ')');
          } else if (this.panSVG[id].substr(this.panSVG[id].length - 2) === 'c0') {
            node.setAttribute('style', 'position:absolute;left:' + deltaX + 'px;top:' + deltaY + 'px;');
          } else if (this.panSVG[id].substr(this.panSVG[id].length - 2) === 'c1') {
            node.setAttribute('style', 'position:absolute;left:0px;top:' + deltaY + 'px;');
          } else {
            node.setAttribute('transform', 'translate(' + deltaX + ',' + deltaY + ')');
          }
        }
      }
    }
  },
  onMouseup: function (evt) {
    "use strict";
    var deltaX, deltaY;
    if (this.dragSVG) {
      if (this.live) {
        clearInterval(this.timer);
        this.live = false;
      }
      deltaX = this.end.x - this.start.x;
      deltaY = this.end.y - this.start.y;

      this.dragSVG = false;
      postRequest({ action: 'pan', path: this.path, x: deltaX, y: deltaY, id: this.panSVG[0], velocity: this.drag.velocity, live: handleSVG.isLive() });
      // handleSVG.styleCursor(evt.target.id, "");
    }
  },
  onTouchstart: function (evt) {
    "use strict";
    //console.log('touchstart');
    if (evt.touches.length === 1) {
      this.start.x = evt.touches[0].clientX;
      this.start.y = evt.touches[0].clientY;
      this.end.x = this.start.x;
      this.end.y = this.start.y;
      if (evt.currentTarget) {
        this.path = evt.currentTarget.getAttribute('data-eventhandler');
        this.panSVG = evt.currentTarget.getAttribute('data-panhandler').split(',');
        if (this.path) {
          this.dragSVG = true;
          this.last.x = this.start.x;
          this.last.y = this.start.y;
          this.drag.time = (new Date()).getTime();
          this.drag.velocity = 0;
          if (hasThisClass(evt.currentTarget, "livepan")) {
            this.live = true;
            this.timer = setInterval(this.onMousemoveUpdate, this.timerInterval);
          }

          // Do not stop events here (Safari problem)
        }
      }
    }
  },
  onTouchmove: function (evt) {
    "use strict";
    var deltaX, deltaY, currentTime, deltaTime, id, node, length;
    // console.log('touchmove');
    if (this.dragSVG) {
      this.end.x = evt.touches[0].clientX;
      this.end.y = evt.touches[0].clientY;
      deltaX = this.end.x - this.start.x;
      deltaY = this.end.y - this.start.y;
      currentTime = (new Date()).getTime();
      deltaTime = currentTime - this.drag.time;
      this.drag.time = currentTime;
      if (deltaTime > 0) {
        this.drag.velocity = (this.end.x - this.last.x) / deltaTime;
      }
      this.last.x = this.end.x;
      this.last.y = this.end.y;
      length = this.panSVG.length;
      for (id = 0; id < length; ++id) {   // for (id in this.panSVG)  changed because JSLint was complaining
        node = document.getElementById(this.panSVG[id]);
        if (node) {
          if (this.panSVG[id].charAt(this.panSVG[id].length - 1) === 'x') {
            node.setAttribute('transform', 'translate(' + deltaX + ',0)');
          } else if (this.panSVG[id].charAt(this.panSVG[id].length - 1) === 'y') {
            node.setAttribute('transform', 'translate(0,' + deltaY + ')');
          } else if (this.panSVG[id].substr(this.panSVG[id].length - 2) === 'c0') {
            node.setAttribute('style', 'position:absolute;left:' + deltaX + 'px;top:' + deltaY + 'px;');
          } else if (this.panSVG[id].substr(this.panSVG[id].length - 2) === 'c1') {
            node.setAttribute('style', 'position:absolute;left:0px;top:' + deltaY + 'px;');
          } else {
            node.setAttribute('transform', 'translate(' + deltaX + ',' + deltaY + ')');
          }
        }
      }
      evt.preventDefault();
      evt.stopPropagation();
    }
  },
  onTouchend: function (evt) {
    "use strict";
    var deltaX, deltaY;
    //console.log('touchend')
    if (this.dragSVG) {
      this.dragSVG = false;
      if (this.live) {
        clearInterval(this.timer);
        this.live = false;
      }

      deltaX = this.end.x - this.start.x;
      deltaY = this.end.y - this.start.y;
      //console.log('velocity: ' + this.drag.velocity);
      postRequest({ action: 'pan', path: this.path, x: deltaX, y: deltaY, id: this.panSVG[0], velocity: this.drag.velocity, live: handleSVG.isLive() });
      evt.preventDefault();
      evt.stopPropagation();
    }
  },
  onGesturestart: function (evt) {
    "use strict";
    //console.log('gesture start');
    evt.preventDefault();
    if (evt.currentTarget) {
      this.path = evt.currentTarget.getAttribute('data-eventhandler');
    }
  },
  onGesturechange: function (evt) {
    "use strict";
    //console.log('gesture change');
    evt.preventDefault();
  },
  onGestureend: function (evt) {
    "use strict";
    //console.log('gesture end');
    if (this.path) { postRequest({ action: 'gesture', path: this.path, scale: evt.scale, rotation: evt.rotation }); }
  },
  // Handler for the border of a drag area in SVG
  // Leaving this border has to end the dragging. Otherwise
  // the drag element sticks to the mouse pointer as the 
  // mouseup event is no more fired.
  onBorderEvent: function () {
    "use strict";
    var deltaX, deltaY;
    if (handleSVG.dragSVG) {
      handleSVG.dragSVG = false;
      handleSVG.live = false;
      deltaX = handleSVG.end.x - handleSVG.start.x;
      deltaY = handleSVG.end.y - handleSVG.start.y;
      postRequest({ action: 'pan', path: handleSVG.path, x: deltaX, y: deltaY, id: handleSVG.panSVG[0], velocity: handleSVG.drag.velocity, live: handleSVG.isLive() });
    }
    if ($("#zoomRect").length) {
      handleSVG.zoomRect.finish();
    }
  },
  onWheel: function (e, delta) {
    "use strict";
    var $divParent = $(e.currentTarget).closest('div[xmlns]'),     // gets the (closest) Div parent (one above svg)  
            plotId = $divParent[0].id,                // not using global path variable
          mousePos = { x: e.pageX - $divParent.offset().left, y: e.pageY - $divParent.offset().top };

    if (plotId) {
      e.preventDefault();
      e.stopPropagation(); // prevents triggering scroll action on other elements like selected field

      if (e.shiftKey || hasThisClass(e.currentTarget, "vert")) {  // if scrolled on y pan bar or scroll+shift key
        postRequest({ action: 'mousewheelv', id: plotId, x: mousePos.x, y: mousePos.y, data: delta.toString() });
      } else {
        postRequest({ action: 'mousewheelh', id: plotId, x: mousePos.x, y: mousePos.y, data: delta.toString() });
      }
    }
  },
  onClick: function (evt) {
    "use strict";
    var el = evt.target,
    targetClassName = el.getAttribute('class');

    if (targetClassName) {
      if ((targetClassName.indexOf('dropdown_toggle') < 0) && (targetClassName.indexOf('dropdown-menu') < 0)) { // hide menu if not clicked on dropdown elements
        navBtn.multi.hideAllMenus(el);
      }
    }
  },
  styleCursor: function (id, cursorName) {
    "use strict";
    var el = document.getElementById(id);
    if (!el) { return; }

    $(el).attr("data-zicursor", cursorName);
  },
  zoomRect: { // zoomRectangle class
    draw: false,
    startPoint: { x: 0, y: 0 },
    d: {x0: 0, y0: 0, oWidth: 0, oHeight: 0, iWidth: 0, iHeight: 0},
    id: '',
    rect: document.createElementNS("http://www.w3.org/2000/svg", "path"),
    handlers: document.createElementNS("http://www.w3.org/2000/svg", "path"),
    mode: null,
    renderInnerRect: function () {
      if (this.rect) {
        this.rect.setAttribute("d", "M0,0 h" + this.d.oWidth + "v" + this.d.oHeight + "h-" + this.d.oWidth + "z M" + this.d.x0 + "," + this.d.y0 + " v" + this.d.iHeight + "h" + this.d.iWidth + "v-" + this.d.iHeight + "z");
      }
    },

    start: function (startPosX, startPosY, $parent) {
      "use strict";
      var $svgParent = $parent.find('svg'), g;

      this.draw = true;
      this.startPoint.x = startPosX;
      this.startPoint.y = startPosY;
      this.id = $parent.attr('id');
      g = this.createRect();  // creates the rectangle

      if ($svgParent.length && g) {
        $svgParent[0].appendChild(g);       // append rectangle to the svg parent. its parameters will be changed on draging
      }
    },
    update: function (dragPosX, dragPosY) {
      "use strict";
      var offset, threshold, x_old, y_old, x_new, y_new, size;

      if (this.draw === true) {
        offset = { dx: Math.abs(dragPosX - this.startPoint.x), dy: Math.abs(dragPosY - this.startPoint.y) };
        threshold = Math.max(0, Math.min(15, 0.333 * (Math.max(offset.dx, offset.dy)) - 1.1));

        this.refreshMode(offset, threshold);

        x_old = this.getStartPos().x;
        y_old = this.getStartPos().y;
        x_new = Math.min(this.startPoint.x, dragPosX);
        y_new = Math.min(this.startPoint.y, dragPosY);

        if (this.mode === "zoomrectx") {
          if (x_old !== x_new) { this.setStartX(x_new); }
          size = Math.abs(dragPosX - this.startPoint.x);
          this.setWidth(size);
          // update handlers
          this.handlers.setAttribute("d", "M" + x_new + "," + (this.startPoint.y - (threshold)) + " l0," + (2 * threshold) + " m" + size + ",0 l0,-" + (2 * threshold));
        } else if (this.mode === "zoomrecty") {
          if (y_old !== y_new) { this.setStartY(y_new); }
          size = Math.abs(dragPosY - this.startPoint.y);
          this.setHeight(size);
          // update handlers
          this.handlers.setAttribute("d", "M" + (this.startPoint.x - (threshold)) + "," + y_new + " l" + (2 * threshold) + ",0 m0," + size + " l-" + (2 * threshold) + ",0");
        } else {
          if (x_old !== x_new) { this.setStartX(x_new); }
          if (y_old !== y_new) { this.setStartY(y_new); }

          this.setWidth(Math.abs(dragPosX - this.startPoint.x));
          this.setHeight(Math.abs(dragPosY - this.startPoint.y));
          // update handlers
          this.handlers.setAttribute("d", "M0,0");
        }
      }
      this.renderInnerRect();
    },
    refreshMode: function (offset, threshold) {
      "use strict";
      var $svgParent = $(document.getElementById(this.id)).find('svg'),
        listenToKeyes = ziPressedKeys[89] || ziPressedKeys[90] || ziPressedKeys[88];  // flag

      if (!$svgParent.length) { return; }

      if ((offset.dy < threshold && offset.dx < threshold) && !listenToKeyes) {  //offset.dy < threshold / 2 && offset.dx < threshold / 2 && 
        this.mode = "zoomrect";
        return;
      }

      if (ziPressedKeys[88] || ((offset.dy < threshold) && !listenToKeyes)) {  // x key
        this.mode = "zoomrectx";

        this.setStartY(0);
        this.setHeight($svgParent.height());
      } else if (ziPressedKeys[89] || ziPressedKeys[90] || ((offset.dx < threshold) && !listenToKeyes)) {  // y key
        this.mode = "zoomrecty";

        this.setStartX(0);
        this.setWidth($svgParent.width());
      } else {
        this.mode = "zoomrect";
      }
      handleSVG.styleCursor(this.id + "panaxis", this.mode);
      this.renderInnerRect();
    },
    setStartX: function (x) {
      "use strict";
      this.d.x0 = x;
    },
    setStartY: function (y) {
      "use strict";
      this.d.y0 = y;
    },
    getStartPos: function () {
      "use strict";
      return { x: this.d.x0, y: this.d.y0 };
    },
    setWidth: function (width) {
      "use strict";
      this.d.iWidth = width;
    },
    setHeight: function (height) {
      "use strict";
      this.d.iHeight = height;
    },
    finish: function () {
      "use strict";

      if (this.draw === true && this.rect) {
        var size = { width: this.d.iWidth, height: this.d.iHeight },
          position = this.getStartPos();

        if (size.width > 1 && size.height > 1) {
          if (this.mode === "zoomrectx") {
            postRequest({ action: 'clicked', id: this.id, data: 'zoomrectx', x: position.x, y: size.width });  // zoom axis x
          } else if (this.mode === "zoomrecty") {
            postRequest({ action: 'clicked', id: this.id, data: 'zoomrecty', x: position.y, y: size.height }); // zoom axis y
          } else {
            postRequest({ action: 'clicked', id: this.id, data: 'zoomrectx', x: position.x, y: size.width });  // zoom axis x
            postRequest({ action: 'clicked', id: this.id, data: 'zoomrecty', x: position.y, y: size.height }); // zoom axis y
          }
        }

        $(this.rect.parentNode).remove();
        handleSVG.styleCursor(this.id + "panaxis", "");

        this.draw = false;
        this.mode = null;
        return false;
      }
    },
    cancel: function () {
      "use strict";
      if (this.draw === true && this.rect) {
        $(this.rect.parentNode).remove();
        handleSVG.styleCursor(this.id + "panaxis", "");

        this.draw = false;
        this.mode = null;
        return false;
      }
    },
    createRect: function () {
      "use strict";
      var outWidth, outHeight,
        $parent = $(document.getElementById(this.id)),
        g = document.createElementNS("http://www.w3.org/2000/svg", "g");

      if (!$parent.length) { return; }

      // set outer rectangle width and height  see http://jsbin.com/yemuhuwe/1/edit
      this.d.oWidth = $parent.width();
      this.d.oHeight = $parent.height();

      this.d.iWidth = 0;
      this.d.iHeight = 0;

      this.rect.id = "zoomRect";

      // inner start
      this.setStartX(this.startPoint.x);
      this.setStartY(this.startPoint.y);

      // handlers
      this.handlers.setAttribute("d", "M0,0");

      g.setAttribute("clip-path", "url(#" + this.id + "clip)");
      g.appendChild(this.rect);
      g.appendChild(this.handlers);

      this.renderInnerRect();

      return g;
    }
  }
};

// Normal event handling inside the drag borders
function svgEvent(evt) {
  "use strict";

  switch (evt.type) {
    case 'dblclick': handleSVG.onDoubleClick(evt); break;
    case 'mousedown': handleSVG.onMousedown(evt); break;
    case 'mousemove': handleSVG.onMousemove(evt); break;
    case 'mouseup': handleSVG.onMouseup(evt); break;
    case 'touchstart': handleSVG.onTouchstart(evt); break;
    case 'touchmove': handleSVG.onTouchmove(evt); break;
    case 'touchend': handleSVG.onTouchend(evt); break;
    case 'gesturestart': handleSVG.onGesturestart(evt); break;
    case 'gesturechange': handleSVG.onGesturechange(evt); break;
    case 'gestureend': handleSVG.onGestureend(evt); break;
    default: // console.warn("no handler for svg action " + evt.type)
  }
}



function refresh() {
  "use strict";
  if (usingWebSocket) {
    webSocket.send('ziSessionId: ' + getZiSessionId() + '\ncommand: pollAJAX\ndata: ' + getPendingRequests());
  } else {
    $.ajaxQueue({
      type: "POST",
      url: "/pollAJAX",
      headers: { "ziSessionId": getZiSessionId() },
      dataType: "xml",
      cache: false,
      data: getPendingRequests(),
      processData: false,
      //    contentType: "application/json",
      success: refreshHandler.onSuccess,
      error: refreshHandler.onError
    });
  }

}

var refreshHandler = {
  onSuccess: function (xml) {
    "use strict";
    profile.start("Refresh.sucess");
    profile.timestamp.start("refresh()");
    var node, childSVG, importedNode, parent, curElement, firstClass,
        treeRootNode, carPos = -1, id, type, text, $data, that, i, len, parsedData, tmpValue;

    if (xml) {
      if (!xml.getElementsByTagName) {
        ziSilentError("No valid xml passed to the UI.");
        len = 0;  // do not process the data
      } else {
        $data = xml.getElementsByTagName("data");
        len = $data.length;
      }
    } else {
      /// Workaround for the problem of browser (FireFox) swallowing the XHR response content.
      /// Since AJAX updates are incremental, missing update renders DOM out-of-sync
      /// with the server, and full rerendering is required to resync. But resync is too expensive
      /// therefore we take the risk and just skip to the next update.
      console.warn("Content is lost in pollAJAX response, DOM maybe no more in synch with the server.");
      serverLog("Content is lost in pollAJAX response, DOM maybe no more in synch with the server.");
      len = 0; // do not process the data
    }

    for (i = 0; i < len; i++) {  // for used instead of $each, see http://chartgizmo.com/GenerateChart?id=6757
      profile.start("Refresh.loop " + i);
      that = $data[i]; // that holds the i-th JS object

      id = that.getAttribute('childid');
      type = that.getAttribute('type');
      // index = that.getAttribute('index');
      text = that.textContent;

      if (type === 'replace') {
        profile.timestamp.start("refresh()/replace");
        profile.start("Refresh.replace ");
        node = $(that).find('#' + id)[0];
        curElement = document.getElementById(id);  // $(document.getElementById(id)) used  http://jsperf.com/id-selecter-v-getelementbyid
        if (node && curElement) {
          parent = curElement.parentNode;
          importedNode = document.adoptNode(node);
          parent.replaceChild(importedNode, curElement);
          //node = null;
          //importedNode = null;

          // Important: Refresh handlers
          profile.end("Refresh.replace ");
          handlers.refresh(importedNode);
        } else {
          ziSilentError('Element with id ' + id + ' not found');
        }
        profile.timestamp.stop("refresh()/replace");
      } else if (type === 'svg') {
        profile.timestamp.start("refresh()/svg");
        // We have to import the nodes. Otherwise, QtWebKit will produce an error.
        // The rest of the browsers can deal with it.
        node = $(that).find('#' + id)[0];
        if (node) {
          childSVG = document.getElementById(id);
          if (childSVG) {
            parent = childSVG.parentNode;
            if (parent) {
              importedNode = document.adoptNode(node);
              parent.replaceChild(importedNode, childSVG);
              //importedNode = null;
              //childSVG = null;
              //node = null;
            } else {
              ziSilentError('Element with id ' + id + ' not found');
            }
          }
        } else {
          ziSilentError('Element with id ' + id + ' not found');
        }
        profile.timestamp.stop("refresh()/svg");
      } else if (type === 'text_content') {
        profile.timestamp.start("refresh()/text_content");
        childSVG = document.getElementById(id);
        if (childSVG) {
          childSVG.textContent = text;
        } else {
          ziSilentError('Element with id ' + id + ' not found');
        }
        profile.timestamp.stop("refresh()/text_content");
      } else if (type === 'append') {
        profile.timestamp.start("refresh()/append");
        node = $(that).find('#' + id).children();
        var nOfChildren = node.length;
        if (node.length) {
          parent = document.getElementById(id);
          if (parent) {
            for (var j = 0; j < nOfChildren; j++) {
              importedNode = document.adoptNode(node[j]);
              parent.appendChild(importedNode);
              handlers.refresh(importedNode);
            }
          }
        } else {
          ziSilentError('Element with id ' + id + ' not found');
        }
        profile.timestamp.stop("refresh()/append");
      } else if (type === 'remove') {
        profile.timestamp.start("refresh()/remove");
        node = document.getElementById(id);
        if (node) {
          parent = node.parentNode;
          if (parent) {
            parent.removeChild(node);
          }
        } else {
          ziSilentError('Element with id ' + id + ' not found');
        }
        profile.timestamp.stop("refresh()/remove");
      } else if (type === 'image') {
        profile.timestamp.start("refresh()/image");
        node = $(that).find('#' + id)[0];
        childSVG = document.getElementById(id);
        if (node && childSVG) {
          // var importedNode = document.adoptNode(node);
          // var img = document.getElementById(id);
          // img.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", importedNode.getAttributeNS("http://www.w3.org/1999/xlink",'xlink:href'));
          importedNode = document.adoptNode(node);
          //childSVG.setAttribute('xlink:href', importedNode.getAttribute('xlink:href'));
          childSVG.setAttributeNS("http://www.w3.org/1999/xlink", "href", importedNode.getAttribute('xlink:href'));  // http://www.w3.org/Graphics/SVG/WG/wiki/Href
        } else {
          ziSilentError('Element with id ' + id + ' not found');
        }
        profile.timestamp.stop("refresh()/image");
      } else if ((type === 'double') || (type === 'int')) {
        profile.timestamp.start("refresh()/double/int/string");
        curElement = document.getElementById(id);
        if (curElement) {
          if (curElement.getAttribute('multiple')) {
            node = $(curElement);
            curElement.value = ""; // reset selection
            $.each(text.split(","), function (index, value) {
              var option = $('option', node)[value];
              if (option) {
                option.selected = "selected";
              }
            });
          } else {
            firstClass = getFirstClass(curElement);

            if (curElement.nodeName === 'input') { if (curElement.className.match(/active/)) { carPos = getCaret(curElement); } } // store caret pos before refreshing the field
            tmpValue = convert.toNumber(text, curElement, firstClass);
            curElement.value = tmpValue;  // node[0].value instead of node.val() because http://jsperf.com/val-v-value

            if (curElement.nodeName === 'select') { updateCustomSelect(curElement, tmpValue); }   // update select box wrapper
            if (carPos >= 0) { setCaret(curElement, carPos, carPos + 1); carPos = -1; } // restore caret position
          }
        } else {
          ziSilentError('Element with id ' + id + ' not found');
        }
        profile.timestamp.stop("refresh()/double/int/string");
      } else if (type === 'bool') {
        profile.timestamp.start("refresh()/bool");
        curElement = document.getElementById(id);
        if (curElement) {

          $(curElement).removeClass("waiting");
          if (text === "1") {
            curElement.setAttribute('data-zichecked', 'true');
          } else {
            curElement.setAttribute('data-zichecked', 'false');
          }
        } else {
          ziSilentError('Element with id ' + id + ' not found');
        }
        profile.timestamp.start("refresh()/end");
      } else if (type === 'string') {
        curElement = document.getElementById(id);
        if (curElement) {
          text = convert.toString(text, curElement, getFirstClass(curElement), 0);
          if (curElement.nodeName === 'label') {
            curElement.textContent = text; // Replace content of labels
          } else {
            curElement.value = text;
            if (curElement.nodeName === 'select') { updateCustomSelect(curElement, text); }  // update select box wrapper
          }
        } else {
          ziSilentError('Element with id ' + id + ' not found');
        }
      } else if (type === 'readonly') {
        node = document.getElementById(id);
        if (node) {
          if (node.nodeName === 'select') {
            if (text == true) {
              node.setAttribute('disabled', 'disabled');
              node.parentNode.setAttribute('disabled', 'disabled');  // assign the same attribute to the select element wrapper
            } else {
              node.removeAttribute('disabled');
              node.parentNode.removeAttribute('disabled');
            }
          } else if ($(node).hasClass("ace_editor")) {
            ace.edit(node).setReadOnly((text == true));
          } else {
            if (text == true) {
              node.setAttribute('readonly', 'readonly');
              if (node.getAttribute("step")) {
                $(node.parentNode.querySelectorAll("button.spinner")).attr("readonly", "readonly");
              }
            } else {
              node.removeAttribute('readonly');
              if (node.getAttribute("step")) { // if input is spinner
                $(node.parentNode.querySelectorAll("button.spinner")).removeAttr("readonly");
              }
            }
          }
        } else {
          ziSilentError('Element with id ' + id + ' not found');
        }
      } else if (type === 'attribute') { // change any attribute(s) of the element.
        node = document.getElementById(id);
        if (node && text) {
          parsedData = JSON.parse(text);  // the text should be in JSON form and can hold multiple attributes of the same node. 
          for (var val in parsedData) {   // Example: {"data-zichecked": "true", "style": "height:100px;background-color:red;"}
            if (parsedData[val].length) {
              if ($(node).parent("[class*='-wrap']").length) {
                node.parentNode.setAttribute(val, parsedData[val]);
              } else {
                node.setAttribute(val, parsedData[val]);
              }
            } else {
              if ($(node).parent("[class*='-wrap']").length) {
                node.parentNode.removeAttribute(val);
              } else {
                node.removeAttribute(val);  // remove attribute if attribute value is ""
              }
            }

          }
        } else {
          ziSilentError('Element with id ' + id + ' not found');
        }
      } else if (type === 'option') {
        profile.timestamp.start("refresh()/option");
        node = document.getElementById(id);
        if (node) {
          importedNode = document.adoptNode(node);
          node.html(importedNode);
        } else {
          ziSilentError('Element with id ' + id + ' not found');
        }
        profile.timestamp.stop("refresh()/option");
      } else if (type === 'tree') {
        profile.timestamp.start("refresh()/tree");
        treeRootNode = $(document.getElementById(id)).dynatree("getRoot");
        if (treeRootNode) {
          try {
            parsedData = JSON.parse(that.innerHTML || text);  // Important: innerHTML contains escaped html characters while that.textContent already decodes them
            treeRootNode.removeChildren();            // This is important for addChild function
            treeRootNode.addChild(parsedData.children);
          } catch (err) {
            console.warn('Error ' + err + ' when processing response: ' + text);
          }
        } else {
          ziSilentError('Tree element with id ' + id + ' not found');
        }
        profile.timestamp.stop("refresh()/tree");
      } else if (type === 'treeselection') {
        profile.timestamp.start("refresh()/treeselection");
        treeRootNode = $(document.getElementById(id)).dynatree("getTree");
        if (treeRootNode && treeRootNode.visit) {
          treeRootNode.serverUpdate = true; // prevent onSelect() processing
          treeRootNode.visit(function (node) { // deselect all
            node.select(false);
          });
          $.each(text.split(","), function (index, value) {
            treeRootNode.selectKey(value.trim());
          });
          treeRootNode.serverUpdate = false; // resume onSelect() processing
        } else {
          ziSilentError('Tree element with id ' + id + ' not found');
        }
        profile.timestamp.stop("refresh()/treeselection");
      } else if (type === 'treeactivate') {
        profile.timestamp.start("refresh()/treeactivate");
        treeRootNode = $(document.getElementById(id)).dynatree("getTree");
        if (treeRootNode && treeRootNode.visit) {
          treeRootNode.serverUpdate = true; // prevent onSelect() processing
          treeRootNode.activateKey(text.trim());
          treeRootNode.serverUpdate = false; // resume onSelect() processing
        } else {
          ziSilentError('Tree element with id ' + id + ' not found');
        }
        profile.timestamp.stop("refresh()/treeactivate");
      } else if (type === 'jstree') {
        profile.timestamp.start("refresh()/tree");
        treeRootNode = $(document.getElementById(id)).jstree(true);
        if (treeRootNode) {
          try {
            parsedData = JSON.parse(text);
            if (parsedData.id == "#") {
              treeRootNode.deselect_all(true);  // if set to `true` the `changed.jstree` event won't be triggered
              treeRootNode.settings.core.data = parsedData.children;
              treeRootNode.refresh(true, true);  // second argument is true in order to forget previos states
            } else if (parsedData.id == "#branch") {  // TODO(DL)
              console.log("should only load the branch");
              //if (parsedData.children.length) {
              //  var nodesToAppend = parsedData.children[0].children,
              //    parent = treeRootNode.get_node(parsedData.children[0].id);
              //  if (parent) {
              //    for (var p = 0; p < nodesToAppend.length; p++) {
              //      treeRootNode.create_node(parent, nodesToAppend[p], "last", function (a) { console.log(a);}, true);
              //    }
              //    //console.log(treeRootNode.is_loaded(parent));
              //    //treeRootNode.open_node(parent, false);
              //  } else {
              //    log.warning("jstree: no parent found when to append nodes");
              //  }
              //}
            }
          } catch (err) {
            console.warn('Error ' + err + ' when processing response: ' + text);
          }
        } else {
          ziSilentError('Tree element with id ' + id + ' not found');
        }
        profile.timestamp.stop("refresh()/tree");
      } else if (type === 'selectoptions') {
        profile.timestamp.start("refresh()/selectoptions");
        curElement = document.getElementById(id);
        if (curElement) {
          try {
            parsedData = JSON.parse(text);
            var fragment = document.createDocumentFragment(),  // using fragments to minify dom manipulations
              leng = parsedData.options.length;
            for (var ind = 0; ind < leng; ++ind) {
              for (var val in parsedData.options[ind]) {
                var option = new Option(parsedData.options[ind][val].label, val, false, parsedData.options[ind][val].selected);
                if (parsedData.options[ind][val].disabled) {
                  option.disabled = true;
                }
                fragment.appendChild(option);
              }
            }

            removeAllChildren(curElement);  // remove all children. ~ equivalent to $('option', node).remove();

            curElement.appendChild(fragment);
            updateCustomSelect(curElement);
          } catch (err) {
            console.warn('Error ' + err + ' when processing response: ' + text);
          }
        } else {
          ziSilentError('Element with id ' + id + ' not found');
        }
        profile.timestamp.stop("refresh()/selectoptions");
      } else if (type === 'newhistoryitems') {
        profile.timestamp.start("refresh()/newhistoryitems");
        importedNode = $(that).find('tr');  // find all rows (inside the data from the server)
        if (importedNode.length) {
          node = $(document.getElementById(id));  // find the table that contains history signals (inside the page DOM)
          if (node.length) {
            node.prepend(importedNode);  // prepend row(s) to history table
          } else {
            console.warn('tr node of element ' + id + ' not found');
          }
        } else {
          ziSilentError('Element with id ' + id + ' not found');
        }
        profile.timestamp.stop("refresh()/newhistoryitems");
      } else if (type === 'replacehistoryitems') {
        profile.timestamp.start("refresh()/replacehistoryitems");
        node = $(document.getElementById(id));
        if (node.length) {
          importedNode = $(that).find('tr');  // find all rows (inside the data from the server)
          if (importedNode.length) {
            $.each(importedNode, function (index, val) {
              var nodeToReplace = node.find('#' + val.id);
              if (nodeToReplace.length) {
                nodeToReplace.replaceWith(val);  // append row(s) to history table
              } else {
                ziSilentError('tr node of element ' + id + ' not found');
              }
            });
          } else {
            ziSilentError('No tr rows to replace');
          }
          profile.timestamp.stop("refresh()/replacehistoryitems");
        } else {
          ziSilentError('Element with id ' + id + ' not found');
        }
      } else if (type === 'deletehistoryitems') {
        profile.timestamp.start("refresh()/deletehistoryitems");
        node = $(document.getElementById(id));
        if (node.length) {
          try {
            parsedData = JSON.parse(text);
            for (var p = 0; p < parsedData.deletedHistoryItems.length; p++) {
              node.find('#' + parsedData.deletedHistoryItems[p]).remove();
            }
          } catch (err) {
            console.warn('Error ' + err + ' when processing response: ' + text);
          }
        } else {
          ziSilentError('Element with id ' + id + ' not found');
        }
        profile.timestamp.stop("refresh()/deletehistoryitems");
      } else if (type === 'historyitems') { // complete list
        profile.timestamp.start("refresh()/historyitems");
        importedNode = $(that).find('tr');  // find all rows (inside the data from the server)
        node = $(document.getElementById(id));  // find the table that contains history signals (inside the page DOM)
        if (node.length) {
          node.find('tr').remove();
          node.append(importedNode);  // append row(s) to history table
        } else {
          console.warn('tr node of element ' + id + ' not found');
        }
        profile.timestamp.stop("refresh()/historyitems");
      } else if (type === 'selectselection') {
        profile.timestamp.start("refresh()/selectselection");
        node = $(document.getElementById(id));
        if (node.length) {
          node.val(""); // reset selection
          $.each(text.split(","), function (index, value) {
            var optionObj = $('option[value=\"' + value.toString() + '\"]', node)[0];
            if (optionObj) {
              optionObj.selected = "selected";
            }
          });
          updateCustomSelect(node[0]);
        } else {
          ziSilentError('Element with id ' + id + ' not found');
        }
        profile.timestamp.stop("refresh()/selectselection");
      } else {
        console.warn('Node not found: ' + text);
      }
      profile.end("Refresh.loop " + i);

    }

    if (onTheFlight > 0) {
      onTheFlight = onTheFlight - 1;
    }

    if (subsequent404Errors > 0) {
      subsequent404Errors = subsequent404Errors - 1;
    }

    if (subsequent0Errors > 0) {
      subsequent0Errors = subsequent0Errors - 1;
    }

    profile.end("Refresh.sucess");
    profile.timestamp.stop("refresh()");

  },
  onError: function (xhr, ajaxOptions, thrownError) {
    "use strict";
    var severeError = false;

    console.error("Sorry but there was an error: " + xhr.status + " " + xhr.statusText);

    // Workaround for 404 and 0 problem observed on Chrome: Only trigger message if 
    // all pollAjax failed  see http://bugs.jquery.com/ticket/14207 for correct error number handling
    if (xhr.status === 404) {
      subsequent404Errors = subsequent404Errors + 1;
      if (subsequent404Errors > 1) {
        severeError = true;

        // Block any further request attempts
        onTheFlight = onTheFlight + 1;
      } else if (onTheFlight > 0) {
        onTheFlight = onTheFlight - 1;
      }
    } else if (xhr.status === 0) {
      subsequent0Errors = subsequent0Errors + 1;
      if (subsequent0Errors > 1) {
        severeError = true;

        // Block any further request attempts
        onTheFlight = onTheFlight + 1;
      } else if (onTheFlight > 0) {
        onTheFlight = onTheFlight - 1;
      }
    } else {
      severeError = true;
    }

    // show dialog if the error is severe
    if (severeError) {

      if (xhr.status === 0) { // Server does no more answer
        showHideSeshDialog(404);  // TODO(DL): does it really behaves as 404?
      } else if (xhr.status === 400) { // "bad request"
        // open reload dialog
        showHideSeshDialog(500);  // TODO(DL): does it really behaves as 500?
      } else if (xhr.status === 404) {  // "not found"
        // open 404 customized dialog
        showHideSeshDialog(404);
      } else if (xhr.status === 500) { // "internal server error"
        // open reload dialog
        showHideSeshDialog(500);
      } else if (xhr.status === 502) { // "bad gateway error"
        showHideSeshDialog(404);  // TODO(DL): does it really behaves as 404?
      } else {
        // open dialog with cancel controls
        showHideSeshDialog(2);  // TODO(DL): is it ok to informe user about errors that we don't handle
      }
    }

    // communicate error message to the server
    serverLog("Sorry but there was an error: " + xhr.status + " " + xhr.statusText);

    if (xhr.status !== 0 && xhr.status !== 404) {  // web server is down, no need to sync error message (important for firefox correct behavior)
      messageSync('message', {
        action: 'command',
        format: 'error',
        data: ("Sorry but there was an error: " + xhr.status + " " + xhr.statusText)
      }, function (xml) {
        "use strict";
        // error variables shouldn't be affected by this routine as othervise
        // they will always be set to 0 on every error message communication
        var onTheFlight_tmp = onTheFlight,
          subsequent404Errors_tmp = subsequent404Errors,
          subsequent0Errors_tmp = subsequent0Errors;

        refreshHandler.onSuccess(xml);

        // restore error variables
        onTheFlight = onTheFlight_tmp;
        subsequent404Errors = subsequent404Errors_tmp;
        subsequent0Errors = subsequent0Errors_tmp;

      }  // callback
      );
    }

  }
};

// Function that returnes only the first class
function getFirstClass(el) {
  "use strict";
  if (!el) { return ""; }
  profile.timestamp.start("getFirstClass()");
  var c = el.getAttribute('class');  // el.className; doesn't work for svg

  if (c) { profile.timestamp.stop("getFirstClass() - exists"); return c.match(/[^\s]+/)[0]; } else { profile.timestamp.stop("getFirstClass()-not exists"); return ""; }  // http://jsperf.com/hasclass-vs-native/7
}

function removeAllChildren(el) {
  "use strict";
  if (el) {
    while (el.firstChild) {
      el.removeChild(el.lastChild);
    }
  }
}

// function that is called on normal and "forced" icon drop 
function createTab(posToDrop, zipath, position) {
  "use strict";
  var parentId = posToDrop.getAttribute('data-eventhandler');

  if (zipath && parentId) {
    sendCommand(parentId, 'tabadd', [zipath, position]);
  }
}

function createRow(posToDrop, zipath) {
  "use strict";
  var id = posToDrop.parentNode.getAttribute('data-eventhandler'),
    position = $("label.tabaddrow").index(posToDrop);

  if (id && (position >= 0)) {
    posToDrop.textContent = 'Loading...';
    $(posToDrop).removeClass('drag-hover-row');

    sendCommand(id, 'rowadd', [zipath, position]);
  }
}

// function receives currently clicked object (.tabselect || .tabaddtab || .tabaddrow ) and finds and stores the index of the row it belongs to
function storeRowIndex(tabChild) {
  "use strict";
  //if(tabChild.hasClass('tabaddrow')){   // in case a row has been added, store: index(last_row)
  //$('div#sidebar').data('activeRowIndex', $('ul.tab').length);
  //}else{                                // store index of selected tab's row
  $('div#sidebar').data('activeRowIndex', $('ul.tab').index(tabChild.closest('ul.tab')));
  //} 
}

function updateCustomSelect(el, rawValue) {
  "use strict";
  var index = el.selectedIndex,
     parent = el.parentNode,
      label,
      labelText;

  if (el.getAttribute('size') || !parent || el.nodeName !== 'select' || el.nodeName != 'select') { return null; }
  if (!$(parent).hasClass("select-wrap")) { console.warn("Select box with id " + el.id + " is not wrapped."); return null; }

  label = parent.getElementsByTagName("label")[0];  // find label element
  labelText = (index < 0 || index >= el.options.length) ? ('<' + (rawValue ? rawValue : "undefined") + '>') : el.options[index].text;  // set label text

  if (!label) {
    label = document.createElement('label');
    label.textContent = labelText;
    parent.appendChild(label);
  } else {
    label.textContent = labelText;
  }
}

function onChangeSelectPost(element) {
  "use strict";
  var zipath = this.getAttribute('data-zipath'),
    myFormat = 'int',
    myClass = getFirstClass(this),
    selectData = '';

  if (this.getAttribute('multiple')) {
    myFormat = 'string';
    selectData = $('option:selected', this).map(function () { return this.value; }).get().join(',');  // map to csv. (ex.: 0,1,3) and encode
  } else {
    myFormat = 'int';
    selectData = this.value;
    updateCustomSelect(this);
  }

  if (zipath) {
    postRequest({
      action: 'set',
      path: zipath,
      id: this.id,
      format: myFormat,
      data: selectData
    });
  }
}

function onFocusBlurSelect(e) {
  "use strict";
  var node = e.target.parentNode;
  if (!node) { return null; }

  if (e.type === "focusin") {
    node.className += " focused";
  } else {
    $(node).removeClass("focused");
  }
}

function onChangeCopy2Clipboard(e) {
  "use strict";
  // Select the email link anchor text  
  var el2Sel = document.getElementById(e.target.getAttribute("data-linked")),
    successful;

  if (!el2Sel) { console.warn("Element to copy from not found!"); return; }

  selectText(el2Sel.id);

  try {  
    // Now that we've selected the anchor text, execute the copy command  
    successful = document.execCommand('copy');  
    // console.log(successful ? 'Successful' : 'Unsuccessful');
  } catch(err) {  
    console.log('Oops, unable to copy');
  }  

  // remove info message
  // setTimeout(function() {copyMessageEl.textContent = ""; }, 1 * 1000);
  
  // Remove the selections - NOTE: Should use
  // removeRange(range) when it is supported  
  window.getSelection().removeAllRanges();
}

// checks if the element is readonly
function isReadonly(el) {
  "use strict";
  return (el.getAttribute('readonly')) ? true : false;
}

// helper function that decodes entity number to html caracter
function decodeEntities(s) {
  var str, temp = document.createElement('p');
  temp.innerHTML = s;
  str = temp.textContent || temp.innerText;
  temp = null;
  return str;
}

/* tooltip class */
function Tooltip(el, settings_user) {
  "use strict";
  var that = this,
    defaults = {
      customClass: "",
      html: false,
      delay: { show: 0.8, hide: 0.2 }, // time in sec
      onOutDestroy: true
    };

  that.settings = $.extend({}, defaults, settings_user);  // override defaults with user settings

  that.element = el;
  that.tip = null;
  that.content = settings_user.content;
  that.timer = { over: null, out: null };  // definition of the two timers

  that.show = function () {
    if (that.settings.onOutDestroy) {
      clearTimeout(that.timer.out);
      that.timer.over = setTimeout(that.render, that.settings.delay.show * 1000);
    } else {
      that.render();
    }
  };

  that.render = function () {
    var arrowOffset = 7,
                pos = null,
         linkedFieldId = that.element.id, tip;

    if ($(that.element).is(':visible') && that.content) { // visibility check in order to prevent showing the tooltip on ghost elements
      pos = $(that.element).offset();

      tip = document.createElement("div"); tip.className = "tooltip " + that.settings.customClass; tip.style.top = tip.style.left = 0 + "px";
      if (that.settings.html) { tip.innerHTML = that.content; } else { tip.textContent = decodeEntities(that.content); }

      if (linkedFieldId) { tip.setAttribute("data-zilinked", linkedFieldId); }

      that.tip = tip;
      document.body.appendChild(tip);

      // set the tooltip position
      if ((pos.left + $(that.element).width() + $(that.tip).width()) > $(window).width()) { // tooltip is out of window on the right
        $(that.tip).addClass('left')
        .offset({ top: pos.top, left: pos.left - $(that.tip).innerWidth() - arrowOffset });
      } else {  // default position -> on the right
        $(that.tip).addClass('right')
        .offset({ top: pos.top, left: pos.left + $(that.element).innerWidth() + arrowOffset });
      }

      if ((pos.top + $(that.tip).height()) > $(window).height()) { // tooltip is out of window on the bottom
        $(that.tip).addClass('top')
              .css('top', pos.top - $(that.tip).innerHeight() + $(that.element).innerHeight() - 1);
      } // default vertical position -> on the bottom


      $(that.tip).fadeTo(90, 1);  // show (fade in) the tooltip

      if (that.settings.onOutDestroy) {
        $(that.tip).hover(function () {  // If the user is hovering over the tooltip div, cancel the timeout
          clearTimeout(that.timer.out);
        }, function () {
          var that_i = this;
          clearTimeout(that.timer.over);
          that.timer.out = setTimeout(function () { $(that_i).remove(); }, that.settings.delay.hide * 1000);
        });
      }
    }
  };
  //that.getObject = function (){  // returns HTML object for further manipulation
  //  return $(that.tip);
  //};

  that.hide = function () {
    if (that.settings.onOutDestroy) {
      clearTimeout(that.timer.over);

      that.timer.out = setTimeout(function () {
        if (that.tip !== null && that.tip.parentNode) { that.tip.parentNode.removeChild(that.tip); /*$(that.tip).remove();*/ }
      }, that.settings.delay.hide * 1000);
    } else {
      if (that.tip !== null && that.tip.parentNode) { that.tip.parentNode.removeChild(that.tip);  /*$(that.tip).remove();*/ }
    }
  };
}

// *****************************
// Tooltip event handlers
// *****************************
var tooltip = {
  uiTooltip: new Tooltip(this, { content: "" }),
  tipEnter: function () {
    "use strict";
    var tipContent = this.getAttribute('data-zitooltip');

    if (!$(this).is(':focus') && !$(this).hasClass('active') && tipContent) {  // show only if element is not focused
      tooltip.uiTooltip.hide();
      tooltip.uiTooltip.element = this;
      tooltip.uiTooltip.content = tipContent;

      tooltip.uiTooltip.show();
    }
  },
  tipLeave: function () {
    "use strict";
    tooltip.uiTooltip.hide();
  }
};

function handleNumPlot(e) {
  "use strict";
  var $ulParent = $(this).closest('.num-plotlist'),
          pos = $ulParent.find('li').index($(this)),
      last_pos = $('body').data('last_pos'),
        zipath, zivalue, ziformat;

  if ($(e.target).attr("class") === "close-btn-bg") {  // clicked on CLOSE button
    e.stopPropagation();
    zivalue = $(e.target).closest('li').attr("data-linked");
    zipath = $(e.target).attr("data-zipath");
    ziformat = "int";

  } else {    // simple SELECTION
    zipath = $(this).closest('li').attr('data-zipath');
    ziformat = 'string';
    if (e.ctrlKey) {  // ctrl pressed -> don't reset selections
      $(this).toggleClass('sel');
      $('body').data('last_pos', pos);  // store the position
    } else if (e.shiftKey) {
      if (typeof last_pos === "undefined") { last_pos = 0; }
      $ulParent.find('li.sel').removeClass('sel');
      $ulParent.find('li').slice(Math.min(pos, last_pos), Math.max(pos, last_pos) + 1).addClass('sel');
    } else {
      if ($(this).hasClass("sel") && ($(this).siblings(".sel").length === 0)) {
        return false;
      } else {
        //$ulParent.find('li.sel').removeClass('sel');
        $(this).addClass('sel').siblings().removeClass("sel");
        $('body').data('last_pos', pos);  // store the position
      }
    }

    zivalue = $ulParent.find('li.sel').map(function () {  // create comma separated  list of selected elements
      var tmpAttr = this.getAttribute('data-linked');
      if (tmpAttr) { return tmpAttr; }
    }).get().join(',');
  }

  if (zipath) {
    postRequest({
      action: 'set',
      path: zipath,
      id: this.id,
      format: ziformat,
      data: zivalue
    });
  }
}


// *****************************
// Colorpicker event handlers
// *****************************
var colorpicker = {
  uiColortip: new Tooltip(null, { content: "", html: true, delay: { show: 0, hide: 0 }, onOutDestroy: false, customClass: "colortip" }),
  getTipHTML: function (initColor) {
    "use strict";
    var i, tipContent = '<div class="cells-cont" data-ziinitcolor="' + initColor + '">';

    for (i = 0; i < 42; i++) { tipContent += '<span class="color-cell"></span>'; }
    tipContent += '</div><div class="color-hex"><label>#</label><input class="hex num w70" type="text"  value="' + initColor + '"/></div>';

    return tipContent;
  },
  show: function (e) {
    "use strict";
    var element = e.target,
       callerId = element.id;

    if (callerId) {
      e.stopPropagation();
      e.preventDefault();

      colorpicker.uiColortip.hide();

      colorpicker.uiColortip.element = element;
      colorpicker.uiColortip.content = colorpicker.getTipHTML(colorpicker.rgb2hex(element.style.backgroundColor));
      colorpicker.uiColortip.show();
    }
  },
  rgb2hex: function (rgb) {
    "use strict";
    rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    function hex(x) {
      return ("0" + parseInt(x, 10).toString(16)).slice(-2);
    }
    return hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
  },
  tip: {
    onClick: function (e) {  // prevent bubbling to the body which would remove the tip
      "use strict";
      e.stopPropagation();
    },
    cellHoverIn: function () {
      "use strict";
      var color = colorpicker.rgb2hex($(this).css("background-color"));
      if (color) {
        $(this).closest(".tooltip.colortip").find(".color-hex input.hex").val(color);
      }
    },
    cellHoverOut: function () {
      "use strict";
      var initColor = $(this).closest('div.cells-cont').attr('data-ziinitcolor');
      if (initColor) {
        $(this).closest('.tooltip.colortip').find('.color-hex input.hex').val(initColor);
      }
    },
    cellClick: function () {
      "use strict";
      var $parent = $(this).closest('.tooltip.colortip'),
         callerId = $parent.attr("data-zilinked"),
            color = colorpicker.rgb2hex($(this).css("background-color"));

      if (callerId && color) {
        $parent.remove();
        $(document.getElementById(callerId)).val("#" + color).change();
      }
    },
    hexInputChange: function () {
      "use strict";
      var $parent = $(this).closest('.tooltip.colortip'),
         callerId = $parent.attr("data-zilinked"),
            color = $(this).val().slice(0, 6);

      if (callerId && color) {
        $parent.remove();
        $(document.getElementById(callerId)).val("#" + color).change();
      }
    }
  }
};

// *****************************
// Wrapper is used for profiling in chrome -> see: chrome://tracing/ and chrome://memory/
// *****************************
var profile = {
  start: function (name) {
    // console.time(name);
  },
  end: function (name) {
    // console.timeEnd(name);
  },
  timestamp: {  // uncomment this to see labeled events inside of chrome timeline profiler
    start: function (label) {
      //console.timeStamp(label + " start");
    },
    stop: function (label) {
      //console.timeStamp(label + " stop");
    }
  }
};


// *****************************
// Inline editing for a dynatree node
// *****************************
function editNode(node) {
  var prevTitle = node.data.title,
    tree = node.tree;
  // Disable dynatree mouse- and key handling
  tree.$tree.draggable("option", "cancel", "div[data-ziclass=grouptree]");
  tree.$widget.unbind();
  // Replace node with <input>
  $(".dynatree-title", node.span).html("<input id='editNode' style='margin-left: -3px; margin-right: -3px;' value='" + prevTitle + "'/>");
  // Focus <input> and bind keyboard handler
  $("input#editNode")
    .focus()
    .keydown(function (event) {
      switch (event.which) {
        case 27: // [esc]
          // discard changes on [esc]
          $("input#editNode").val(prevTitle);
          $(this).blur();
          break;
        case 13: // [enter]
          // simulate blur to accept new value
          $(this).blur();
          break;
      }
    })
    .blur(function (event) {
      // Accept new value, when user leaves <input>
      var title = $("input#editNode").val();
      if (title != node.data.title) {
        sendCommand(node.tree.divTree.parentElement.id, 'rename', [node.data.title, title]);  /*TODO(2K): divTree undocumented*/
      }
      node.setTitle(title);
      // Re-enable mouse and keyboard handlling
      tree.$widget.bind();
      tree.$tree.draggable("option", "cancel", "");
      node.focus();
    });
}


function selectTab(el) {
  "use strict";
  var $list, id, toSelect;
  if (!el) { return; }
  $list = $(el).closest("li");
  if ($list.hasClass("selected")) { return; }


  // activate tab header
  $list.addClass("selected").siblings().removeClass("selected");

  // show tab content
  toSelect = document.getElementById(el.getAttribute("for"));
  if (!toSelect) { return; }
  $(toSelect).addClass("show").siblings("div").removeClass("show");

}


function onSidetabClick(e) {
  "use strict";
  var $li = $(this).closest("li.tabbtn"),
    parent, allTabBtns, ziPath, index;

  if ($li.hasClass("selected")) { return; }

  selectTab(this);

  parent = $li.closest("div.sidetabs")[0];
  ziPath = parent.getAttribute('data-zipath');

  allTabBtns = $(parent).find("li.tabbtn"); //this.parentNode.children;
  index = $(allTabBtns).index($li);

  index = Math.min(allTabBtns.length - 1, Math.max(0, index));

  if (!ziPath) { return; }
  postRequest({ action: 'set', path: ziPath, id: parent.id, format: 'int', data: index });
}

function click2SelectAll() {
  "use strict";
  $(this).focus().select();
  return false;
}

// fix for http://bugs.jqueryui.com/ticket/4429
// (jquery UI sortable doesn't blur focused input fields)
// TODO(DL): remove the code once jQuery UI gets fixed
function blurActiveElement() {
  "use strict";
  if ($(document.activeElement).length) {
    if (typeof document.activeElement.blur !== "undefined") {
      document.activeElement.blur();
    }
  }
}

function getFormattedTime(d, compressed) {
  "use strict";
  if (Object.prototype.toString.call(d) !== '[object Date]') { return ""; }

  return compressed ? '' + d.getFullYear() + '' + (d.getMonth() + 1) + '' + d.getDate() + "_" + d.getHours() + '' + d.getMinutes() + '' + d.getSeconds() :
    '' + d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate() + " " + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds();
}

function mimeToAceMode(type) {
  var mode = "text";

  if (type == "text/x-c") {
    mode = "c_cpp";
  } else if (type == "text/ziseqc") {
    mode = "ziSeqC";
  } else if (type == "application/xml" || type == "text/xml") {
    mode = "xml";
  } else if (type == "application/json") {
    mode = "json";
  }
  return ("ace/mode/" + mode);
}

// small jstree plugin to disable hover behavior
$.jstree.plugins.nohover = function () { this.hover_node = $.noop; };

// *****************************
// Binding Event Handlers
// *****************************
var handlers = {
  refresh: function (parent) {
    "use strict";
    // Insert here all event/property handlers of jQuery
    // that need to be updated if html elements are 
    // inserted dynamically using AJAX.
    profile.start("handlers.refresh");
    profile.timestamp.start("handlers.refresh");
    var sidebar, footer, pages, tabs, num, dialog, $histList;

    if (!parent) return;

    sidebar = parent.querySelectorAll("#sidebar");
    footer = parent.querySelectorAll("table.footer-table");
    pages = parent.querySelectorAll("div.page");
    tabs = parent.querySelectorAll("ul.tab");
    num = parent.querySelectorAll(".num-plotlist");
    dialog = parent.querySelectorAll("table.dialog-table");

    if (sidebar.length) {
      this.attachTo.sidebar($(sidebar));
    }
    if (footer.length) {
      this.attachTo.footer($(footer));
    }
    if (dialog.length) {
      this.attachTo.dialog($(dialog));
    }
    if (tabs.length) {
      this.attachTo.tab($(tabs));
    }
    if (pages.length) {
      this.attachTo.page($(pages));

      $histList = $(pages).find("tbody.histlist-wrapper"); //$('tbody.histlist-wrapper', pages);
      if ($histList.length) {  // if page contains history list, attach special handlers directly to its container
        this.attachTo.histList($histList);
      }
    }

    if (parent.querySelectorAll(".num-plotlist").length) {  // as attachTo.parent contains only numerical related listeners, we can optimize this (~1ms gain)
      this.attachTo.parent($(parent));
    }

    profile.end("handlers.refresh");
    profile.timestamp.stop("handlers.refresh");
  },
  attachTo: {
    sidebar: function ($sidebar) {
      $sidebar
        .on({ "click": sidebar.icon.click, "mousewheel": sidebar.onWheel }, "div.icon");  // listener on $('#sidebar')

      $('div.icon').draggable({
        connectToSortable: "div.container",
        //scope: "tasks",
        helper: 'clone',
        containment: 'document',
        scroll: true,
        distance: 3,
        cursorAt: { top: 22, left: 22 },
        zIndex: -100, // at the beggining hide the helper
        start: sidebar.icon.dragStart,
        drag: sidebar.icon.drag,
        stop: sidebar.icon.dragStop
      });

    },
    footer: function ($footer) {
      $footer
        .on({ "click": handleBtnClick, "keyup": handleBtnClick }, 'button')      // action button
        .on({ "click": handleToggleBtnClick, "keyup": handleToggleBtnClick, "keydown": onBtnKeydown }, 'a.btn')      // custom toggle button
        .on("click", "button.internallink", handleInternalLinkClick)
        .on({ "mouseenter": tooltip.tipEnter, "mouseleave focus click": tooltip.tipLeave }, "[data-zitooltip]")
        .on({ "mousedown": click2SelectAll, "touchstart": click2SelectAll }, '.click-selectall')
        .on({ "click": ziFullScreen.handleBtnClick }, '#zifullscreen');

      // show full screen button if feature supported
      ziFullScreen.initBtn();
    },
    dialog: function ($dialog) {
      "use strict";
      handlers.attachTo.footer($dialog);  // reuse footer listeners as they are the same at the moment

      $dialog.on("change", 'input[type=text],input[type=number]', onChangeInputMain)
        .on({ change: onChangeSelectPost, focus: onFocusBlurSelect, blur: onFocusBlurSelect }, 'select')
        .on({"click": onChangeCopy2Clipboard }, '[data-action=copy2clipboard]');
    },
    parent: function ($parent) {  // this function will be executed on every handlers.refresh call
      "use strict";
      profile.start("handlers.attachTo.parent");
      profile.timestamp.start("handlers.attachTo.parent");

      $parent.find('.num-plotlist').sortable({ // sort numerical plots by dragging them
        distance: 5,
        tolerance: "pointer",
        cursor: "move",
        zIndex: 10,
        update: function (event, ui) { // send newly sorted plots (ony if DOM changed)
          var zipath = $(this).closest('ul.num-plotlist')[0].getAttribute('data-zipath'),
              zivalue;

          if (!ui.item.hasClass("cancel")) {  // if not canceled
            $(this).closest('ul.num-plotlist').find('li.sel').removeClass('sel');  // deselect all
            zivalue = ui.item.closest('.num-plotlist').find('li[data-linked]').map(function () {  // create comma separated  list of selected elements
              var tmpAttr = this.getAttribute('data-linked');
              if (tmpAttr) { return tmpAttr; }
            }).get().join(',');

            if (zipath && zivalue) {
              //console.log('Sending new num-plots order: ' + zivalue);
              postRequest({
                action: 'set',
                path: zipath,
                id: this.id,
                format: "string",
                data: zivalue
              });
            }
          } else {
            return false;
          }
        }
      }).disableSelection()
      .mousedown(blurActiveElement); // force blur (fix for jquery UI sortable blur problem)

      profile.timestamp.stop("handlers.attachTo.parent");
      profile.end("handlers.attachTo.parent");
    },
    tab: function ($tab) {  // this function will be executed only if tab changes (create/destroy)
      "use strict";
      profile.start("handlers.attachTo.tab");
      profile.timestamp.start("handlers.attachTo.tab");

      $tab
      .on("click", 'label.tabaddrow', function () {
        "use strict";
        createRow(this, '');      // sending undefined path because there is no dropped element
        storeRowIndex($(this));   // save the index of the dropped row
      })
      .on('mousedown', 'li.tabbtn', function (evt) {  // close tab with scroll click
        "use strict";

        if (evt.which === 2) {
          evt.preventDefault();
          $(this).find('.tabclose').click();  // close the clicked tab
        }
      })
      .on("mousedown", 'li.tabselect', function (evt) {
        "use strict";
        var parentId, tabId;


        blurActiveElement(); // force blur (fix for jquery UI sortable blur problem)

        if (evt.which !== 1 || $(evt.target).hasClass("tabclose")) { return evt; } // select tab only if the user has clicked with left mouse button && the button is not for tab closing

        parentId = this.getAttribute('data-eventhandler'),
        tabId = this.id;

        if (!parentId || !tabId || $(this).hasClass("selected")) { return evt; }

        sendCommand(parentId, 'tabselect', tabId);

        selectTab(this.querySelector("label"));
        storeRowIndex($(this));  // save the index of the dropped row

      })
      .on("click", 'div.tabclose', function (evt) {
        "use strict";
        evt.stopPropagation();
        var parentId = this.parentNode.getAttribute('data-eventhandler'),
            tabId = this.parentNode.id;  // parent id

        if (!parentId || !tabId) { return evt; }

        sendCommand(parentId, 'tabclose', tabId);
      })
      .on("click", 'div.tabrowclose', function () {
        "use strict";
        var parentId = this.parentNode.getAttribute('data-eventhandler'),
            rowId = this.parentNode.getAttribute('data-ziparent');

        if (!parentId || !rowId) { return evt; }

        postRequest({
          action: 'command',
          id: parentId,
          format: 'rowclose',
          data: rowId
        });

      })
      .closest("div.container").sortable({
        distance: 10,
        containment: 'document',
        appendTo: document.body,
        connectWith: "div.container",
        items: "> ul.tab > li.tabselect",
        placeholder: {
          element: function (event, ui) {
            return $('<li class="tabbtn tab-placeholder"><label></label></li>');
          },
          update: function () {
            return;
          }
        },//"tabbtn tab-placeholder",

        over: function (event, ui) {
          "use strict";
          // console.log("over");
          var addTabBtn = this.querySelector("li.tabaddtab");
          if (!addTabBtn) { return event; }
          addTabBtn.parentNode.insertBefore(ui.placeholder[0], addTabBtn);

        },
        //out: function (event, ui) {
        //  "use strict";
        //  console.log("out");
        //},
        start: function (event, ui) {
          "use strict";
          //var $tabaddtab;
          var addTabBtn;

          //console.log("start");

          if (ui.helper.hasClass("btn icon")) {  // if dragging sidebar icon
            addTabBtn = this.querySelector("li.tabaddtab");
            if (!addTabBtn) { return event; }

            //ui.placeholder[0].style.width = $(addTabBtn).innerWidth() + 'px';
            addTabBtn.parentNode.insertBefore(ui.placeholder[0], addTabBtn);  // append placeholder after last tab button
            $(this).sortable('refreshPositions');  // !Important for correct positioning after moving to new region

          } else { // if dragging tab button
            ui.placeholder.width(ui.helper.width());
            ui.helper.addClass("no-shadow");
          }
        },
        stop: function (event, ui) {
          "use strict";
          //console.log("stop");
          if (ui.item.hasClass("btn icon")) {
            ui.placeholder.css("background-color", "transparent").find("label").text("Loading...");
            ui.item[0].parentNode.replaceChild(ui.placeholder[0], ui.item[0]);  // replace dropped item with placeholder
          } else {
            ui.item.removeClass("no-shadow");
          }
        },
        update: function (event, ui) {
          "use strict";
          var parentId, fromRowId, toRowId, tabId, position, sortedIds;

          if (this === ui.item.closest("div.container")[0]) {  // check to avoid double data sending to the server
            if (ui.sender !== null) {             // BETWEEN-ROW SORT: Item moved between rows and placed to index
              parentId = $(this).closest(".column")[0].id;
              fromRowId = ui.sender[0].id;
              toRowId = this.id;
              tabId = ui.item[0].id;
              position = ui.item.index();

              if (parentId && fromRowId && toRowId && tabId && (position >= 0)) {
                // console.log(" --> Tab " + tabId + " moved from row " + fromRowId + " to row " + toRowId + " and placed on position " + position);
                ui.item.removeClass("selected");
                sendCommand(parentId, 'tabmoveandsort', [fromRowId, toRowId, tabId, position]);
              }

            } else {
              if (ui.item.hasClass("btn icon")) {  // NEW TAB: Item added from sidebar and sorted to index
                //console.log(" --> Item added from sidebar and sorted to index " + ui.item.index());
                createTab($(this).find("li.tabaddtab")[0], ui.item[0].getAttribute("data-zipath"), ui.item.index());

              } else {                            // SAME ROW SORT: Item only resorted to new index
                parentId = this.id;
                sortedIds = $(this).sortable("toArray");

                if (sortedIds.length && parentId) {
                  //console.log(" --> Item only sorted to new index " + ui.item.index());
                  sendCommand(parentId, 'tabsort', sortedIds);
                }
              }
            }
          }
        }
      });

      /*$('label.tabaddrow', $tab).droppable({  // causes wierd behavior when using together with sortable
        greedy: true,
        tolerance: "touch",
        scope: "tasks",
        accept: "div.icon.ui-draggable",
        activeClass: "drag-active",
        hoverClass: "drag-hover-row",
        over: function (e, ui) {
          console.log("over");
        },
        out: function (e, ui) {
          console.log("out");
          //$(this).closest(".container").sortable("enable");
        },
        drop: function (evt, ui) {
          
          evt.stopPropagation();
          console.log(evt);
          console.log(ui);
          createRow(this, ui.draggable.attr('data-zipath'));
          storeRowIndex($(this));  // save the index of the dropped row
          return false;
        }
      });*/

      $('div.separator-evt', $tab.closest(".container")).draggable({
        zIndex: 2800,
        axis: 'y',
        scroll: true,
        cursor: 'row-resize',
        distance: 5,
        //opacity: 0.7,
        helper: function () {
          var separator = document.createElement("div"); separator.className = "separator"; separator.style.width = this.offsetWidth + "px";
          return separator;
          // return $(this.cloneNode(false)).css('width', this.offsetWidth)[0];
        },
        stop: separatorDragStop
      });

      profile.end("handlers.attachTo.tab");
      profile.timestamp.stop("handlers.attachTo.tab");
    },
    page: function ($page) {  // this function will be executed only if page (tab's content) changes (create/destroy)
      "use strict";
      profile.start("handlers.attachTo.page");
      profile.timestamp.start("handlers.attachTo.page");
      var counter = 0;
      $page
      .on({ mouseenter: tooltip.tipEnter, mouseleave: tooltip.tipLeave, focus: tooltip.tipLeave, click: tooltip.tipLeave }, "[data-zitooltip]")
      .on({ "click": handleToggleBtnClick, "keyup": handleToggleBtnClick, "keydown": onBtnKeydown }, 'a.btn')      // custom toggle button
      .on({ "click": handleBtnClick, "keyup": handleBtnClick }, 'button')      // action button
      .on({ "click": handleSpinBtnClick, "keyup": handleSpinBtnClick }, 'button.spinner')      // spin button
      .on({ change: onChangeSelectPost, focus: onFocusBlurSelect, blur: onFocusBlurSelect }, 'select')
      .on("change", 'input[type=text],input[type=number]', onChangeInputMain)
      .on({ click: handleNumPlot, touchend: handleNumPlot }, '.num-plotlist li') // select num plot to be active || closed
      .on("click", 'button.internallink', handleInternalLinkClick)  // custom internal link button
      // .on("click", '.showActionDialog', actionDialog.open)  // custom internal link button
      .on({
        mousedown: handleSVG.onClick,  // hiding multi navigation menu
        touchstart: handleSVG.onClick, // hiding multi navigation menu
        mouseleave: handleSVG.onBorderEvent,
        mouseup: handleSVG.onBorderEvent//,
        //mousewheel: handleSVG.wheel
      }, '.svgplotborder')
      .on("mousewheel", ".svg-zoom", handleSVG.onWheel)
      .on("mousedown", '.click-selectall', click2SelectAll)  // on click selects all the text inside the input field
      .on("click", ".plotmath-cont [data-action]", plotMath.onClickAction)
      .on("dblclick", ".plotmath-cont tr.selectable > td", plotMath.onDoubleClick)
      /*.on("mousewheel", 'li.numplot', function (e, delta) {
      var $parent = $(this).closest("li");

      if (!$parent.hasClass("sel")) {
      $parent.click();
      } else {
      handleSVG.onWheel(e, delta);
      }
      })*/
      //.on({ mouseenter: navBtn.hover, mouseleave: navBtn.hover }, ".navbtn")
      .on({
        keypress: onKeypressInputMain,  // keypressHandler
        keydown: onKeydownInputMain,    // keyUpDownHandler; keydown has to be used because keypress doesn't detect arrow keys. 
        focus: onFocusInputMain,        // keyUpDownHandler; on the other hand, keydown doesn't return correct characters 
        focusout: onFocusoutInputMain   // keyUpDownHandler
      }, 'input[type=text]')
      .on("click", 'div.expcolbtn', function () {
        var zipath = this.getAttribute('data-zipath');
        if (zipath) { postRequest({ action: 'set', path: zipath, id: this.id, data: $(this).is(".checked") ? 0 : 1 }); }
      })
      .on("change", 'select.diosFmtSel', diosFormatSelectChange)
      .on("click", 'button.inst_opt', function () {
        "use strict";
        var dialog = document.getElementById("dialogInstOpt"),
          realInput = $(this).siblings("input.fcode-real")[0];

        if (!realInput || !dialog) return;

        //document.getElementById("usrCode").value = "";  // clear the input field
        dialog.setAttribute("data-linked", realInput.id);  // store the id in the dialog of the real feature code unput.
        $(dialog).dialog("open");
      })
      //.on("click", 'button.sel_devBtn', function () {
      //  "use strict";

        // send empty message which will as response get all the
        // messages of the current session and place them to the
        // message box inside the dialog
      //  messageSync('message', {
      //    action: 'command',
      //    format: '',
      //    data: ""
      //  }, refreshHandler.onSuccess);

        //$(document.getElementById("seshDialog")).dialog("open");
      //})
      .on({ mousedown: onSidetabClick, touchstart: onSidetabClick }, "div.sidetabs > ul > li.tabbtn > label") // handle sidetab click
      .on("click", "button.download", function () {  // download
        "use strict";
        var handler = this.getAttribute("data-eventhandler"),
          action = this.getAttribute("data-action");

        if (!handler || !action) return;

        download('download?action=' + action + '&id=' + handler);
      }).on("dragstart", ".dragout", function (e) {
        "use strict";
        var downloadUrl = this.dataset.downloadurl
          .replace('_ziBaseURL_', location.origin)
          .replace('_ziSessionId_', parseInt(getZiSessionId()))
          .replace('_ziTimestamp_', getFormattedTime(new Date(), true));
        counter = 0;
        e.originalEvent.dataTransfer.setData('DownloadURL', downloadUrl);
      }).on("dragover", ".drop2upload", function (e) {
        "use strict";
        e.stopPropagation();
        e.preventDefault();
        // console.log("dragover");
      }).on("dragenter", ".drop2upload", function (e) {
        "use strict";
        e.stopPropagation();
        e.preventDefault();
        counter++
        // console.log("dragenter");
        $(this).addClass("active");
      }).on("dragleave", ".drop2upload", function (e) {
        "use strict";
        e.stopPropagation();
        e.preventDefault();
        counter--;
        // console.log("dragleave");
        if (counter === 0) {
          $(this).removeClass("active");
        }
      }).on("click", ".drop2upload", function (e) {  // click on droppable area should force upload dialog
        "use strict";
        var $fileInput = $(this).closest("td").find("input[type=file]");
        if (!$fileInput.length) { return; }

        $fileInput.val(null);  // clear the field!
        $fileInput.click();
      }).on("drop", ".drop2upload", function (e) {
        "use strict";
        var action = this.getAttribute("data-action"),
          parentId = this.getAttribute("data-linked"),
          urlString;
        counter = 0;
        if (!action) {log.error("No upload action attribute defined!"); return; }
        if (!parentId) {log.error("No parent id attribute defined!"); return; }

        urlString = '/upload?action=' + action + '&id=' + parentId;

        e.stopPropagation();
        e.preventDefault();

        $(this).removeClass("active");
        ziUpload(e.originalEvent.dataTransfer.files, urlString);
      }).on("click", ".nodedialog-open", nodeDialog.open);

      // RFM tree
      $('.rfm-cont', $page)
        .on("click", "[data-action]", rfmHandle.onClickAction)
        .on("dblclick", "[data-action]", rfmHandle.onClickAction)
        .find('div.rfm-jstree').jstree({
        "types": {
          "default": { "icon": "jstree-folder" },
          "root": { "valid_children": ["file, folder"] },
          "folder": { "icon": "jstree-folder", "valid_children": ["file"] },
          "file": { "icon": "jstree-file", "valid_children": [] }
        },
        'core': {
          "force_text": true,  // important for correct handling of escape caracters like '&'
          "animation" : 0,
          'check_callback': function (operation, node, parent, position, more) {
            return true; // allow everything
          },
          'themes' : { 'responsive' : false, 'variant' : 'small', 'stripes' : false },
          'data': []
            //function (node, cb) {
            //var parentId = $(document.getElementById(this.element.context.id)).closest('.rfm-cont')[0].id;
            //if (!parentId) { log.error("No parent of the jsTree found!"); return; }

            // sendCommand(parentId, "lazyload", [node.id]);  // node.id is id of the father. If root node needs to be loaded, the node.id will be #
          //}
        },
        "plugins": ["contextmenu", "types", "wholerow", "nohover"],  // "dnd"
        "contextmenu": { items: rfmHandle.getContextMenuItems, show_at_node: false }
      }).on("changed.jstree", rfmHandle.onNodeChange)
        .on("rename_node.jstree", rfmHandle.onNodeRename)
        .on("after_open.jstree", rfmHandle.onNodeToggle)
        .on("after_close.jstree", rfmHandle.onNodeToggle)
        .on("load_node.jstree", function (e, obj) {
          if (!obj.status) {
            // console.log("should load node children");
            var n = obj.instance.get_node(obj.node, true),
              parentId = rfmHandle.getParentId(this);

            if (!parentId) { log.error("No parent of the jsTree found!"); return false; }

            n.addClass("jstree-loading").attr('aria-busy', true);
            sendCommand(parentId, "load_node", [obj.node.id]);
          }
          //this.get_node(obj, true).addClass("jstree-loading").attr('aria-busy', true);
        });

      $('div.sidetabs', $page)
        /*.tabs({
        activate: function (event, ui) {
          var ziData = $(this).find('li.plot-tabs-name').index(ui.newTab),
        ziPath = this.getAttribute('data-zipath'),
          ziId = this.id;

          if (ziPath && ziId && !($(this).hasClass("clb-sel"))) { postRequest({ action: 'set', path: ziPath, id: ziId, format: 'int', data: ziData }); }
          $(this).removeClass("clb-sel"); // callback from the server sets a flag clb-sel when it triggers tab selection to avoid redundant postrequest
        }
      })*/
      .droppable({ // close num-plot on dragg-out
        accept: "li[data-linked]",
        tolerance: "pointer",
        over: function (evt, ui) {
          if ($(this).closest('div.page')[0].id === $(ui.draggable).closest('div.page')[0].id) {
            $(this).addClass("warning");
          }
        },
        out: function (evt, ui) {
          if ($(this).closest('div.page')[0].id === $(ui.draggable).closest('div.page')[0].id) {
            $(this).removeClass("warning");
          }
        },
        drop: function (evt, ui) {
          if ($(this).closest('div.page')[0].id === $(ui.draggable).closest('div.page')[0].id) {  // if dragged to plot_tabs inside of the same tab
            $(ui.draggable).find('rect[class="close-btn-bg"]').click();  // emulate click on plot close btn
            ui.draggable.addClass("cancel")[0].style.display = 'none';
            $(this).removeClass("warning");
          }
        }
      });

      $('div[data-ziclass=tree]', $page).dynatree({
        checkbox: true,
        selectMode: 3,
        imagePath: 'icons/',
        minExpandLevel: 3,
        serverUpdate: false, // custom flag, set to 'true' when selection is updated from the server to skip onSelect()
        onSelect: function (select, node) {
          var selNodes, selKeys, parentId, zipath;
          if (node.tree.serverUpdate) { return; } // skip onSelect() if selection is updated from the server
          // Display list of selected nodes
          selNodes = node.tree.getSelectedNodes();
          // convert to keys array
          selKeys = $.map(selNodes, function (node) {
            if (!node.childList) {
              return node.data.key; // return terminal leafs only
            }
          });
          parentId = $(this.divTree).attr('data-ziparent');
          zipath = $(document.getElementById(parentId)).attr('data-zipath');
          if (zipath) {
            postRequest({ action: 'set', path: zipath, id: $(this).attr('id'), data: selKeys });
          }
        },
        onClick: function (node, event) {
          // We should not toggle, if target was "checkbox", because this
          // would result in double-toggle (i.e. no toggle)
          if (node.getEventTargetType(event) === "title") {
            node.toggleSelect();
          }
        },
        onKeydown: function (node, event) {
          if (event.which === 32) {
            node.toggleSelect();
            return false;
          }
        },
        /*dnd: {
        onDragStart: function (node) {
        //logMsg("tree.onDragStart(%o)", node);
        console.log(node);
        node.tree.$tree.draggable({
        appendTo: ".page"
        });
        //if (node.data.isFolder)
        //return false;
        //return true;
        },
        onDrop: function (node) {
        console.log(node);
        }
        },
        */
        // The following options are required to have more than one tree on one page:
        cookieId: "dynatree-cookie-" + $(this).attr('id'),
        idPrefix: "dynatree-" + $(this).attr('id') + "-"
      });


      $('div[data-ziclass=singletree]', $page).dynatree({
        checkbox: false,
        selectMode: 3,
        imagePath: 'icons/',
        minExpandLevel: 2,
        serverUpdate: false, // custom flag, set to 'true' when selection is updated from the server to skip onSelect()
        onClick: function (node, event) {
          if (node.hasChildren()) { // non-leaf nodes
            if (node.getEventTargetType(event) == "title") {
              node.tree.visit(function(n) {
                if (!node.isDescendantOf(n)) n.expand(false);
              });  // collapse all other branches in the tree
            }
          } else {
            node.tree.visit(function(n) { n.expand(false); });  // collapse all nodes in the tree
            sendCommand($(node.tree.divTree).closest('.single-tree-cont').find(".single-tree")[0].id/*TODO(2K): divTree undocumented*/, 'select', node.data.key);
            nodeDialog.onClickAction(node.tree.divTree);
          }
        },
        // The following options are required to have more than one tree on one page:
        cookieId: "dynatree-cookie-" + $(this).attr('id'),
        idPrefix: "dynatree-" + $(this).attr('id') + "-"
      });


      $('div[data-ziclass=grouptree]', $page).dynatree({
        clickFolderMode: 1,
        checkbox: true,
        selectMode: 2,
        imagePath: 'icons/',
        minExpandLevel: 1,
        onSelect: function (select, node) {
          if (node.tree.serverUpdate) { return; } // skip onSelect() if selection is updated from the server
          if (node.childList) { return; } // skip non-leaf nodes
          sendCommand(node.tree.divTree.parentElement.id/*TODO(2K): divTree undocumented*/, 'setactive', [node.data.path, select]);
        },
        onActivate: function (node) {
          if (node.tree.isUserEvent()) {
            sendCommand(node.tree.divTree.parentElement.id/*TODO(2K): divTree undocumented*/, 'select', node.data.path);
          }
        },
        onClick: function (node, event) {
          if (node.data.isAddGroup || node.data.isDelete) { return false; }  // Add group and Delete should not be selectable
          if (node.data.isGroup && event.shiftKey) {
            editNode(node);
            return false;
          }
        },
        onDblClick: function (node, event) {
          if (node.data.isAddGroup || node.data.isDelete) { return false; }  // Add group and Delete should not be editable
          if (node.data.isGroup) {
            editNode(node);
            return false;
          }
        },
        onKeydown: function (node, event) {
          if (node.data.isAddGroup || node.data.isDelete) { return false; }  // Add group and Delete should not be editable
          if (node.data.isGroup) {
            switch (event.which) {
              case 113: // [F2]
                editNode(node);
                return false;
              case 13: // [enter]
                editNode(node);
                return false;
            }
          }
        },
        dnd: {
          // "Drag away" (for delete) is implemented as a combination of the following rules:
          //   1. when node drag is started, we assume it will be dropped nowhere -> mark for delete
          //   2. when drag enters a known node of the tree, no delete should happen -> remove delete mark
          //   3. when drag leaves the known node of the tree, we again assume the dragged node will be dropped nowhere -> mark for delete
          //   4. when drag of the node is stopped, delete it if marked for delete.
          // There is one problem, however, with this algorithm: dynatree always calls onDragLeave before onDragStop.
          // To overcome this problem, marking at point 3 is delayed by 100ms, see also comment in onDragLeave.
          autoExpandMS: 500,
          preventVoidMoves: true,
          revert: false,
          onDragStart: function (node) {
            if (node.data.isAddGroup || node.data.isDelete) { return false; }  // Add group and Delete should not be draggable
            if (node.data.leaveNoEnter) {
              clearTimeout(node.data.leaveNoEnter);
              delete node.data.leaveNoEnter;
            }
            node.data.dragAway = true;
            return true;
          },
          onDragStop: function (node) {
            if (node.data.leaveNoEnter) {
              clearTimeout(node.data.leaveNoEnter);
              delete node.data.leaveNoEnter;
            }
            if (node.data.dragAway) {
              delete node.data.dragAway;
              if (node.data.isGroup) {
                if (!node.childList) { // node.childList is not documented, but node.data.children is not properly updated on node.move().
                  sendCommand(node.tree.divTree.parentElement.id/*TODO(2K): divTree undocumented*/, 'deletegroup', node.data.title);
                  node.remove();
                }
              } else {
                sendCommand(node.tree.divTree.parentElement.id/*TODO(2K): divTree undocumented*/, 'deletesignal', node.data.path);
                node.remove();
              }
            }
          },
          onDragEnter: function (node, sourceNode) {
            // Controls symbol that appears next to the node when drag object enters it (drop mode):
            //   - false: nothing
            //   - 'over', 'before', 'after': respective symbol/mode
            // In case drag object corresponds to another dynatree node, sourceNode is set, otherwise not
            if (!sourceNode) { // Prohibit dropping of non-dynatree objects on a node
              return false;
            }
            if (node.tree != sourceNode.tree) { // Prohibit interaction with another tree (behave like drag-away)
              return false;
            }
            if (sourceNode.data.leaveNoEnter) { // Cancel delayed entering to drag-away
              clearTimeout(sourceNode.data.leaveNoEnter);
              delete sourceNode.data.leaveNoEnter;
            }
            if (sourceNode.data.dragAway) { // Cancel drag-away
              delete sourceNode.data.dragAway;
            }
            if (!sourceNode.data.isGroup && node.isDescendantOf(sourceNode.parent)) { // Prohibit dropping into an own group (drop indicator)
              return false;
            }
            if (sourceNode.isDescendantOf(node)) { // Prohibit dropping onto an own group
              return false;
            }
            if (sourceNode.data.isGroup && !node.data.isDelete) { // Prohibit dropping groups on anything but delete
              return false;
            }
            return 'over';
          },
          onDragLeave: function (node, sourceNode) {
            // This is a workaround to differentiate between leave right before drag stop and leave by drag away.
            // We assume that if drag stop happens within 100ms after leave, then this leave was triggered by the drop,
            // and the entered node was not left by the dragged node.
            sourceNode.data.leaveNoEnter = setTimeout(
                function () {
                  sourceNode.data.dragAway = true;
                  delete sourceNode.data.leaveNoEnter;
                },
                100);
          },
          onDragOver: function (node, sourceNode, hitMode) {
            // Controls symbol that appears next to sourceNode drag object when it is dragged over something (drop allowed or not):
            //   - false: forbidden symbol
            //   - default: ok symbol
            // In dragging over another dynatree node, node is set, otherwise not
            // In case drag object corresponds to another dynatree node, sourceNode is set, otherwise not
            if (hitMode === "before" || hitMode === "after") { // Prohibit dropping before or after, only over
              return false;
            }
            if (!node) { // Prohibit dropping on root or non-dynatree object
              return false;
            }
            if (!sourceNode) { // Prohibit moving other objects into the tree
              return false;
            }
            if (node.tree != sourceNode.tree) { // Prohibit dropping from another tree
              return false;
            }
            if (!sourceNode.data.isGroup && node.isDescendantOf(sourceNode.parent)) { // Prohibit dropping into an own group
              return false;
            }
            if (sourceNode.isDescendantOf(node)) { // Prohibit dropping onto an own group
              return false;
            }
            if (sourceNode.data.isGroup && !node.data.isDelete) { // Prohibit dropping groups on anything but delete
              return false;
            }
            if (!node.data.isAddGroup && !node.data.isDelete &&
                sourceNode.data.type != node.data.type) { // Prohibit dropping to a wrong type (unless we add a new group or delete)
              return false;
            }
            // node.childList is not documented, but node.data.children is not properly updated on node.move().
            if (node.data.isDelete && sourceNode.data.isGroup && sourceNode.childList) { // Prohibit dropping non-empty groups to delete
              return false;
            }
          },
          onDrop: function (node, sourceNode, hitMode, ui, draggable) {
            var rootNode, targetGroupNode;
            if (node.data.isAddGroup) { // Create a new group
              sendCommand(node.tree.divTree.parentElement.id/*TODO(2K): divTree undocumented*/, 'newgroup',
                [sourceNode.data.path, sourceNode.parent.data.title]);
            } else if (node.data.isDelete) {
              // TODO(2K): code duplication with onDragStop above
              if (sourceNode.data.isGroup) {
                if (!sourceNode.childList) { // node.childList is not documented, but node.data.children is not properly updated on node.move().
                  sendCommand(sourceNode.tree.divTree.parentElement.id/*TODO(2K): divTree undocumented*/, 'deletegroup', sourceNode.data.title);
                  sourceNode.remove();
                }
              } else {
                sendCommand(sourceNode.tree.divTree.parentElement.id/*TODO(2K): divTree undocumented*/, 'deletesignal', sourceNode.data.path);
                sourceNode.remove();
              }
            } else {
              targetGroupNode = node.data.isGroup ? node : node.parent;
              sendCommand(node.tree.divTree.parentElement.id/*TODO(2K): divTree undocumented*/, 'signalmove',
                [sourceNode.data.path, sourceNode.parent.data.title, targetGroupNode.data.title]);

              sourceNode.move(targetGroupNode, hitMode);
              sourceNode.expand(true); // expand the drop target
            }
          }
        },
        // The following options are required to have more than one tree on one page:
        cookieId: "dynatree-cookie-" + $(this).attr('id'),
        idPrefix: "dynatree-" + $(this).attr('id') + "-"
      });

      var $nodeDialog = $(".node-dialog", $page);
      if ($nodeDialog.length) {
        $.each($nodeDialog, function(index, value) {
          $(value).dialog({
            closeOnEscape: true,
            title: "Node Tree",
            resizable: false,
            width: "260px",
            //height: 235,
            modal: true,  // no overlay background
            draggable: false,
            autoOpen: false,
            dialogClass: 'zi-dialog tree-dialog',
            appendTo: $(value).closest(".single-tree-cont")
          });
        });
      }

      var $editField = $page.find(".zi_highlighter_editor"), i;
      if ($editField.length) {
        
        $editField.each(function (index, el) {
          var editor = ace.edit(el),
            mime = el.getAttribute("data-mimetype"),
            readOnly = el.hasAttribute("readonly"),
            mode = mimeToAceMode(mime);

          editor.getSession().setMode(mode);
          if (readOnly) {
            editor.setReadOnly(true);
          }

          editor.$blockScrolling = Infinity;

          codeEditor.setTheme();
          editor.setBehavioursEnabled(true);  // auto pairing of quotes & brackets
          editor.getSession().setTabSize(2);

          if (!readOnly) {
            var parentId = $(editor.container).closest(".figure").attr("id");
            editor.on('change', function (e) {
              if (editor.isFocused()) {
                
                // sendCommand(parentId, "program_changed", [editor.getValue()]);
                postRequest({
                  action: 'command',
                  id: parentId,
                  format: "program_changed",
                  path: "",  // hacky solution: important to define path attribute to avoid data split on ","
                  data: [editor.getValue()]
                });
              }
            });
          }

          editor.commands.addCommands([{
            name: 'saveFile',
            bindKey: {
              win: 'Ctrl-S',
              mac: 'Command-S',
              sender: 'editor|cli'
            },
            exec: function () {  // possible arguments: env, args, request
              postRequest({
                action: 'command',
                id: parentId,
                format: "program_save",
                path: "",  // hacky solution: important to define path attribute to avoid data split on ","
                data: []
              });
            }
          },
          {
            name: 'saveFileAs',
            bindKey: {
              win: 'Ctrl-Shift-S',
              mac: 'Command-Shift-S',
              sender: 'editor|cli'
            },
            exec: function () {
              postRequest({
                action: 'command',
                id: parentId,
                format: "program_saveas",
                path: "",  // hacky solution: important to define path attribute to avoid data split on ","
                data: []
              });
            }
          }]);

          if (mode == "ace/mode/ziSeqC") {
            ace.config.loadModule("ace/ext/language_tools", function (lt) {
              editor.setOptions({
                enableSnippets: true,
                enableBasicAutocompletion: true,
                enableLiveAutocompletion: true
              });
            });
            // initialize ziSeqC specific autocomplete code
            codeEditor.initZiSeqcAutocomplete();
          }

        });
      }

      profile.end("handlers.attachTo.tab");
      profile.timestamp.stop("handlers.attachTo.tab");
    },
    histList: function ($containers) {      // HISTORY LIST Listeners
      "use strict";
      profile.timestamp.start("handlers.attachTo.histlist");

      $('table.hlist_table', $containers).selectable({  // jquery UI selectable
        filter: "tr",
        distance: 3,
        cancel: "input:not([readonly]),textarea,button,select,option",
        start: function (event, ui) {
          $(event.target).find('input.focused').blur();
          $(event.target).find('tr[aria-selected=true]').attr('aria-selected', 'false');
        },
        stop: historyList.postSelRows,
        selected: function (event, ui) {
          $(ui.selected).attr('aria-selected', 'true');
        },
        unselected: function (event, ui) {
          $(ui.unselected).attr('aria-selected', 'false');
        }
      });

      $containers
      .on("click", 'tr.hlist_row.selectable', function (e) {  // click event  listener
        var $parent = $(this).closest('.histlist-body'),
           //     pos = $parent.find('tr').index($(this)),
           // last_pos = $('body').data('last_pos'),
           $focused = $parent.find('input.focused');

        if (!$(e.target).hasClass("focused") && $focused.length) {
          $focused.blur();
        } else {  // at the moment server rejects multiple changes that came in one poll so only blur or select can be sent
          advanceTableRowSel(e, this);
          historyList.postSelRows(e);
        }
      })
      .on("click", 'input.hlist_cpicker', function (e) {
        if (!($(this).closest('tr.selectable').attr("aria-selected") === "true")) {  // if row is not selected
          $(this).closest('tr.selectable').click();
        }
        colorpicker.show(e);
      })
      .on("dblclick", 'input.hlist_signame', function (e) {  // double click event listener
        e.stopPropagation();
        e.preventDefault();
        $(this).removeAttr('readonly').addClass("focused").focus();
      }).on("focusout", 'input.hlist_signame', function () {
        this.setAttribute('readonly', 'readonly');
        $(this).removeClass("focused");
      })
      .on("click", 'a.btn.hlist_act', function (e) {  // checkbox click event listener
        var $parent = $(this).closest('.histlist-body'),
        zichecked = this.getAttribute('data-zichecked'),
       isSelected = ($(this).closest('tr.selectable').attr("aria-selected") === "true"),
         $affectedRows;

        e.stopPropagation();

        if (!isReadonly(this) && zichecked) {

          if (isSelected) {  // row already selected
            $affectedRows = $parent.find('tr[aria-selected=true]');
          } else {
            $affectedRows = $(this).closest('tr.selectable');
          }

          $affectedRows.find("a.btn.hlist_act[data-zichecked=" + zichecked + "]").addClass("waiting");

          if (zichecked === "true") {
            $affectedRows.removeClass("row-active");
          } else {
            $affectedRows.addClass("row-active");
          }

          historyList.postActRows(e);
        }
      })
      .on("click", '.list-action-btn', historyList.handleGlobalEvt);
      // END of history list listeners
      profile.timestamp.stop("handlers.attachTo.histlist");
    }
  }
};

function escapeHTML(str) {
  return str.replace(/&/g, "&#38;").replace(/"/g, "&#34;").replace(/'/g, "&#39;").replace(/</g, "&#60;");
};

// Handlers for remote file manager
var rfmHandle = {
  getParentId: function (el) {
    var parent = $(el).closest('.rfm-cont')[0];
    return parent ? parent.id : false;
  },
  onClickAction: function (e) {
    var parentId = rfmHandle.getParentId(this),
      operation = this.getAttribute("data-action"),
      ref, sel, sortDirection;

    if (!parentId) { log.error("No parent of the jsTree found!"); return false; }
        
    if (operation == "rename_nodes") {
      ref = $(document.getElementById(parentId)).find('div.rfm-jstree').jstree(true);
      if (!ref) { return false; }

      sel = ref.get_selected();
      if (!sel.length) { return false; }

      // if (ref.get_node(sel[0]).data && ref.get_node(sel[0]).data.readonly) { return false; }

      sel = sel[0];
      $(document.getElementById(sel + "_anchor")).click();
      ref.edit(sel);

      return;
    } else if (operation == "select_listrow") {
      // TODO(DL): Not nice solution
      ref = $(document.getElementById(parentId)).find('div.rfm-jstree').jstree(true);
      if (!ref) { return; }

      sel = advanceTableRowSel(e, this);
      ref.deselect_all();

      if (e.type === "dblclick") {
        ref.select_node(sel, true);
        sendCommand(parentId, "select_nodes", sel);
        if (ref.get_node(sel).type === "folder") {
          ref.open_node(sel);  // force node opening. This will trigger silent node loading on the server
        }
      } else {
        ref.select_node(sel, true);  // prevent event creation by setting 2nd argument to true
        sendCommand(parentId, "select_listrow", sel);
      }
      

      return;
    } else if (operation === "upload_nodes") {
      ref = this.getAttribute("data-linked");

      $(document.getElementById(ref)).val(null).click();
      return;
    } else if (operation === "download_nodes") {
      download('download?action=download_nodes&id=' + parentId);
      return;
    } else if (operation === "folderview_sort") {
      sortDirection = (this.getAttribute("aria-sort") === "descending") ? "ascending" : "descending";

      sendCommand(parentId, operation, [$(this).index()]);
      return;
    }

    // on right click contextmenu example:
    // $('div.rfm-jstree').jstree(true).show_contextmenu($("#c0p1t10p1cfrfmjstree_n7"), 100, 100)

    sendCommand(parentId, operation, []);
  },
  onNodeChange: function (e, data) {  //  .on("select_node.jstree", function (e, data) {
    if (data.action === "select_node" || data.action === "deselect_node") {
      var parentId = rfmHandle.getParentId(this);
      if (!parentId) { log.error("No parent of the jsTree found!"); return; }

      // data.instance.toggle_node(data.node); // toggle nodes
      sendCommand(parentId, "select_nodes", data.selected);
    }
  },
  onNodeRename: function (e, data) {  //  .on("select_node.jstree", function (e, data) {
    var parentId = rfmHandle.getParentId(this);
    if (!parentId) { log.error("No parent of the jsTree found!"); return; }

    sendCommand(parentId, "rename_nodes", data.text);
  },
  onNodeToggle: function (event, data) {
    var parentId = rfmHandle.getParentId(this),
      selEls = [], selIds = [], i;
    if (!parentId) { log.error("No parent of the jsTree found!"); return; }

    selEls = $(this).closest(".rfm-jstree").find("[aria-expanded='true']");
    for (i = 0; i < selEls.length; i++) {
      selIds.push(selEls[i].id)
    }
    // console.log(selIds);
    sendCommand(parentId, "opened_nodes", selIds);
  },
  getContextMenuItems: function customMenu(node) {
    // The default set of all items
    var parentId = rfmHandle.getParentId(document.getElementById(node.id)), items;
    if (!parentId) { log.error("No parent of the jsTree found!"); return false; }

    items = {
      copyNodes: {
        label: "Copy",
        _disabled: false,
        action: function (data) {
          sendCommand(parentId, "copy_nodes");
        }
      },
      cutNodes: {
        label: "Cut",
        _disabled: false,
        action: function (data) {
          sendCommand(parentId, "cut_nodes");
        }
      },
      pasteNodes: {
        label: "Paste",
        _disabled: false,
        action: function (data) {
          var ref = ref = $.jstree.reference(data.reference);
          if (!ref) { log.error("No reference of the jsTree found!"); return; }

          sendCommand(parentId, "paste_nodes", ref.get_selected());
        }
      },
      newNodes: {
        label: "New Folder",
        _disabled: false,
        action: function (data) {
          sendCommand(parentId, "new_nodes");
        },
        separator_before: true
      },
      deleteNodes: {
        label: "Delete",
        _disabled: false,
        action: function (data) {
          sendCommand(parentId, "delete_nodes");
        }
      },
      renameNodes: {
        label: "Rename",
        _disabled: false,
        action: function (data) {
          var inst = $.jstree.reference(data.reference),
            obj = inst.get_node(data.reference),
            sel = inst.get_selected(), index;

          if (sel.length > 1) {
            index = sel.indexOf(obj.id);
            if (index > -1) { sel.splice(index, 1); }  // remove clicked node from selected array 
            inst.deselect_node(sel);  // deselect rest of the nodes
          }

          inst.edit(obj);
        }
      },
      refreshNodes: {
        label: "Refresh",
        _disabled: false,
        action: function (data) {
          sendCommand(parentId, "refresh_nodes");
        },
        separator_before: true
      },
      downloadNodes: {
        label: "Download",
        _disabled: false,
        action: function (data) {
          download('download?action=download_nodes&id=' + parentId);
        },
        separator_before: true
      },
      uploadNodes: {
        label: "Upload",
        _disabled: false,
        action: function (data) {
          // TODO(DL): this is not so nice
          $(document.getElementById(parentId)).find("button[data-action=upload_nodes]").click();

          //sendCommand(parentId, "upload_nodes");
        }
      },
      swUpdate: {
        label: "SW Update",
        _disabled: false,
        action: function (data) {
          sendCommand(parentId, "swupdate");
        },
        separator_before: true
      },
    };

    if (node.type !== "folder") {
      // Disable some menu items
      items.pasteNodes._disabled = true;
      items.newNodes._disabled = true;
      items.uploadNodes._disabled = true;
    }

    if (node.data.readonly === true) {
      items.deleteNodes._disabled = true;
      items.renameNodes._disabled = true;
      items.cutNodes._disabled = true;
    }

    if (node.data.swupdate !== true) {
      delete items.swUpdate;
    }

    return items;
  }
};

function ziUpload(files, urlString) {
  "use strict";
  var formData;

  if (!files.length) { console.error("No files to upload!"); return false; }
  if (!urlString) { console.error("No upload url provided!"); return false; }

  for (var i = 0; i < files.length; i++) {
    formData = new FormData();
    formData.append("userfile", files[i]);

    //if (usingWebSocket) {
    //  webSocket.send('ziSessionId: ' + getZiSessionId() + '\ncommand: upload\ndata: ' + formData);
    //} else {
    var request = $.ajax({  // using ajax instead of ajaxQueue avoid blocking of the UI
        xhr: function () {
          var xhr = new window.XMLHttpRequest();
          //Upload progress
          xhr.upload.addEventListener("progress", function (evt) {
            if (evt.lengthComputable) {
              var percentComplete = ((evt.loaded / evt.total) * 100).toFixed(1);
              setMsgDialog({
                text: "Uploaded: " + percentComplete + "%",
                progress: percentComplete, title: "Uploading...",
                buttons: {
                  cancel: {
                    onClick: function (e) {
                      "use strict";
                      request.abort();
                    }
                  }
                }
              });
            }
          }, false);
          return xhr;
        },
        type: "POST",
        url: urlString,
        headers: { "ziSessionId": getZiSessionId() },
        // dataType: "xml",  // important to leave out for correct handlin in FF
        cache: false,
        data: formData,
        processData: false,
        contentType: false,  // Important to set to false in order to send the correct content type header that includes boundary key-value pair
        success: dummyFn,  // do nothing! Server returns html like: <html><head><title>Accepted</title></head><body><h1>202 Accepted</h1></body></html>
        error: function () {  // in case of error (also applies for user abort/cancel), close the dialog
          setTimeout(function () {
            "use strict";
            var $dialog = $(document.getElementById(msgDialog.id));
            $dialog.dialog('close');
          }, 80);
        }
      });
    //}
  }
}

function advanceTableRowSel(e, el) {
  "use strict";
  var $parent = $(el).closest("table"),
    //parentId = $parent[0].id,
    pos = $parent.find('tr').index($(el)),
    last_pos,
    $selectedRows = [], selectedIds = [];

  if (!$parent.length) return null;

  last_pos = $parent.attr("data-lastselpos") || 0;

  if (e.ctrlKey) {
    el.setAttribute("aria-selected", el.getAttribute("aria-selected") === "true" ? "false" : "true");
    $parent.attr("data-lastselpos", pos);  // store the position
  } else if (e.shiftKey) {
    $parent.find('tr[aria-selected=true]').attr('aria-selected', 'false');
    $parent.find('tr[aria-selected]').slice(Math.min(pos, last_pos), Math.max(pos, last_pos) + 1).attr('aria-selected', 'true');
  } else {  // simple click
    //if (e.type === "click" && el.getAttribute("aria-selected") === "true" && ($(el).siblings("[aria-selected=true]").length === 0)) { // check if the same element is clicked again - no need to update
    //  return null;
    //} else {
      $(el).attr('aria-selected', 'true').siblings().attr('aria-selected', 'false');
      $parent.attr("data-lastselpos", pos);  // store the position
    //}
  }
  $selectedRows = $parent.find("tr[aria-selected=true]");
  // create array of selected row ids
  for (var i = 0; i < $selectedRows.length; i++) {
    selectedIds.push($selectedRows[i].id || $selectedRows[i].getAttribute("data-linked"));
  }
  return selectedIds;
}

// *****************************
// History list event handlers
// *****************************
var historyList = {
  handleGlobalEvt: function (e) {  // global select/activate buttons event listener
    "use strict";
    var action = this.getAttribute('data-action'),
      $wrapper = $(this).closest('.histlist-wrapper'),
         $rows = null;

    if (action && $wrapper.length) {
      switch (action) {
        case 'sel-all':
          $wrapper.find('tr.selectable').attr('aria-selected', 'true');
          historyList.postSelRows(e);
          break;
        case 'sel-none':
          $wrapper.find('tr.selectable').attr('aria-selected', 'false');
          historyList.postSelRows(e);
          break;
        default:
          console.warn('Warning! list-action-btn clicked with not recognized action');
      }
    }
  },
  postActRows: function (e) {
    "use strict";
    var $wrapper = $(e.target).closest('.histlist-wrapper'),
          zipath = $wrapper.find(".histlist-body").attr("data-zipath"),
       actRowIds = $wrapper.find('tr.row-active').map(
          function () {
            var tmpSigId = $(this).closest("tr.selectable").attr('id');
            if (tmpSigId) {
              return tmpSigId;
            }
          }).get(),
         zivalue = { action: "activateRow", value: "1", rows: actRowIds };

    if (zipath) {
      historyList.post(zipath, $wrapper.find(".histlist-body").attr("id"), zivalue);
    }
  },
  postSelRows: function (e) {
    "use strict";
    var $wrapper = $(e.target).closest('.histlist-wrapper'),
          zipath = $wrapper.find(".histlist-body").attr("data-zipath"),
         selRowIds = $wrapper.find('tr[aria-selected=true]').map(
          function () {
            var tmpSigId = this.id;
            if (tmpSigId) {
              return tmpSigId;
            }
          }).get(),
         zivalue = { action: "selectRow", value: "1", rows: selRowIds };

    if (zipath) {
      historyList.post(zipath, $wrapper.find(".histlist-body").attr("id"), zivalue);
    }
  },
  transferRename: function (text, el) {
    "use strict";
    if (!el) { return; }
    el.setAttribute("readonly", "readonly");
    return JSON.stringify({ action: "changeName", value: text, rows: [$(el).closest("tr.selectable").attr("id")] });
  },
  transferColor: function (text, el) {
    "use strict";
    var actRowIds = $(el).closest('.histlist-wrapper').find('tr[aria-selected=true]').map(
        function () {
          var tmpSigId = $(this).closest("tr.selectable").attr('id');
          if (tmpSigId) {
            return tmpSigId;
          }
        }).get();

    return JSON.stringify({ action: "changeColor", value: el.value, rows: actRowIds });
  },
  post: function (zipath, ziId, zivalue) {
    "use strict";
    //console.log("History list posting " + JSON.stringify(zivalue));
    postRequest({
      action: 'set',
      path: zipath,
      id: ziId,
      format: 'string',
      data: JSON.stringify(zivalue),
      cache: false
    });
  }
};

function handleInternalLinkClick() {
  "use strict";
  var zilink = this.getAttribute('data-zilink');

  if (isReadonly(this) || !zilink) { return; }

  openNewTab(zilink, !$(this).hasClass("no-sessionid"));

}

function handleBtnClick(e) {
  "use strict";
  // TODO(JS): Do preprocessing
  var key = e.which,
    zipath = this.getAttribute('data-zipath'),
    zivalue = this.getAttribute('data-zivalue'),
    confirmationText;

  if (((typeof key !== "undefined") && key !== 1 && key !== 32 && key !== 13) || isReadonly(this) || !zipath || !zivalue) { return; } // do nothing if left-mouse or space button are not pressed or field is readonly

  confirmationText = this.getAttribute('data-ziconfirm');

  if (confirmationText) {
    if (!$(this).hasClass("confirmed")) {
      openConfirmationDialog(confirmationText, this.id);
      return;  // exit handleBtnClick function
    }
  }

  postRequest({
    action: 'set',
    path: zipath,
    id: this.id,
    format: 'int',
    data: zivalue
  });
}

function handleSpinBtnClick(e) {
  "use strict";
  var key = e.which,
    input = $(this).siblings("input")[0],
    textSetting = ziStyles[getFirstClass(input)],
    operation, step, minDelta, oldValue, newValue, max, min;

  if (((typeof key !== "undefined") && key !== 1 && key !== 32 && key !== 13) || isReadonly(this) || !input) { return false; }

  oldValue = parseFloat(transfer(input.value));
  operation = this.getAttribute("data-action");
  step = parseFloat(input.getAttribute("step"));

  if (!operation || isNaN(step) || isNaN(oldValue)) { return false; }

  switch (operation) {
    case "*":
      newValue = (oldValue >= 0) ? oldValue * step : oldValue / step;
      break;
    case "/":
      newValue = (oldValue >= 0) ? oldValue / step : oldValue * step;
      break;
    case "+":
      newValue = oldValue + step;
      break;
    case "-":
      newValue = oldValue - step;
      break;
    default:
      console.log("unknown operation defined for spin button");
      return false;
  }


  // determine min max values
  min = parseFloat(input.getAttribute("min")); if (isNaN(min)) { min = -Infinity; }
  max = parseFloat(input.getAttribute("max")); if (isNaN(max)) { max = Infinity; }

  // min step restriction for "*" and "/" operations (see scope pretrigger box)
  minDelta = parseFloat(input.getAttribute("data-mindelta"));
  if (!isNaN(minDelta)) {
    if (Math.abs(newValue - oldValue) < minDelta) {
      if (operation === "*") {
        newValue = oldValue + minDelta;
      } else if (operation === "/") {
        newValue = oldValue - minDelta;
      }

      if (Math.abs(newValue) < minDelta) {
        newValue = 0;
      }
    }
  }

  

  // clamp to min & max
  newValue = Math.max(min, Math.min(newValue, max));

  if (newValue !== oldValue) {
    if (textSetting) {
      newValue = textSetting.convTo(newValue, this.element);
    }

    input.value = newValue;
    $(input).change();
  }

}

function handleToggleBtnClick(e) {
  "use strict";
  var key = e.which,
    isChecked, zipath, confirmationText, id;

  if (((typeof key !== "undefined") && key !== 1 && key !== 32 && key !== 13) || isReadonly(this)) { return false; } // do nothing if left-mouse or space button are not pressed

  isChecked = (this.getAttribute('data-zichecked') === "true") ? '0' : '1';
  zipath = this.getAttribute('data-zipath');
  id = this.id;

  confirmationText = this.getAttribute('data-ziconfirm');

  if (confirmationText) {
    if (isChecked === '1' && !$(this).hasClass("confirmed")) {
      openConfirmationDialog(confirmationText, id);
      return false;  // exit the function
    }
  }

  if (zipath) {
    $(this).addClass("waiting");
    postRequest({
      action: 'set',
      path: zipath,
      id: id,
      format: 'bool',
      data: isChecked
    });
  }
}

function onBtnKeydown(e) {  // prevent page scroll on button space key
  "use strict";
  if (e.which === 32) {
    e.preventDefault();
  }
}

function openConfirmationDialog(text, fieldId) {
  "use strict";
  if (fieldId) {
    var $dialog = $(document.getElementById("dialogConfirmation"));

    $dialog.find(".dialog-message")[0].textContent = text;  // insert confirmation text
    $dialog[0].setAttribute("data-zilinked", fieldId);  // set origin id to be fetched on confirmation
    $dialog.dialog("open"); // show dialog
  }
}

function separatorDragStop(event, ui) {
  "use strict";
  var handler = this.getAttribute('data-eventhandler');
  if (handler) {
    sendCommand(handler, 'rowresize', (ui.position.top - ui.originalPosition.top));
  }
  //postRequest({ action: 'stylechange', attr: "height", format: 'int', id: $(this).attr('id'), data: (ui.position.top - ui.originalPosition.top) });
}

function onChangeInputMain(event) { "use strict"; return getStyleFromZiClass(this).onChangeInput(event, this); }
function onKeypressInputMain(event) { "use strict"; return getStyleFromZiClass(this).onKeypressInput(event, this); }
function onKeydownInputMain(event) { "use strict"; return getStyleFromZiClass(this).onKeydownInput(event, this); }
function onFocusInputMain(event) { "use strict"; return getStyleFromZiClass(this).onFocusInput(event, this); }
function onFocusoutInputMain(event) { "use strict"; return getStyleFromZiClass(this).onFocusoutInput(event, this); }

function noActionEventHandler(event) { "use strict"; return event; }

// **************** Event handlers for the input controls of type string
function onChangeInputString(event, el) {
  "use strict";
  var zipath,
     myClass = getFirstClass(el),
    textAttr = ziStyles[myClass],
    ziId = el.getAttribute('id'),
    messageString,
    value = el.value;

  if ($(el).hasClass("histlist")) {
    zipath = $(el).closest('.histlist-wrapper').find(".histlist-body").attr("data-zipath");
  } else {
    zipath = el.getAttribute('data-zipath');
  }

  messageString = textAttr ? textAttr.convFrom(value, el) : value;

  if (zipath) {
    //console.log("posting " + messageString + " to zipath " + zipath + " with id: " + ziId);
    postRequest({
      action: 'set',
      path: zipath,
      id: ziId,
      format: 'string',
      data: messageString
    });
  }
}


// **************** Event handlers for the input controls of type numeric (with unit, sign, etc.)


// *****************************
// a CLASS for handling focused field object on up or down key event
// *****************************
function UpDownCont() {
  "use strict";
  this.element = [];
  this.value = '';

  this.init = function (el) {
    this.element = el;
    this.value = el.value;
  };

  this.getDotPosition = function () {
    "use strict";
    var index = this.value.indexOf('.');

    return index < 0 ? this.value.length : index;  // considers also the case when there is no dot
  };

  this.getCaretPos = function (sign) {
    "use strict";
    var myPos = getCaret(this.element),
        sufixPos = this.value.search(/[GMkmnpufaz]/),
       relativePos;

    if (myPos === this.getDotPosition() || myPos >= this.value.length) {                  // correct cursor in front of the dot
      myPos = myPos - 1;
    } else if (this.value.search(/[b+-]/i) === myPos) {  // correct cursor in front of the - or +
      myPos = myPos + 1;
    }

    if (myPos >= sufixPos && sufixPos !== -1) {
      myPos = sufixPos - 1;
    }

    if (this.value.search(/^0x/i) !== -1 && myPos < 2) {  // hex case
      myPos = 2;
    }

    return myPos;
  };

  this.getExponent = function () {
    "use strict";
    var caretPos = this.getCaretPos(),
      relativePos = this.getDotPosition() - caretPos;

    relativePos = relativePos > 0 ? relativePos - 1 : relativePos;

    return relativePos;
  };

  this.setNewValue = function (sign) {
    "use strict";
    if (!this.element.value || !$(this.element).hasClass("num")) { return; }

    this.value = this.element.value;  // (re)initialize value

    if ($(this.element).hasClass("hex")) {
      this.setHex(sign);
    } else if ($(this.element).hasClass("binary")) {
      this.setBinary();
    } else if ($(this.element).hasClass("num")) {
      this.setNumerical(sign);
    }
  };

  this.setHex = function (sign) {
    "use strict";
    var caretPos = this.getCaretPos(),

        valueHex = this.value.replace(/^0x|[^A-F0-9]/i, ""),
        valueInt = parseInt(valueHex, 16),
        rawModifier = parseInt(String(Math.pow(10, this.getExponent())), 16),
        newValue;


    newValue = valueInt + sign * rawModifier;  // bit xor
    if (newValue < 0 || newValue > (Math.pow(16, valueHex.length) - 1)) { return; }
    newValue = newValue.toString(16);    // convert to binary string

    while (newValue.length < valueHex.length) newValue = "0" + newValue;  // pad with zeros

    this.element.value = "0x" + newValue.toUpperCase();

    this.restoreCaretPos(this.value.length, caretPos);
  };

  this.setBinary = function (sign) {
    "use strict";
    var caretPos = this.getCaretPos(),

        valueBin = this.value.replace(/[A-Za-z2-9$-]/g, ""),
        valueInt = parseInt(valueBin, 2),
        rawModifier = parseInt(String(Math.pow(10, this.getExponent())), 2),
        newValue;


    newValue = valueInt ^ rawModifier;  // bit xor
    newValue = newValue.toString(2);    // convert to binary string

    while (newValue.length < valueBin.length) newValue = "0" + newValue;  // pad with zeros

    this.element.value = "b" + newValue;

    this.restoreCaretPos(this.value.length, caretPos);
  };

  this.setNumerical = function (sign) {
    "use strict";
    var textSetting = ziStyles[getFirstClass(this.element)],
        oldDotPos = this.getDotPosition(),
        caretPos = this.getCaretPos(),

        prefix = getPrefix(this.value),
        valueFloat = parseFloat(this.value),
        rawModifier = Math.pow(10, this.getExponent()),
        newValue;

    if ((valueFloat + sign * rawModifier) === 0 && (Math.abs(transfer(this.value)) >= 10)) {  // correct the transition 1000.. -> 0 on subtracting 
      newValue = (valueFloat * prefix) + (sign * prefix * rawModifier / 10);
    } else {
      newValue = (valueFloat * prefix) + (sign * prefix * rawModifier);
    }

    

    if (textSetting) {
      newValue /= (textSetting.percent) ? 100 : 1;
      newValue = textSetting.convTo(newValue, this.element);
    }

    this.element.value = newValue;

    this.restoreCaretPos(oldDotPos, caretPos);
  };

  this.restoreCaretPos = function (oldDotPos, caretPos) {
    var newDotPos = this.getDotPosition();

    // restore and correct the caret position
    if (oldDotPos < newDotPos) { setCaret(this.element, caretPos + 1, caretPos + 2); }   // correct the cursor position (ex. 9  -> 10)
    else if (oldDotPos > newDotPos) { setCaret(this.element, caretPos - 1, caretPos); }  // correct the cursor position (ex. 10 -> 9)
    else { setCaret(this.element, caretPos, caretPos + 1); }
  };
}

function getCaret(el) {
  "use strict";
  var re, rc, r;
  if (el.selectionStart) {
    return el.selectionStart;
  } else if (document.selection) {
    el.focus();

    r = document.selection.createRange();
    if (r === null) {
      return 0;
    }

    re = el.createTextRange();
    rc = re.duplicate();
    re.moveToBookmark(r.getBookmark());
    rc.setEndPoint('EndToStart', re);

    return rc.text.length;
  }
  return 0;
}

function setCaret(el, startPos, endPos) {
  "use strict";
  if (typeof el.selectionStart !== "undefined") {
    el.selectionStart = startPos;
    el.selectionEnd = endPos;
  } else if (document.selection && document.selection.createRange) {
    // IE branch
    el.focus();
    el.select();
    var range = document.selection.createRange();
    range.collapse(true);
    range.moveEnd("character", endPos);
    range.moveStart("character", startPos);
    range.select();
  }
}

function selectText(id) {
  "use strict";
  var node, range;
  if (!id) return;
  node = document.getElementById(id);
  if (!node) return;

  if (document.selection) {
    range = document.body.createTextRange();
    range.moveToElementText(node);
    range.select();
  } else if (window.getSelection) {
    range = document.createRange();
    range.selectNode(node);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
  }
}

//function onChangeInputNumeric(event, element) {
//  "use strict";
// TODO(JS): Do preprocessing
/*var myClass;
myClass = getFirstClass(element);

if ($(element).closest('table').find("input.chain[data-linked=" + myClass + "]").is(':checked')) {   // check if there is active chain for this field
  $(element).closest('table').find('.' + myClass).each(function (index) {
    $(this).val($(element).val());              // enter the new value to the field the value; TODO:(dragan) only update fields that contain different value
    onChangeInputNumericPost($(this)[0]);
  });
}else{  */                                                                                           // if field is not chained -> post only the changed field
//onChangeInputNumericPost(element);
//}
//}



//*************************************
// handling of numerical input elements
//*************************************
var inputNumeric = {
  upDownHandler: new UpDownCont(),  // only one instance of up-down key handler -> less GC events and memory consumption
  onKeydown: function (event, element) {
    "use strict";
    if (!isReadonly(element)) {  // do action only if field is not readonly
      if (event.keyCode === 38) {         // ARROW_KEY_UP
        event.preventDefault();
        inputNumeric.upDownHandler.setNewValue(1);        // 1 to indicate summation
        $(element).change();
      } else if (event.keyCode === 40) {  // ARROW_KEY_DOWN
        event.preventDefault();
        inputNumeric.upDownHandler.setNewValue(-1);       // -1 to indicate subtraction
        $(element).change();
      }
    }
  },
  onFocusIn: function (event, element) {
    "use strict";
    if (!isReadonly(element)) {  // bind listeners only if field is not readonly
      inputNumeric.upDownHandler.init(element);
      $(element)
        .addClass('active') // add 'active' flag to the field
        .on('mousewheel', function (event, delta) {  // activate upDown by wheel
          inputNumeric.upDownHandler.setNewValue(delta);
          $(this).change();
          return false;
        });
    }
  },
  onFocusOut: function (event, element) {
    "use strict";
    $(element)
      .removeClass('active')   // remove 'active' flag from the field
      .off('mousewheel');      // removes added mousewheel listener
  },
  onKeypress: function (event, element) {
    "use strict";
    // IE uses window.event.keyCode
    // Firefox uses event.keyCode
    // Chrome... use event.which
    var keyNum, keyChar, myValue;
    keyNum = (window.event) ? window.event.keyCode : (event.keyCode) ? event.keyCode : event.which;

    if (keyNum === 9 || keyNum === 37 || keyNum === 39 || keyNum === 8 || keyNum === 46 || keyNum === 35 || keyNum === 36 || event.ctrlKey) {
      // Pass tab event to the standard handler
      // Pass also left and right key backspace and delete (for Opera & Firefox)
      // 9 - tab, 37 - left arrow, 39 - right arrow, 8 - backspace, 46 - delete, 35 - end, 36 - home 
      return event;
    }

    if (keyNum === 13) {  // Handle enter key
      if (!isReadonly(element)) {
        $(element).change();   // force field change
        return event;
      } else {
        return false;
      }
    }

    keyChar = String.fromCharCode(keyNum);

    if ($(element).hasClass('hex')) {
      return (/[#0-9ABCDEFX]/i.test(keyChar));

    } else if ($(element).hasClass('binary')) {
      return (/[b01]/i.test(keyChar));
    } else {
      return (/[-0-9GMkmnpufazeE+\.]/.test(keyChar));
    }
  },
  onChange: function (event, el) {
    "use strict";
    var zirefid, zipath, myClass, myId, textAttr, messageString;
    zirefid = el.getAttribute('data-ziref');

    myClass = getFirstClass(el);
    myId = el.getAttribute('id');
    zipath = el.getAttribute('data-zipath');

    textAttr = ziStyles[myClass];
    messageString = textAttr ? textAttr.convFrom(el.value.toString(), el) : transfer(el.value.toString());

    if (zipath) {
      if (zirefid) {
        zipath = $(zirefid).val() + zipath;
      }
      if (messageString !== 'error') {
        postRequest({
          action: 'set',
          path: zipath,
          id: myId,
          format: 'double',
          data: messageString
        });
      } else {
        demodulator.refresh();
      }
    }

  }
};

var PollAJAXTimer = {
  id: [],
  step: 100,
  update: function (value) {
    "use strict";
    var newValue;
    if (value > 0) {
      newValue = Math.round(1000 / value);
      if (newValue !== PollAJAXTimer.step) {
        PollAJAXTimer.step = newValue;
        PollAJAXTimer.start();
      }
    }
    return value;
  },
  start: function () {
    "use strict";
    onTheFlight = 0;
    subsequent404Errors = subsequent0Errors = 0;

    PollAJAXTimer.stop();
    doFrame();  // don't wait 10ms for the first trigger
    var timerId = setInterval(function () { doFrame(); }, PollAJAXTimer.step);
    PollAJAXTimer.id.push(timerId);
  },
  stop: function () {
    "use strict";
    for (var i = 0; i < PollAJAXTimer.id.length; i++) {
      clearInterval(PollAJAXTimer.id[i]);

    }
    PollAJAXTimer.id = [];
  }
};





// **************** Event handlers for the input controls of type "complex tree selection"
function treeSelectAll(treeId) {
  "use strict";
  $(document.getElementById(treeId)).dynatree("getRoot").visit(function (node) {
    node.select(true);
  });
  return false;
}

function treeDeselectAll(treeId) {
  "use strict";
  $(document.getElementById(treeId)).dynatree("getRoot").visit(function (node) {
    node.select(false);
  });
  return false;
}

function getStyleFromZiClass(el) {
  "use strict";
  var ziStyle = ziStyles[el.getAttribute('data-ziclass')];

  if (!ziStyle) { ziStyle = ziStyles.default_class; }
  return ziStyle;
}

// if needs prefix : value after recalculation gets a letter (G,M,k,m...)
// if display sign : value gets + if value>0
// if varying res : depending on number of digits before the comma we're getting varying number of digits after it
// resolution: number of digits after the comma
// adjust: used fo far only for frequency, solves problem of rounding
// convto used to receive and display value form the server, convFrom is used to format and send value to the server
var ziStyles =
  {
    default_class: { onChangeInput: inputNumeric.onChange, onKeypressInput: inputNumeric.onKeypress, onKeydownInput: inputNumeric.onKeydown, onFocusInput: inputNumeric.onFocusIn, onFocusoutInput: inputNumeric.onFocusOut },
    input_numeric: { onChangeInput: inputNumeric.onChange, onKeypressInput: inputNumeric.onKeypress, onKeydownInput: inputNumeric.onKeydown, onFocusInput: inputNumeric.onFocusIn, onFocusoutInput: inputNumeric.onFocusOut },
    input_string: { onChangeInput: onChangeInputString, onKeypressInput: noActionEventHandler, onKeydownInput: noActionEventHandler, onFocusInput: noActionEventHandler, onFocusoutInput: noActionEventHandler },

    style00000: { needsPrefix: 0, displaySign: 0, varyingRes: 0, resolution: 0, adjust: 0, convTo: prefix_search, convFrom: transfer },   // displaying ints
    style00120: { needsPrefix: 0, displaySign: 0, varyingRes: 1, resolution: 2, adjust: 0, convTo: prefix_search, convFrom: transfer },   // num2
    style10010: { needsPrefix: 1, displaySign: 0, varyingRes: 0, resolution: 1, adjust: 0, convTo: prefix_search, convFrom: transfer },   // range
    style10150: { needsPrefix: 1, displaySign: 0, varyingRes: 1, resolution: 5, adjust: 0, convTo: prefix_search, convFrom: transfer },
    style10160: { needsPrefix: 1, displaySign: 0, varyingRes: 1, resolution: 6, adjust: 0, convTo: prefix_search, convFrom: transfer },
    style10130: { needsPrefix: 1, displaySign: 0, varyingRes: 1, resolution: 3, adjust: 0, convTo: prefix_search, convFrom: transfer },
    style10030: { needsPrefix: 1, displaySign: 0, varyingRes: 0, resolution: 3, adjust: 0, convTo: prefix_search, convFrom: transfer },   // time, scope level, phase
    style10081: { needsPrefix: 1, displaySign: 0, varyingRes: 0, resolution: 8, adjust: 1, convTo: prefix_search, convFrom: transfer },   // freq
    style10080: { needsPrefix: 1, displaySign: 0, varyingRes: 0, resolution: 8, adjust: 0, convTo: prefix_search, convFrom: transfer },
    style11130: { needsPrefix: 1, displaySign: 1, varyingRes: 1, resolution: 3, adjust: 0, convTo: prefix_search, convFrom: transfer },
    style01030: { needsPrefix: 0, displaySign: 1, varyingRes: 0, resolution: 3, adjust: 0, convTo: prefix_search, convFrom: transfer },
    style11160: { needsPrefix: 0, displaySign: 1, varyingRes: 0, resolution: 3, adjust: 0, convTo: prefix_search, convFrom: transfer },
    aux2: { needsPrefix: 0, displaySign: 1, varyingRes: 0, resolution: 3, adjust: 0, convTo: prefix_search, convFrom: transfer },   // TODO(DR): Cleanup once we implement aux handling on server side
    style00000p: { needsPrefix: 0, displaySign: 0, varyingRes: 0, resolution: 0, adjust: 0, convTo: prefix_search, convFrom: transferPct, percent: true },
    style00020p: { needsPrefix: 0, displaySign: 0, varyingRes: 0, resolution: 2, adjust: 0, convTo: prefix_search, convFrom: transferPct, percent: true },
    innertext: { convTo: setInnerText },
    zi_highlighter_editor: { convTo: setCodeEditorText },
    dios: { convTo: decHex, convFrom: diostrans },
    led: { convTo: led_blink },
    gswitch: { convTo: led_blink },
    chain_dots: { convTo: led_blink },
    themeSel: { convTo: setTheme },
    grid_type: { convTo: setGrid },
    expcolbtn: { convTo: setExpColbtn },
    sidetabs: { convTo: setCtrlTabSel },
    progressbar_value_aux: { convTo: progressaux },
    progressbar_value: { convTo: progressbar },
    onsel_show_hide: { convTo: ctrlsideShowHideRowSel },
    hlist_cpicker: { convFrom: historyList.transferColor },
    hlist_signame: { convFrom: historyList.transferRename },
    dropdown_toggle: { convTo: navBtn.multi.update },
    targetFrameRate: { convTo: PollAJAXTimer.update, convFrom: transfer },
    hproggress: { convTo: updateProgress },
    seshDialog_show: { convTo: showHideSeshDialog },
    dialog_title: { convTo: setDialogTitle },
    ziSpinner: { convTo: animateZiSpinner },
    el_width: { convTo: updateElWidth },
    unit: { convTo: setUnit },
    msgdialog_text: { convTo: setMsgDialog },
    scroll_down: { convTo: scrollDown },
    showActionDialog: { convTo: actionDialog.open },
    colorbox: { convTo: onChangeColorBox }
    //tcbwSel:                { convTo: setTcbwLabel },
    // userreg:   { convTo: binHex, convFrom: format_conv },
    //color_picker: { convTo: setColorPicker, convFrom: ret_input }

  };

function onChangeColorBox(val, el) {
  $(el).css("background-color", val);
  return val;
}

function scrollDown(val, el) {
  setTimeout(function () { el.scrollTop = el.scrollHeight; }, 10);  // force element to scroll down
  return val;
}

function setMsgDialog(val) {
  "use strict";
  var $dialog = $(document.getElementById(msgDialog.id)),
    $el = $dialog.find(".msgdialog_text"),
    $okBtn = $dialog.find("#" + msgDialog.id + "ok"),
    $cancelBtn = $dialog.find("#" + msgDialog.id + "cancelupload"),
    text;

  $dialog.find("[class^='dialogctrl-']").hide();  // hide both control rows

  if (typeof val === 'object') {
    $dialog.find(".dialogctrl-upload").show();  // show upload control row
    text = val.text;
    setDialogTitle(val.title, $dialog.find(".dialog_title")[0]);

    $cancelBtn.on('click', val.buttons.cancel.onClick);
  } else {
    $dialog.find(".dialogctrl-regular").show();  // show regular control row
    text = val;

    $cancelBtn.off("click");
  }

  if (!text.trim().length) { $dialog.dialog("close"); return text; }  // close the dialog if no text

  if (!$dialog.length) {
    console.warn("No message dialog found;");
    return text;
  }

  if (!$dialog.dialog("isOpen")) {  // open
    $dialog.dialog("open");
  }

  setTimeout(function () { $el.scrollTop = $el.scrollHeight; }, 10);  // force element to scroll down

  $el.val(text);
  return text;
}

function setUnit(text, el) {
  "use strict";
  text = text.trim();

  if (text.length && $(el).hasClass("dyn-brackets")) {  // add brackets if needed
    text = '(' + text + ')';
  }

  return text;
}

function updateElWidth(text, el) {
  "use strict";
  $(el).css({
    //"min-width": text,
    //"max-width": text,
    "width": text
  });
}

function transferPct(text, el) {
  "use strict";
  return (parseFloat(text) * getPrefix(text) / 100).toString();
}
// colors the input background instead of just placing the value
/*function setColorPicker(value, id) {
  "use strict";
  $('#' + id).css("background-color", value);
  return value;
}*/

// show label depending on the select.tcbwSel selection 
/*function setTcbwLabel(value, el) {
  "use strict";
  var labelCell = $(el).closest('table.dem_container').find('td.tcbwSel-label')[0];
  if (labelCell) {
    switch (value) {
      case 0: labelCell.textContent = 'TC (s)'; break;
      case 1: labelCell.textContent = 'BW (Hz)'; break;
      case 2: labelCell.textContent = 'BW (Hz)'; break;
      default: console.warn('No label for tcbwSel= ' + value);
    }
  }
  return value;
}*/

function animateZiSpinner(value, el) {
  "use strict";
  $(el).addClass("animate");

  if (value) {
    setTimeout(function () { $(el).removeClass("animate"); }, 1000);

  }
}

function setDialogTitle(value, el) {
  "use strict";
  var dialogId, $dialog;

  if (!el) return;

  dialogId = el.getAttribute("data-linked");

  if (!dialogId) { console.warn("setDialogTitle - dialog id not found!"); return };
  $dialog = $(document.getElementById(dialogId));
  if (!$dialog.length) return;

  $dialog.dialog("option", "title", value);

  return value;
}

// 0 - hide
// 1 - show dialog without cancel/close controls
// 2 - show dialog with cancel/close controls
// 3 - show "loading" dialog
// 404 - show dialog with |Retry| |Reload| |Cancel| btns
// 500 - show "Reloading..." dialog
// 1000 - show "Data Server Connection" lost dialog error
// 1001 - show "Data Server Connection" with cancel controls
function showHideSeshDialog(value) {
  "use strict";
  var $dialog = $(document.getElementById(seshDialog.id)), titleBox;

  if (!$dialog.length) return;
  titleBox = $dialog.find("#seshDialogtitle")[0];

  switch (value) {
    case (0):  // hide
      $dialog.dialog("close");
      break;
    case (1):  // show dialog without cancel/close controls
      $dialog.closest(".zi-dialog").addClass("devsettings no-close").removeClass("e500 e404 e1000 e1001 loadingui");
      seshDialog.open();
      break;
    case (2):  // show dialog with cancel/close controls
      $dialog.closest(".zi-dialog").addClass("devsettings").removeClass("no-close e500 e404 e1000 e1001 loadingui");
      seshDialog.open();
      break;
    case (3):  // loading UI
      $dialog.closest(".zi-dialog").removeClass("devsettings e404 e500 e1000 e1001").addClass("loadingui");
      //setDialogTitle("Loading...", titleBox);
      seshDialog.open();
      break;
    case (404):
      $dialog.closest(".zi-dialog").removeClass("devsettings e500 e1000 e1001 loadingui").addClass("e404 no-close");
      $dialog.find("#seshDialogmessage").val("[Error] The connection with LabOne Web Server is lost.");
      setDialogTitle("Error", titleBox);
      seshDialog.open();
      // remove current prevZiSessionId from LS as there is very low probability 
      // to have new session as the web-server is most probably dead
      // localStorage.removeItem('prevZiSessionId');
      break;
    case (500):
      $dialog.closest(".zi-dialog").removeClass(" devsettings e404 e1000 e1001 loadingui").addClass("e500");
      $dialog.find("#seshDialogmessage").val("[Info] LabOne User Interface is reloading...");
      setDialogTitle("Reloading...", titleBox);
      seshDialog.open();
      // reload page
      window.location.reload();
      break;
    case (1000):
      $dialog.closest(".zi-dialog").removeClass("devsettings e404 e500 e1001 loadingui").addClass("e1000");
      seshDialog.open();
      break;
    case (1001):
      $dialog.closest(".zi-dialog").removeClass("devsettings e404 e500 e1000 loadingui no-close").addClass("e1001");
      seshDialog.open();
      break;
    default:
      console.warn("Dialog value " + value + " not defined");
  }
}

function setCodeEditorText(value, el) {
  "use strict"
  var editor = ace.edit(el), parsedText, mode, oldProgram;
  try {
    parsedText = JSON.parse(value);
  } catch (err) {
    console.error("Couldn't pass awg program. " + err);
    return;
  }

  if (parsedText.readonly) {
    el.setAttribute("readonly", "readonly");
  } else {
    el.removeAttribute("readonly");
  }

  if (parsedText.mimetype) {
    mode = mimeToAceMode(parsedText.mimetype);
    editor.getSession().setMode(mode);  // alternative: http://goo.gl/6H50l8
  }

  if (parsedText.heightchange) {
    editor.resize();
  }
  oldProgram = editor.getValue();
  if (oldProgram != parsedText.program) {
    editor.setValue(parsedText.program);
  } else {
    // console.log("Same code received");
  }
  
  editor.setReadOnly(parsedText.readonly);
  editor.clearSelection();
}

function setInnerText(value, el) {
  "use strict"
  el.textContent = value;
}

function updateProgress(value, el) {
  "use strict"
  var label = el.getElementsByTagName("label")[0],
      bar = el.querySelector("div.bar");

  if ($(el).hasClass("raw-value")) {  // if raw value [0...1] received from server, scale it
    value = value * 100;
  }

  value = Math.max(0, Math.round(value)) + "%";  // convert to int + %

  if (value === label.textContent) { return null }  // same value

  if (label) {
    label.textContent = value;
  }
  if (bar) {
    bar.style.width = value;
  }

}
// show/hide rows inside the ctrlside depending on the selected selelection
function ctrlsideShowHideRowSel(value, el) {
  "use strict";
  var $options = $(el).find('option'),
    selLink, // = $(el).find('option[value="' + value + '"]').attr('data-linked'), // get text from the selected field attribute
    $parent = $('#' + el.getAttribute('data-linked')),
    notSelLinks = [], i, tmp;

  for (i = 0; i < $options.length; i++) {
    tmp = $options[i].getAttribute('data-linked');
    if ($options[i].value == value) {  // important to leave ==
      selLink = tmp;
    } else {
      if (tmp) {
        notSelLinks.push(tmp);
      }
    }
  }

  if (!$parent.length) {
    $parent = $(el).closest('table');
  }

  if (notSelLinks.length) {
    $parent.find('.' + notSelLinks.join(", .")).attr("hidden", "hidden");
  }
  if (selLink) {
    $parent.find('.' + selLink).removeAttr("hidden");
  }
  return value;
}

function setExpColbtn(value, el) {
  "use strict";
  var linkedCells = el.getAttribute('data-linked'),
    $parent = $(el).closest("." + linkedCells + "-cont");

  if (linkedCells) {
    $(el).toggleClass('checked', value === 1);
    $parent.find('.' + linkedCells).toggle(value === 1);  // find cells to hide only inside the surrounding table
    $parent.find('.' + linkedCells + '-inv').toggle(value !== 1);  // find cells to hide only inside the surrounding table
    $parent.find('.vert-label.' + linkedCells).toggle(value === 0);  // show vertical label
  }
}

/*function setCtrlTabSel(value, el) {
  "use strict";
  var $parent = $(el),
      oldTabIndex = $parent.find("li.plot-tabs-name").index($parent.find('li.plot-tabs-name[aria-selected=true]'));

  if ($parent.length && (value !== oldTabIndex)) {  // select the tab only if it is not already selected
    $parent.addClass("clb-sel"); // set a flag clb-sel to avoid redundant postrequest when the click() is triggered
    $parent.find('li.plot-tabs-name:eq(' + value + ') a.ui-tabs-anchor').click();
  }
}*/

function setCtrlTabSel(value, el) {
  "use strict";
  var toSelect = el.querySelectorAll("li.tabbtn > label")[value];
  if (!el || typeof toSelect === "undefined") { return; }

  selectTab(toSelect);

}

function setTheme(value, el) {
  "use strict";
  var themeName, themes, i;

  if (!el) { // no element found. Get theme from the local storage
    themeName = localStorage.getItem('ziTheme');
  } else {
    themeName = $(el).find('option[value="' + value + '"]')[0].getAttribute('data-linked'); // extract theme name from <option> tag
  }

  if (!themeName) return;

  themeName = themeName.toLowerCase();

  themes = document.querySelectorAll("link.theme")
  for (i = 0; i < themes.length; i++) {
    if (!themes[i].title) continue;  // title doesn't exists
    themes[i].disabled = (themes[i].title.toLowerCase() !== themeName) ? true : false;
  }

  // update address bar coloring for mobile devices
  themes = document.querySelectorAll("meta.addressbar-color");
  for (i = 0; i < themes.length; i++) {
    if (!themes[i].content) continue;  // content doesn't exists
    themes[i].content = (themeName === "ziblack") ? "#000" : "#fff";
  }

  localStorage.setItem('ziTheme', themeName);

  codeEditor.setTheme();

  return value;
}

var codeEditor = {
  ziSeqC_acdefs: null,
  ziSeqC_init: false,
  // load autocomplete definitions from a json file
  loadZiSeqcDefs: function (callback) {
    $.getJSON("gen/ziSeqC_acdefs.json", function (data) {
      codeEditor.ziSeqC_acdefs = data;
      if (callback) {
        callback(data);
      }
    });
  },
  // ace definition for ziSeqC is enough to be initialized only once!
  initZiSeqcAutocomplete: function () {
    if (codeEditor.ziSeqC_init) { return; } // already initialized
    if (!codeEditor.ziSeqC_acdefs) {  // defs need to  be loaded
      codeEditor.loadZiSeqcDefs(codeEditor.initZiSeqcAutocomplete);
      return; 
    }

    ace.config.loadModule("ace/ext/language_tools", function (lt) {
      // add keywords from zuSeqC_acdefs (commented out as we now show only snippets)
      //var ziKeywordCompleter = {
      //  getCompletions: function (editor, session, pos, prefix, callback) {
      //    if (prefix.length === 0 || codeEditor.ziSeqC_acdefs === null) { callback(null, []); return }
      //    callback(null, codeEditor.ziSeqC_acdefs.map(function (ea) {
      //      return { caption: ea.word, name: ea.word, value: ea.word, meta: "keyword", desc: ea.desc, label: ea.label }
      //    }));
      //  }
      //}
      //lt.addCompleter(ziKeywordCompleter);  // add my suggestions with ones of the defined language

      // override snippet completer
      var snippetManager = ace.require("ace/snippets").snippetManager;
      var ziSnippetCompleter = {
        getDocTooltip: function (item) {
          if (!item.docHTML && item.desc) {  // item.type == "snippet" &&
            // console.log(item);

            item.docHTML = [
                '<b><p>', escapeHTML(item.label ? item.label : item.caption), '</p></b>'
            ];

            if (item.desc) {
              item.docHTML.push("<p>" + escapeHTML(item.desc) + "</p>");
            }

            //if (item.type == "snippet" && item.snippet) {
            //  item.docHTML.push("<p>" + escapeHTML(item.snippet) + "</p>");
            //}
            item.docHTML = item.docHTML.join("");
          }
        },
        getCompletions: function (editor, session, pos, prefix, callback) {
          var snippetMap = snippetManager.snippetMap;
          var completions = [];
          snippetManager.getActiveScopes(editor).forEach(function (scope) {
            var snippets = snippetMap[scope] || [];
            for (var i = snippets.length; i--;) {
              var s = snippets[i];
              var caption = s.name || s.tabTrigger;
              if (!caption)
                continue;
              completions.push({
                caption: caption,
                snippet: s.content,
                meta: s.tabTrigger && !s.name ? s.tabTrigger + "\u21E5 " : "snippet",
                type: "snippet",
                desc: s.desc,
                label: s.label
              });
            }
          }, this);
          callback(null, completions);
        }
      }

      lt.snippetCompleter.getDocTooltip = ziSnippetCompleter.getDocTooltip;
      lt.snippetCompleter.getCompletions = ziSnippetCompleter.getCompletions;

      ace.config.loadModule("ace/snippets/ziSeqC", function (m) {
        if (m) {
          // snippetManager.files.javascript = m;
          // m.snippets = snippetManager.parseSnippetFile(m.snippetText);
          
          // do this if you already have them parsed
          m.snippets = [];  // ignore already defined ones
          if (codeEditor.ziSeqC_acdefs) {
            for (var i = 0; i < codeEditor.ziSeqC_acdefs.length; i++) {
              m.snippets.push({
                content: codeEditor.ziSeqC_acdefs[i].snippet,
                name: codeEditor.ziSeqC_acdefs[i].word,
                tabTrigger: "h",
                desc: codeEditor.ziSeqC_acdefs[i].desc,
                label: codeEditor.ziSeqC_acdefs[i].label
              });
            }
          } else {
            console.warn("Code Editor: Word list not defined!");
          }

          snippetManager.register(m.snippets, m.scope);
        }
      });
      codeEditor.ziSeqC_init = true;

      // Overriding the original autocomplete filtering that
      // is returning too many suggestions not related to the query (#8355)
      ace.config.loadModule("ace/autocomplete", function (ac) {
        ac.FilteredList.prototype.filterCompletions = function (items, needle) {
          var results = [];
          // no suggestion for les than 2 characters or pure number
          if (needle && needle.length < 2 || !isNaN(parseFloat(needle))) { return results; }
          // var upper = needle.toUpperCase();
          var lower = needle.toLowerCase();
          loop: for (var i = 0, item; item = items[i]; i++) {
            var caption = item.value || item.caption || item.snippet;
            if (!caption) continue;
            var lastIndex = -1;
            var matchMask = 0;
            var penalty = 0;
            var index, distance;

            if (this.exactMatch) {
              if (needle !== caption.substr(0, needle.length))
                continue loop;
            } else {
              var i1 = caption.indexOf(needle);  // exact  case match
              var i2 = caption.toLowerCase().indexOf(lower);  // any case match
              index = (i1 >= 0) ? ((i2 < 0 || i1 < i2) ? i1 : i2) : i2;
              if (index < 0)
                continue loop;
              distance = index - lastIndex - 1;
              if (distance > 0) {
                if (lastIndex === -1)
                  penalty += 10;
                penalty += distance;
              }
              // set matching bits of the mask
              for (var j = 0; j < needle.length; j++) {
                matchMask = matchMask | (1 << (index + j));
              }
              lastIndex = index;
            }

            item.matchMask = matchMask;
            item.exactMatch = penalty ? 0 : 1;
            item.score = (item.score || 0) - penalty;
            results.push(item);
          }
          return results;
        }
      });

    });
  },
  setTheme: function() {
    var uiName = localStorage.getItem('ziTheme'),
      $editors = $(".zi_highlighter_editor"),
      editor,
      oldTheme,
      newTheme = "ace/theme/" + ((uiName && uiName.toLowerCase() === "ziblack") ? "monokai" : "xcode"),
      i;

    for (i = 0; i < $editors.length; i++) {
      if (!$($editors[i]).hasClass("ace_editor")) { continue; }  // editonr not initialized on this DOM element

      editor = ace.edit($editors[i]);
      oldTheme = editor.getTheme();
      if (oldTheme !== newTheme) {
        editor.setTheme(newTheme);
      }
    }
  }
};


function setGrid(value) {
  "use strict";
  var theme = $('link.theme-grid')[0];

  if (theme) {
    if (value === 1) { // dashed
      theme.disabled = false;
    } else {          // solid or none
      theme.disabled = true;
    }
  }
  return value;
}

//for progressbars in aux. height of the bar commensurate with received value
function progressaux(value, el) {
  "use strict";
  var value_new = (5 * value + 50).toFixed(5) + "%";

  if (el.style.bottom !== value_new) {  // update only if new state is different than the old one
    el.style.bottom = value_new;
  }
}

//for most of the progressbars. min_max sets type of bar, due to difference in data received usually recalculation is needed before displaying the bar
function progressbar(value, el) {
  "use strict";
  var top_bottom, min_max;
  min_max = el.getAttribute('data-type');
  if (min_max === 'max_new') {
    value = 50 * (value + 1);
    top_bottom = 'bottom';
  } else if (min_max === 'min_new') {
    value = 50 * (1 - value);
    top_bottom = 'top';
  } else if (min_max === 'max') {
    value = 50 + 50 * (value / 127);
    top_bottom = 'bottom';
  } else if (min_max === 'min') {
    value = 50 - 50 * (value / 127);
    top_bottom = 'top';
  } else if (min_max === 'left') {
    top_bottom = 'left';
  } else {
    top_bottom = 'bottom';
    value *= 100;
  }

  if (el.style[top_bottom] !== value.toFixed(5) + "%") {  // update only if new state is different than the old one
    el.style[top_bottom] = value.toFixed(5) + "%";
  }
}

//for flags in the footer. if flag is set a class is added that changes the color
function led_blink(value, el) {
  "use strict";
  switch (value) {
    case (-1):
      $(el).removeClass("state_0 state_1 state_2").addClass("state_-1");
      break;
    case (0):
      $(el).removeClass("state_-1 state_1 state_2").addClass("state_0");
      break;
    case (1):
      $(el).removeClass("state_-1 state_0 state_2").addClass("state_1");
      break;
    case (2):
      $(el).removeClass("state_-1 state_0 state_1").addClass("state_2");
      break;
    default:
      console.warn("Led value " + value + " not defined");
  }
  return false;
}

//for data that is registered, but lacking of attributes set in ZiStyles	
//function ret_input(val) {
//  "use strict";
//  return val;
//}


// used for transition between formats in dios input-output. displays 'b' and '0x' as zi control
function decHex(temp, el) {
  "use strict";
  var hexOrDec = $(el).closest('table').find('select.diosFmtSel').val();
  temp = parseInt(temp, 10);

  if (hexOrDec === '0') {  // 0 represent Hex
    return decToHex(temp, '0x', 2);
  } else {
    return decToBin(temp, 'b', 8);
  }
}

var convert = {
  toNumber: function (text, el, className) {  // main function applying zistyles to received string value
    "use strict";
    var textSetting = ziStyles[className],
                 value;

    if (!isFinite(text)) {
      if ((text.toLowerCase()).indexOf("inf") >= 0) {  // Note: Infinity comming from local nodes: INF, -INF; from device nodes: 1.#INF0000, -1.#INF0000
        value = ((text.toLowerCase()).indexOf("-") === 0) ? -Infinity : Infinity;
      } else {  // isNaN(text)
        value = NaN;
      }
    } else {
      value = parseFloat(text); // Math.round(parseFloat(text) / max_resolution) * max_resolution; for max_resolution = 1e-12 TODO(DL): is the rounding implementation really needed?
    }
    
    if (!textSetting) {
      return value;                     // no matching post processing function in ziStyles
    } else {
      return textSetting.convTo(value, el);
    }
  },
  toString: function (text, el, className) { // main function applying zistyles to received numerical (int & double)	value 
    "use strict";
    var textSetting = ziStyles[className];

    if (!textSetting) {
      return text;                     // no matching post processing function in ziStyles
    } else {
      return textSetting.convTo(text, el);
    }
  }
};

//function searching for right prefix.
//takes care of displaying signs like "-","+","%" too.
function prefix_search(temp) {
  "use strict";
  var sufix_array = ['G', 'M', 'k', '', 'm', 'u', 'n', 'p', 'f', 'a', 'z'],
             top = 1.0e+9,
         counter = 0,
     textSetting = this, // prefix_search contains the context of the caller ziStyles[className]
      resolution = textSetting.resolution,
           multi = Math.pow(10, resolution),
            sign = (temp < 0) ? '-' : '+',
            disp_val;

  if (isNaN(temp)) { return temp; }
  if (Math.abs(temp) == Infinity) { return temp; }

  temp = Math.abs(temp);

  if (textSetting.adjust > 0) { temp = Math.round(temp * multi) / multi; }
  if (textSetting.needsPrefix) {
    temp /= top;
    while ((Math.round(temp * multi) < multi) && (counter < (sufix_array.length - 1))) {
      temp = temp * 1000;
      counter++;
    }
  }

  if (temp === 0) {
    disp_val = (textSetting.displaySign) ? sign + temp.toFixed(resolution) : temp.toFixed(resolution);
    //return disp_val + ((textSetting.percent) ? '%' : '');
    return disp_val;
  }

  disp_val = temp;
  if (textSetting.percent) { disp_val *= 100; }
  if (textSetting.varyingRes) {
    resolution = Math.max(0, resolution - parseInt((Math.log(disp_val) / Math.log(10)).toFixed(resolution), 10));
  }
  if (!textSetting.needsPrefix) { sufix_array[counter] = ''; }
  //if (textSetting.percent) { sufix_array[counter] = '%'; }

  disp_val = disp_val.toFixed(resolution) + sufix_array[counter];
  if ((textSetting.displaySign) || (sign === '-')) {
    return sign + disp_val;
  } else {
    return disp_val;
  }
}

//converts formats in userreg in realtime
//Caution! uses part of id to work 
function format_conv(text, element) {
  "use strict";

  switch (element.value) {
    case 'Hexadecimal':
      text = parseInt(text, 16);
      return text.toString();
    case 'Binary':
      text = parseInt(text, 2);
      return text.toString();
    default: return transfer(text);
  }
}

// convert hex/bin into dec number in order to send it to the server
function diostrans(text, element) {
  "use strict";
  var fmtSelText = $(element).closest('table').find('select.diosFmtSel').val();
  if (fmtSelText === '0') {
    text = parseInt(text.replace("0x", ""), 16);
  } else {
    text = parseInt(text.replace("b", ""), 2);
  }
  return text.toString();
}

function getPrefix(text) {
  var matched = text.match(/[GMkmnpufaz]/);

  if (matched) {  // in case match found
    matched = matched[0];
  }

  switch (matched) {
    case 'G':
      return 1.0e+9;
    case 'M':
      return 1.0e+6;
    case 'k':
      return 1.0e+3;
    case 'm':
      return 1.0e-3;
    case 'u':
      return 1.0e-6;
    case 'n':
      return 1.0e-9;
    case 'p':
      return 1.0e-12;
    case 'f':
      return 1.0e-15;
    case 'a':
      return 1.0e-18;
    case 'z':
      return 1.0e-21;
    default:
      return 1.0;
  }
}

//detects letter put in by the user. transfers that into number multiplying value by 10^x
function transfer(text) {
  "use strict";
  return (parseFloat(text) * getPrefix(text)).toString();
}

//performs conversiot decimal-hexadecimal
function decToHex(d, sign, zeros) {
  "use strict";
  var displayHex = d.toString(16);

  while (displayHex.length < zeros) { displayHex = '0' + displayHex; }

  return sign + displayHex.toUpperCase();
}

//performs conversiot dacimal-binary
function decToBin(d, sign, zeros) {
  "use strict";
  var displayBin = d.toString(2);
  while (displayBin.length < zeros) {
    displayBin = '0' + displayBin;
  }
  return sign + displayBin;
}

function diosFormatSelectChange(evt) {
  "use strict";
  var chosenoption = evt.target.value,
    boxvalue, decNumber, result;

  $(this).closest("div.page").find('input.dios').each(function () {
    boxvalue = $(this).val();
    if (chosenoption === "0") { //display hex format
      $(this).removeClass('binary').addClass('hex');
      decNumber = parseInt(boxvalue.replace("b", ""), 2);
      if (isNaN(decNumber)) {
        $(this).val('NaN');
      } else {
        result = from10toradix(decNumber, 16);
        if (result.length < 2) { result = '0' + result; }
        $(this).val("0x" + result);
      }
    } else { //display bin format
      decNumber = parseInt(boxvalue.replace("0x", ""), 16);
      $(this).removeClass('hex').addClass('binary');
      if (isNaN(decNumber)) {
        $(this).val('NaN');
      } else {
        result = from10toradix(decNumber, 2);
        while (result.length < 8) { result = '0' + result; }
        $(this).val("b" + result);
      }
    }
  });
}

//used to recalculate between different formats   
function from10toradix(value, radix) {
  "use strict";
  var retval = '',
    ConvArray = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'A', 'B', 'C', 'D', 'E', 'F'],
            i = 0,
       intnum = parseInt(value, 10),
      tmpnum;

  if (isNaN(intnum)) {
    retval = 'NaN';
  } else {
    if (intnum < 1) {
      retval = "0";
    } else {
      retval = "";
    }
    while (intnum > 0.9) {
      i++;
      tmpnum = intnum;
      // cancatinate return string with new digit:
      retval = ConvArray[tmpnum % radix] + retval;
      intnum = Math.floor(tmpnum / radix);
      if (i > 100) {
        // break infinite loops
        retval = 'NaN';
        break;
      }
    }
  }
  return retval;
}
/////////////////////////////////////////////////
function doFrame() {
  "use strict";
  if (onTheFlight < 2) {
    onTheFlight = onTheFlight + 1;
    refresh();
  }
}

function wsOnOpen(evt) {
  "use strict";
  usingWebSocket = true;
  PollAJAXTimer.start();  // timer will call doFrame()
}

function wsOnClose(evt) {
  "use strict";
  var errorXHR = {
    status: 0,
    statusText: 'WebSocket was closed ' + (evt.wasClean ? '' : 'not ') + 'clean, code ' + evt.code + ': "' + evt.reason + '"'
  };
  usingWebSocket = false;
  refreshHandler.onError(errorXHR, null, null);
}

function wsOnError(evt) {
  "use strict";
  var errorXHR = {
    status: 0,
    statusText: 'WebSocket error ' + evt.data
  };
  usingWebSocket = false;
  refreshHandler.onError(errorXHR, null, null);
}

function wsOnMessage(evt) {
  "use strict";
  var asBytes, asAnyData, index, newIndex, ch, type, id, expWidth, expHeight,
      canvas, context, imgData, imgSize, rawImg, imgIndex, actLen, pixel, pidx,
      deltaX, deltaY, ySpan, yidx,
      errorXHR;
  if (typeof(evt.data) === "string") {
    refreshHandler.onSuccess($.parseXML(evt.data));
  } else if (evt.data instanceof ArrayBuffer) {
    //console.log('ws: binary received');
    asBytes = new Uint8Array(evt.data);
    asAnyData = new DataView(evt.data);
    if (asBytes.length < 1) {
      console.log('ws: binary data must have at least one byte');
    }
    type = asBytes[0];
    index = 1;
    if (type == 1) { // raw image
      // console.log('ws: raw image data');
      id = "";
      while (index < asBytes.length) {
        ch = asBytes[index];
        ++index;
        if (ch == 0) break;
        id += String.fromCharCode(ch);
      }
      expWidth = asAnyData.getUint32(index, true);
      index += 4;
      expHeight = asAnyData.getUint32(index, true);
      index += 4;
      // console.log('ws: canvas id: ' + id);
      canvas = document.getElementById(id);
      // console.log('ws: canvas size: ' + canvas.width + 'x' + canvas.height);

      context = canvas.getContext('2d');
      imgData = context.createImageData(expWidth, expHeight);  // Using received dimensions just in case canvas resized, but old image data received
      imgSize = expWidth * expHeight;
      rawImg = new Uint32Array(imgData.data.buffer);
      imgIndex = 0;
      while (index < asBytes.length - 1) {
        actLen = asBytes[index];
        ++index;
        if (actLen == 0) {  // plain pixels
          actLen = asBytes[index] + 1;
          ++index;
          for (pidx = 0; pidx < actLen; ++pidx) {
            rawImg[imgIndex] = asAnyData.getUint32(index, true);
            index += 4;
            imgIndex += expWidth;
            if (imgIndex >= imgSize) {
              imgIndex -= imgSize - 1;
            }
          }
        } else {  // compressed pixels
          pixel = asAnyData.getUint32(index, true);
          index += 4;
          for (pidx = 0; pidx < actLen; ++pidx) {
            rawImg[imgIndex] = pixel;
            imgIndex += expWidth;
            if (imgIndex >= imgSize) {
              imgIndex -= imgSize - 1;
            }
          }
        }
      }

      // repeat image of 1px height for the entire canvas height
      ySpan = (expHeight == 1) ? canvas.height : 1;
      for (yidx = 0; yidx < ySpan; ++yidx) {
        context.putImageData(imgData, 0, yidx);
      }

    } else if (type == 2) { // error message
      if (index + 1 >= asBytes.length) {
        console.log('ws: malformed binary error response');
      }
      errorXHR = {
        status: asAnyData.getUint16(index, true),
        statusText: ""
      };
      index += 2;
      while (index < asBytes.length) {
        ch = asBytes[index];
        ++index;
        if (ch == 0) break;
        errorXHR.statusText += String.fromCharCode(ch);
      }
      // Closing websocket to prevent polls to possibly invalid server and getting back an error again
      // TODO(2K): not a generic solution, there maybe errors that require websocket to stay open
      webSocket.close();
      refreshHandler.onError(errorXHR, null, null);
    } else {
      console.log('ws: unknown type of binary data received: ' + type);
    }
  } else {
    console.log('ws: unknown data type received');
  }
}

function pollStart() {
  "use strict";
  if ((sessionStorage.getItem('ziWebSocketEnabled') === 'true') && window.WebSocket) {
    webSocket = new WebSocket('ws://' + window.location.host + '/ws', 'zi-ui-protocol');
    webSocket.binaryType = 'arraybuffer';
    webSocket.onopen = wsOnOpen; // will call PollAJAXTimer.start() once WS handshaking is complete
    webSocket.onclose = wsOnClose;
    webSocket.onerror = wsOnError;
    webSocket.onmessage = wsOnMessage;
  } else {
    usingWebSocket = false;
    PollAJAXTimer.start();  // timer will call doFrame()
  }
}

function init() {
  "use strict";
  var currentSessionId, prevSessionId;

  messageSync('/', { action: 'reload', x: Math.max(windowSize.minWidth, $(window).width()), y: $(window).height() }, dummyFn);

  pollStart();

  currentSessionId = parseInt(getZiSessionId());
  prevSessionId = parseInt(localStorage.getItem('prevZiSessionId'));

  // if previous session number is not valid, update it to the new value for the next session
  if (isNaN(prevSessionId) || prevSessionId >= currentSessionId) { localStorage.setItem('prevZiSessionId', currentSessionId); return; }

  // communicate previous session id to the server
  messageSync('/message',
    {
      action: 'command',
      format: 'previousSessionId',
      data: prevSessionId
    },
  function () {
    "use strict";
    // at this point, previous session is communicated to the server. 
    // Now we update it to the new value for the next session
    localStorage.setItem('prevZiSessionId', currentSessionId);

    // refreshHandler.onSuccess(xml);  // not needed as there is no content returned from the server
  });

}

$(function () {
  "use strict";
  init();
  initMainframe();
});