(function () {
  var cfg = window.__MAILBRIDGE__;
  if (!cfg || !cfg.endpoint) {
    console.warn("MailBridge: missing window.__MAILBRIDGE__.endpoint");
  }

  var modal = document.getElementById("contact-modal");
  var openBtn = document.getElementById("contact-open");
  var closeBtn = document.getElementById("contact-close");
  var cancelBtn = document.getElementById("contact-cancel");
  var backdrop = document.getElementById("contact-backdrop");
  var form = document.getElementById("contact-form");
  var statusEl = document.getElementById("contact-status");
  var submitBtn = document.getElementById("contact-submit");
  var dialog = document.getElementById("contact-dialog");

  if (!modal || !openBtn || !form) return;

  var lastFocus = null;

  function setOpen(open) {
    if (open) {
      lastFocus = document.activeElement;
      modal.removeAttribute("hidden");
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      var first = form.querySelector(
        "input:not([tabindex='-1']), textarea, button[type='submit']"
      );
      if (first) first.focus();
    } else {
      modal.setAttribute("hidden", "");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      statusEl.textContent = "";
      if (lastFocus && typeof lastFocus.focus === "function") {
        lastFocus.focus();
      }
    }
  }

  function showStatus(msg, isError) {
    statusEl.textContent = msg;
    statusEl.classList.toggle("contact-form__status--error", !!isError);
  }

  openBtn.addEventListener("click", function () {
    setOpen(true);
  });

  function close() {
    setOpen(false);
  }

  closeBtn.addEventListener("click", close);
  cancelBtn.addEventListener("click", close);
  backdrop.addEventListener("click", close);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hasAttribute("hidden")) {
      close();
    }
  });

  function formDataToUrlEncoded(fd) {
    var params = new URLSearchParams();
    fd.forEach(function (value, key) {
      params.append(key, value);
    });
    return params;
  }

  function postForm(fd) {
    fetch(cfg.endpoint, {
      method: "POST",
      body: formDataToUrlEncoded(fd),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      mode: "cors",
      credentials: "omit",
    })
      .then(function (res) {
        return res.text().then(function (text) {
          var data = {};
          if (text) {
            try {
              data = JSON.parse(text);
            } catch (e) {}
          }
          return { ok: res.ok, status: res.status, data: data };
        });
      })
      .then(function (result) {
        if (result.ok) {
          showStatus("Thanks — your message was sent.", false);
          form.reset();
          setTimeout(function () {
            close();
          }, 2200);
        } else {
          var d = result.data && result.data.detail;
          var msg =
            typeof d === "string"
              ? d
              : Array.isArray(d) && d[0] && d[0].msg
                ? d[0].msg
                : "Could not send. Try again in a minute.";
          showStatus(msg, true);
        }
      })
      .catch(function () {
        showStatus(
          "Network error. Check your connection or try again later.",
          true
        );
      })
      .finally(function () {
        submitBtn.disabled = false;
      });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!cfg || !cfg.endpoint) {
      showStatus("Contact form is not configured.", true);
      return;
    }
    if (!cfg.recaptchaSiteKey) {
      showStatus("reCAPTCHA is not configured.", true);
      return;
    }
    if (typeof grecaptcha === "undefined" || !grecaptcha.execute) {
      showStatus(
        "Security check did not load. Refresh the page and try again.",
        true
      );
      return;
    }

    submitBtn.disabled = true;
    showStatus("Verifying…", false);

    grecaptcha.ready(function () {
      grecaptcha
        .execute(cfg.recaptchaSiteKey, { action: "submit" })
        .then(function (token) {
          var fd = new FormData(form);
          fd.append("captcha_token", token);
          showStatus("Sending…", false);
          postForm(fd);
        })
        .catch(function () {
          showStatus("Could not verify. Try again in a moment.", true);
          submitBtn.disabled = false;
        });
    });
  });
})();
