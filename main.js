(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Heartbeat: one thin stroke, a red dot draws it ---------- */
  const wave = document.querySelector(".wave");
  const canvas = wave && wave.querySelector("canvas");

  if (canvas) {
    const PERIOD = 680;   // px per heartbeat
    const AMP = 96;       // px height of the R spike
    const TRAIL = 520;    // px length of the bright trail
    const SPEED = 240;    // px per second
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, dpr = 1, mid = 0;

    const g = (u, c, s) => Math.exp(-0.5 * ((u - c) / s) ** 2);
    // P wave, Q dip, R spike, S dip, T wave
    const beat = (u) =>
      0.10 * g(u, 0.16, 0.035) - 0.14 * g(u, 0.385, 0.007) +
      1.00 * g(u, 0.425, 0.0085) - 0.28 * g(u, 0.462, 0.010) +
      0.22 * g(u, 0.70, 0.045);
    const yAt = (x) => mid - beat((x % PERIOD) / PERIOD) * AMP;

    function size() {
      w = wave.clientWidth;
      h = Math.ceil(AMP * 2 + 60);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      wave.style.height = h + "px";
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      mid = h / 2 + AMP * 0.12;
    }

    function path(x0, x1) {
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 1) {
        const y = yAt(x);
        x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
    }

    function draw(head) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.lineJoin = "round"; ctx.lineCap = "round";

      // faint full track
      ctx.strokeStyle = "rgba(17,17,17,0.12)";
      ctx.lineWidth = 1;
      path(0, w); ctx.stroke();

      // bright trail behind the head
      const x0 = Math.max(0, head - TRAIL), x1 = Math.min(w, head);
      if (x1 > x0 + 1) {
        const gr = ctx.createLinearGradient(head - TRAIL, 0, head, 0);
        gr.addColorStop(0, "rgba(17,17,17,0)");
        gr.addColorStop(1, "rgba(17,17,17,1)");
        ctx.strokeStyle = gr;
        ctx.lineWidth = 1.5;
        path(x0, x1); ctx.stroke();
      }

      // red head
      if (head >= 0 && head <= w) {
        const y = yAt(head);
        const pulse = reduce ? 0.18 : 0.14 + 0.08 * Math.sin(performance.now() / 260);
        ctx.fillStyle = `rgba(255,59,20,${pulse})`;
        ctx.beginPath(); ctx.arc(head, y, 13, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ff3b14";
        ctx.beginPath(); ctx.arc(head, y, 3.6, 0, Math.PI * 2); ctx.fill();
      }
    }

    size();
    if (reduce) {
      // static: full line with the dot resting on the R spike
      const spike = Math.round(w / 2 / PERIOD) * PERIOD + 0.425 * PERIOD;
      draw(spike);
    } else {
      let start = performance.now();
      const tick = (now) => {
        const travel = w + TRAIL + 120;
        draw(((now - start) / 1000 * SPEED) % travel);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    let rz;
    window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { size(); if (reduce) draw(Math.round(w / 2 / PERIOD) * PERIOD + 0.425 * PERIOD); }, 120); });
  }

  /* ---------- Mobile menu ---------- */
  const nav = document.querySelector(".nav");
  const btn = document.querySelector(".menu-btn");
  const setMenu = (open) => {
    nav.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", String(open));
  };
  if (nav && btn) {
    btn.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
    document.addEventListener("click", (e) => { if (!nav.contains(e.target)) setMenu(false); });
    window.matchMedia("(min-width: 881px)").addEventListener("change", () => setMenu(false));
  }

  /* ---------- Geometric square background ---------- */
  const CELL = 64;
  const bg = document.createElement("div");
  bg.className = "bg";
  bg.setAttribute("aria-hidden", "true");
  // squares fade in once per visit; moving between pages should not re-pop them
  try {
    if (sessionStorage.getItem("pm-bg")) bg.classList.add("is-static");
    else sessionStorage.setItem("pm-bg", "1");
  } catch (_) {}
  document.body.prepend(bg);

  const seeded = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);

  function squares() {
    bg.querySelectorAll("i:not(.hover)").forEach((n) => n.remove());
    const cols = Math.ceil(window.innerWidth / CELL), rows = Math.ceil(window.innerHeight / CELL);
    const rand = seeded(11);
    const frag = document.createDocumentFragment();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = rand();
        if (v > 0.075) continue;
        const el = document.createElement("i");
        if (v < 0.02) el.className = "r";
        el.style.left = c * CELL + "px";
        el.style.top = r * CELL + "px";
        el.style.animationDelay = (rand() * 1.2).toFixed(2) + "s";
        frag.appendChild(el);
      }
    }
    bg.appendChild(frag);
  }
  squares();
  let rs;
  window.addEventListener("resize", () => { clearTimeout(rs); rs = setTimeout(squares, 150); });

  // cells light up under the pointer and fade away
  if (!reduce && window.matchMedia("(hover: hover)").matches) {
    let last = "";
    window.addEventListener("pointermove", (e) => {
      const c = Math.floor(e.clientX / CELL), r = Math.floor(e.clientY / CELL);
      const key = c + "," + r;
      if (key === last) return;
      last = key;
      const el = document.createElement("i");
      el.className = "hover";
      el.style.left = c * CELL + "px";
      el.style.top = r * CELL + "px";
      bg.appendChild(el);
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("off")));
      setTimeout(() => el.remove(), 1300);
    }, { passive: true });
  }
  /* ---------- Soft page transitions ----------
     Content steps back for ~200ms, then the next page settles in (see styles.css).
     The nav is never animated, so it stays perfectly still between pages. */
  let leaving = false;
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || leaving || reduce || e.defaultPrevented || e.button !== 0) return;
    if (a.target === "_blank" || a.hasAttribute("download") || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin && url.protocol !== "file:") return;
    if (url.pathname === location.pathname || !/\.html$/.test(url.pathname)) return;
    e.preventDefault();
    leaving = true;
    document.body.classList.add("is-leaving");
    setTimeout(() => { location.href = a.href; }, 180);
  });
  window.addEventListener("pageshow", (e) => { if (e.persisted) { leaving = false; document.body.classList.remove("is-leaving"); } });
})();
