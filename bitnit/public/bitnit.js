/*
 * BITNIT widget — drop into any product:
 *
 *   <script src="https://your-bitnit-host/bitnit.js"></script>
 *   <script>
 *     BITNIT.init({
 *       endpoint: "https://your-bitnit-host",   // defaults to the script's origin
 *       user: { id, name, persona, plan, tenureDays, featureUsage: { feature: usesLast30d } },
 *     });
 *   </script>
 *
 * BITNIT decides whether this user is a good fit for any live idea. If not,
 * nothing is shown.
 *
 * BITNIT.preview(container, prompt) renders the same card inline, without
 * recording anything — used by the builder console.
 */
(function () {
  var scriptOrigin = (function () {
    try {
      return new URL(document.currentScript.src).origin;
    } catch (e) {
      return "";
    }
  })();

  var ANSWERS = [
    { key: "need", emoji: "🔥", label: "Badly need it today" },
    { key: "maybe", emoji: "🤔", label: "Maybe" },
    { key: "nah", emoji: "🤷", label: "Won't use it" },
  ];

  var CSS =
    ":host{all:initial}" +
    ".card{position:fixed;right:20px;bottom:20px;width:340px;max-width:calc(100vw - 32px);box-sizing:border-box;" +
    "background:#fff;color:#1b1b1a;border:1px solid #e6e4df;border-radius:14px;box-shadow:0 12px 40px rgba(20,20,10,.18);" +
    "font:14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;padding:16px 16px 14px;z-index:2147483000;" +
    "animation:in .28s ease-out}" +
    "@keyframes in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}" +
    ".top{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}" +
    ".tag{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#6b6a65}" +
    ".tag b{color:#1b1b1a}" +
    ".x{all:unset;cursor:pointer;color:#8a8984;font-size:18px;line-height:1;padding:2px 6px;border-radius:6px}" +
    ".x:hover{background:#f2f1ee;color:#1b1b1a}" +
    "h3{margin:0 0 10px;font-size:16px;line-height:1.3}" +
    "dl{margin:0 0 10px}dt{font-size:11px;font-weight:600;color:#6b6a65;text-transform:uppercase;letter-spacing:.04em;margin-top:8px}" +
    "dd{margin:2px 0 0}" +
    ".why{font-size:12px;color:#6b6a65;background:#f6f5f2;border-radius:8px;padding:6px 8px;margin:10px 0 12px}" +
    ".q{font-weight:600;margin-bottom:8px}" +
    ".row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}" +
    ".a{all:unset;cursor:pointer;text-align:center;border:1px solid #e6e4df;border-radius:10px;padding:10px 4px 8px;" +
    "font-size:12px;line-height:1.25;color:#3a3936;transition:transform .08s,border-color .15s,background .15s}" +
    ".a:hover{border-color:var(--accent);background:#faf9f7;transform:translateY(-1px)}" +
    ".a:focus-visible{outline:2px solid var(--accent);outline-offset:2px}" +
    ".a span{display:block;font-size:24px;margin-bottom:4px}" +
    "textarea{box-sizing:border-box;width:100%;min-height:64px;border:1px solid #e6e4df;border-radius:8px;padding:8px;font:inherit;resize:vertical}" +
    ".acts{display:flex;justify-content:flex-end;gap:8px;margin-top:8px}" +
    ".btn{all:unset;cursor:pointer;padding:7px 12px;border-radius:8px;font-weight:600;font-size:13px}" +
    ".primary{background:var(--accent);color:#fff}.ghost{color:#6b6a65}.ghost:hover{background:#f2f1ee}" +
    ".done{text-align:center;padding:8px 0 4px}.done span{font-size:28px;display:block;margin-bottom:4px}" +
    ".card.inline{position:relative;right:auto;bottom:auto;width:100%;max-width:340px;z-index:auto;animation:none}";

  var state = null;

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === "text") n.textContent = attrs[k];
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(function (c) {
      if (c) n.appendChild(c);
    });
    return n;
  }

  function post(path, body) {
    return fetch(state.endpoint + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(function (r) {
      return r.json();
    });
  }

  function destroy() {
    if (state && state.host) state.host.remove();
    if (state && state.timer) clearTimeout(state.timer);
    if (state && state.ctx && state.ctx.timer) clearTimeout(state.ctx.timer);
    state = null;
  }

  /** Render a prompt inline for previewing. Answers loop back to the question; nothing is sent. */
  function preview(container, prompt, opts) {
    var ctx = {
      inline: container,
      accent: (opts && opts.accent) || "#2a78d6",
      send: function () {},
      finish: function () {
        if (ctx.timer) clearTimeout(ctx.timer);
        container.replaceChildren();
        render(prompt, ctx);
      },
    };
    container.replaceChildren();
    render(prompt, ctx);
    return function stop() {
      if (ctx.timer) clearTimeout(ctx.timer);
      container.replaceChildren();
    };
  }

  // ctx: { accent, send(path, body), finish(), inline }
  function render(prompt, ctx) {
    var host = el("div", { "data-bitnit": "" });
    var root = host.attachShadow({ mode: "open" });
    root.appendChild(el("style", { text: CSS }));
    var card = el("div", {
      class: ctx.inline ? "card inline" : "card",
      role: ctx.inline ? "group" : "dialog",
      "aria-label": "Help decide what gets built",
    });
    card.style.setProperty("--accent", ctx.accent);
    root.appendChild(card);
    (ctx.inline || document.body).appendChild(host);
    var destroy = ctx.finish;

    function close() {
      ctx.send("/api/v1/dismiss", { ideaId: prompt.ideaId });
      destroy();
    }

    function thanks(answer) {
      card.replaceChildren(
        el("div", { class: "done" }, [
          el("span", { text: answer.emoji }),
          el("div", { class: "q", text: "Thanks — that helps us decide." }),
        ]),
      );
      ctx.timer = setTimeout(destroy, 2200);
    }

    function followUp(answer) {
      var ta = el("textarea", {
        placeholder: answer.key === "need" ? "What would you use it for first?" : "What would make this worth using?",
        "aria-label": "Optional comment",
      });
      card.replaceChildren(
        el("div", { class: "top" }, [
          el("div", { class: "tag", text: answer.emoji + " " + answer.label }),
          el("button", { class: "x", "aria-label": "Close", text: "×", onclick: destroy }),
        ]),
        el("div", { class: "q", text: "Anything we should know? (optional)" }),
        ta,
        el("div", { class: "acts" }, [
          el("button", { class: "btn ghost", text: "Skip", onclick: function () { thanks(answer); } }),
          el("button", {
            class: "btn primary",
            text: "Send",
            onclick: function () {
              if (ta.value.trim()) ctx.send("/api/v1/respond", { ideaId: prompt.ideaId, answer: answer.key, comment: ta.value });
              thanks(answer);
            },
          }),
        ]),
      );
      if (!ctx.inline) ta.focus();
    }

    function choose(answer) {
      ctx.send("/api/v1/respond", { ideaId: prompt.ideaId, answer: answer.key });
      if (ctx.onAnswer) ctx.onAnswer({ ideaId: prompt.ideaId, answer: answer.key });
      followUp(answer);
    }

    var tag = el("div", { class: "tag" });
    tag.append(el("b", { text: "Build it or nix it?" }), document.createTextNode(" · 10 sec"));
    [
      el("div", { class: "top" }, [tag, el("button", { class: "x", "aria-label": "Not now", text: "×", onclick: close })]),
      el("h3", { text: prompt.title }),
      el("dl", {}, [
        el("dt", { text: "What it solves" }),
        el("dd", { text: prompt.problem }),
        el("dt", { text: "How it solves it" }),
        el("dd", { text: prompt.solution }),
      ]),
      prompt.whyYou ? el("div", { class: "why", text: prompt.whyYou }) : null,
      el("div", { class: "q", text: "Would you use this?" }),
      el(
        "div",
        { class: "row" },
        ANSWERS.map(function (a) {
          var b = el("button", { class: "a", onclick: function () { choose(a); } }, [el("span", { text: a.emoji })]);
          b.append(document.createTextNode(a.label));
          return b;
        }),
      ),
    ].forEach(function (n) {
      if (n) card.appendChild(n);
    });
    return host;
  }

  function init(opts) {
    destroy();
    if (!opts || !opts.user) throw new Error("BITNIT.init needs a user");
    state = {
      endpoint: (opts.endpoint || scriptOrigin).replace(/\/$/, ""),
      user: opts.user,
      accent: opts.accent || "#2a78d6",
      onAnswer: opts.onAnswer,
      onDecide: opts.onDecide,
    };
    var mine = state;
    return post("/api/v1/prompt", { user: opts.user }).then(function (res) {
      if (state !== mine) return res.prompt; // re-initialised meanwhile
      if (mine.onDecide) mine.onDecide(res.prompt);
      if (!res.prompt) return null;
      mine.timer = setTimeout(function () {
        if (state !== mine) return;
        var ctx = {
          accent: mine.accent,
          onAnswer: mine.onAnswer,
          send: function (path, body) {
            body.userId = mine.user.id;
            return post(path, body);
          },
          finish: destroy,
        };
        mine.host = render(res.prompt, ctx);
        mine.ctx = ctx;
      }, opts.delayMs == null ? 600 : opts.delayMs);
      return res.prompt;
    });
  }

  window.BITNIT = { init: init, destroy: destroy, preview: preview };
})();
