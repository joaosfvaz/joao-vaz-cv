/* ------------------------------------------------------------------ *
 *  The brand page: press a colour to copy it. If the clipboard is not
 *  available, the code is on the swatch to read.
 * ------------------------------------------------------------------ */
(function () {
  "use strict";
  document.querySelectorAll("[data-copy-hex]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const hex = btn.dataset.copyHex;
      if (!(navigator.clipboard && window.isSecureContext)) return;
      navigator.clipboard.writeText(hex).then(() => {
        if (window.Home) window.Home.toast("Copied", hex);
      });
    });
  });
})();
