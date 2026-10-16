/* Olive Branch Counseling: motion and small interactions.
   Everything here is progressive enhancement; the pages read fine without it. */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- split headings into words that rise in ---------- */
  document.querySelectorAll('[data-split]').forEach(function (el) {
    var wi = 0;
    function walk(node) {
      Array.from(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement('span');
            w.className = 'w';
            var inner = document.createElement('span');
            inner.style.setProperty('--wi', wi++);
            inner.textContent = part;
            w.appendChild(inner);
            frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    }
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    walk(el);
  });

  /* ---------- staggered children ---------- */
  document.querySelectorAll('[data-stagger]').forEach(function (group) {
    Array.from(group.children).forEach(function (child, i) {
      if (!child.hasAttribute('data-reveal')) child.setAttribute('data-reveal', group.dataset.stagger || '');
      child.style.setProperty('--i', i);
    });
  });

  /* ---------- reveal on scroll ---------- */
  var targets = document.querySelectorAll('[data-reveal], [data-split], [data-observe], .branch');
  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('in'); if (el.classList.contains('branch')) el.classList.add('grown'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        if (e.target.classList.contains('branch')) e.target.classList.add('grown');
        io.unobserve(e.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ---------- page fade-in ---------- */
  requestAnimationFrame(function () { root.classList.add('ready'); });

  /* ---------- nav: shrink on scroll, mobile menu ---------- */
  var nav = document.querySelector('.nav');
  var toggle = document.querySelector('.nav-toggle');
  function onScrollNav() { if (nav) nav.classList.toggle('scrolled', window.scrollY > 12); }
  onScrollNav();
  window.addEventListener('scroll', onScrollNav, { passive: true });
  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = !document.body.classList.contains('nav-open');
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', open);
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      a.addEventListener('click', function () {
        document.body.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('nav-open')) toggle.click();
    });
  }

  /* ---------- mark current page ---------- */
  var here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .site-footer a').forEach(function (a) {
    if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page');
  });

  /* ---------- gentle parallax ---------- */
  var parallax = Array.from(document.querySelectorAll('[data-parallax]'));
  if (!reduce && parallax.length) {
    var ticking = false;
    function updateParallax() {
      var vh = window.innerHeight;
      parallax.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var center = r.top + r.height / 2 - vh / 2;
        var speed = parseFloat(el.dataset.parallax) || 0.1;
        el.style.translate = '0 ' + (center * -speed).toFixed(1) + 'px';
      });
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(updateParallax); }
    }, { passive: true });
    updateParallax();
  }

  /* ---------- magnetic buttons ---------- */
  if (!reduce && finePointer) {
    document.querySelectorAll('.btn').forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        btn.style.setProperty('--bx', ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + 'px');
        btn.style.setProperty('--by', ((e.clientY - r.top - r.height / 2) * 0.28).toFixed(1) + 'px');
      });
      btn.addEventListener('pointerleave', function () {
        btn.style.setProperty('--bx', '0px');
        btn.style.setProperty('--by', '0px');
      });
    });
  }

  /* ---------- hero portrait follows the pointer a little ---------- */
  var portrait = document.querySelector('.portrait');
  if (!reduce && finePointer && portrait) {
    var hero = portrait.closest('section');
    hero.addEventListener('pointermove', function (e) {
      var x = e.clientX / window.innerWidth - 0.5;
      var y = e.clientY / window.innerHeight - 0.5;
      portrait.style.transform = 'perspective(900px) rotateY(' + (x * 5).toFixed(2) + 'deg) rotateX(' + (-y * 4).toFixed(2) + 'deg)';
    });
    hero.addEventListener('pointerleave', function () { portrait.style.transform = ''; });
    portrait.style.transition = 'transform 1.2s cubic-bezier(.2,.7,.2,1)';
  }

  /* ---------- breathing exercise: in 4, hold 2, out 6 ---------- */
  document.querySelectorAll('[data-breathe]').forEach(function (wrap) {
    var stage = wrap.querySelector('.breath-stage');
    var label = wrap.querySelector('.breath-label');
    var count = wrap.querySelector('.breath-count');
    var btn = wrap.querySelector('.breath-btn');
    var phases = [
      { key: 'in', text: 'Breathe in', secs: 4 },
      { key: 'hold', text: 'Hold', secs: 2 },
      { key: 'out', text: 'Breathe out', secs: 6 }
    ];
    var rounds = 4, timer = null, running = false;

    function setLabel(text) {
      label.classList.add('fading');
      setTimeout(function () { label.textContent = text; label.classList.remove('fading'); }, 300);
    }
    function stop(done) {
      running = false;
      clearTimeout(timer);
      stage.removeAttribute('data-phase');
      setLabel(done ? 'Well done' : 'Ready when you are');
      count.textContent = done ? 'Notice how you feel right now.' : '';
      btn.textContent = done ? 'Breathe again' : 'Begin';
    }
    function run(round, p) {
      if (!running) return;
      if (p >= phases.length) { p = 0; round++; }
      if (round > rounds) { stop(true); return; }
      var ph = phases[p];
      stage.setAttribute('data-phase', ph.key);
      setLabel(ph.text);
      count.textContent = 'Breath ' + round + ' of ' + rounds;
      timer = setTimeout(function () { run(round, p + 1); }, ph.secs * 1000);
    }
    btn.addEventListener('click', function () {
      if (running) { stop(false); return; }
      running = true;
      btn.textContent = 'Stop';
      run(1, 0);
    });
  });

  /* ---------- contact form ---------- */
  document.querySelectorAll('form.contact-form').forEach(function (form) {
    var status = form.querySelector('.form-status');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var action = form.getAttribute('action');
      if (!action) {
        // Draft site: no form service is connected yet.
        status.textContent = 'This form isn’t connected yet. For now, please call (609) 326-3955.';
        status.hidden = false;
        return;
      }
      var btn = form.querySelector('[type="submit"]');
      btn.disabled = true;
      fetch(action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (r) {
          if (!r.ok) throw new Error();
          form.reset();
          status.textContent = 'Thank you. Your message reached Brenda, and she’ll be in touch soon.';
        })
        .catch(function () {
          status.textContent = 'Something went wrong sending your message. Please try again or call (609) 326-3955.';
        })
        .finally(function () { status.hidden = false; btn.disabled = false; });
    });
  });

  /* ---------- footer year ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
