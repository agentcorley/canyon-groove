/* Cumberland Coast site chrome for standalone hosting.
   Footer mirrors cumberlandcoast.com. Subscribe posts to Buttondown (The Catalog).
   Embed helpers let an experiment live inside a WordPress page as an iframe. */
(function () {
  'use strict';
  const BUTTONDOWN = 'https://buttondown.com/api/emails/embed-subscribe/catalog';
  const SITE = 'https://cumberlandcoast.com';
  const params = new URLSearchParams(location.search);

  function esc(s) { return String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); }

  /* Buttondown form. Plain POST in a new tab, never fetch: Buttondown may ask the
     subscriber to pass a check or fix a typo, and that has to happen on their page. */
  function subscribeForm(o) {
    o = o || {};
    const hidden = [
      ['embed', '1'],
      ['tag', o.tag || 'cumberland-coast'],
      ['metadata__source', o.source || location.hostname + location.pathname],
    ];
    for (const k in (o.metadata || {})) hidden.push(['metadata__' + k, o.metadata[k]]);
    return '<form action="' + BUTTONDOWN + '" method="post" target="_blank" class="lab-subscribe"' + (o.id ? ' id="' + esc(o.id) + '"' : '') + '>'
      + hidden.map(([k, v]) => '<input type="hidden" name="' + esc(k) + '" value="' + esc(v) + '">').join('')
      + (o.before || '')
      + '<input type="email" name="email" required autocomplete="email" placeholder="' + esc(o.placeholder || 'you@example.com') + '" aria-label="Email">'
      + '<button type="submit">' + esc(o.cta || 'Subscribe') + '</button>'
      + '</form>';
  }

  function footer(mount, o) {
    o = o || {};
    const year = new Date().getFullYear();
    mount.classList.add('lab-footer');
    mount.innerHTML =
      '<div class="lf-grid">'
      + '<div><div class="lf-brand"><a href="' + SITE + '" target="_blank" rel="noopener">Cumberland Coast</a></div>'
      + '<div>Strategy + Craft. An advisory firm with a studio.</div>'
      + '<div style="margin-top:.5rem">51 S Peachtree St #2<br>Norcross, GA 30071</div></div>'
      + '<div><h4>Navigate</h4><ul>'
      + ['Work', 'Consulting', 'Studio', 'About', 'Contact'].map(n => '<li><a href="' + SITE + '/' + n.toLowerCase() + '" target="_blank" rel="noopener">' + n + '</a></li>').join('')
      + '</ul></div>'
      + '<div><h4>Other places we show up</h4><ul>'
      + '<li><a href="https://personalizecx.com" target="_blank" rel="noopener">PersonalizeCX.com</a></li>'
      + '<li><a href="https://jonathancorley.com" target="_blank" rel="noopener">JonathanCorley.com</a></li>'
      + '<li><a href="https://norcrosssocialclub.substack.com" target="_blank" rel="noopener">Norcross Social Club</a></li>'
      + '<li><a href="https://www.linkedin.com/in/jonathancorley" target="_blank" rel="noopener">LinkedIn</a></li>'
      + '<li><a href="https://github.com/agentcorley" target="_blank" rel="noopener">GitHub</a></li>'
      + '</ul></div>'
      + '<div class="lf-catalog"><h4>The Catalog</h4>'
      + '<p>A dispatch on ideas, tools, and the people building tomorrow’s experiences. Weekly, from Jonathan Corley.</p>'
      + subscribeForm({ tag: o.tag || 'cumberland-coast', source: o.source, cta: 'Subscribe' })
      + '<p style="margin-top:.5rem;font-size:.66rem">Or read it first at <a href="https://buttondown.com/catalog" target="_blank" rel="noopener">buttondown.com/catalog</a>.</p>'
      + '</div></div>'
      + '<div class="lf-legal"><span>Cumberland Coast LLC, founded 2014</span><span>Built in Atlanta</span><span>All rights reserved &copy; ' + year + '</span>'
      + (o.extra ? '<span>' + o.extra + '</span>' : '') + '</div>';
  }

  /* Embedding. ?embed=1 or an iframe parent hides the chrome the host page already has.
     ?canonical=URL makes share links point at the host page instead of the app host. */
  function isEmbedded() { return params.get('embed') === '1' || window.self !== window.top; }
  function canonical() { const c = params.get('canonical'); return c && /^https?:\/\//.test(c) ? c.replace(/#.*$/, '') : null; }
  function shareBase() { return canonical() || (location.origin + location.pathname); }
  function postToParent(msg) { if (window.self !== window.top) { try { window.parent.postMessage(msg, '*'); } catch (e) {} } }
  function autoHeight() {
    if (window.self === window.top) return;
    let last = 0;
    /* Measure the body, not the document: the document is never shorter than the
       frame's own viewport, and the host sizes the frame from this number, so
       measuring the document would grow the frame forever. */
    const send = () => { const cs = getComputedStyle(document.body); const h = Math.ceil(document.body.getBoundingClientRect().height + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0)); if (h > 0 && Math.abs(h - last) > 1) { last = h; postToParent({ type: 'cg-height', h }); } };
    new ResizeObserver(send).observe(document.body);
    postToParent({ type: 'cg-hello' });
    window.addEventListener('load', send); setInterval(send, 1500); send();
  }
  /* Bring an element into view. A host page running the current embed block
     answers our hello and scrolls precisely on request. Older blocks never
     answer, so the app falls back to the browser's own scrollIntoView, which
     scrolls the host too after a click. */
  let hostScrolls = false;
  window.addEventListener('message', e => { if (e.source === window.parent && e.data && e.data.type === 'cg-host') hostScrolls = !!e.data.scroll; });
  function reveal(el, margin) {
    if (!el) return;
    if (window.self === window.top || !hostScrolls) { el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
    const send = () => { const r = el.getBoundingClientRect(); postToParent({ type: 'cg-scroll', top: r.top + window.scrollY, height: r.height, margin: margin || 24 }); };
    send();
    // The frame grows as the panel opens and the host may shift its scroll to
    // compensate; a second request after it settles corrects any drift.
    setTimeout(send, 450);
  }
  function syncHash() {
    if (window.self === window.top) return;
    window.addEventListener('hashchange', () => postToParent({ type: 'cg-hash', hash: location.hash }));
    const orig = history.replaceState.bind(history);
    history.replaceState = function (s, t, u) { orig(s, t, u); postToParent({ type: 'cg-hash', hash: location.hash }); };
  }

  /* A link to another site must open in a new tab. Inside an iframe an ordinary
     link navigates the frame, and sites that refuse framing (Reddit among them)
     render as a blank box on the host page. */
  document.addEventListener('click', e => {
    const a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
    let u; try { u = new URL(a.href, location.href); } catch (err) { return; }
    if (!/^https?:$/.test(u.protocol) || u.origin === location.origin) return;
    e.preventDefault();
    window.open(u.href, '_blank', 'noopener');
  }, true);

  window.CCLab = { subscribeForm, footer, isEmbedded, canonical, shareBase, autoHeight, syncHash, reveal, esc, BUTTONDOWN, SITE };
})();
