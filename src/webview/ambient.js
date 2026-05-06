(() => {
  const canvas = document.getElementById("ambient");
  const whisperEl = document.getElementById("whisper");
  if (!(canvas instanceof HTMLCanvasElement) || !(whisperEl instanceof HTMLDivElement)) {
    return;
  }

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) {
    return;
  }

  const particles = [];
  const baseCount = 190;
  let mode = "idle";
  let intensity = 0.26;

  const pointer = { x: 0, y: 0, active: false };

  function resize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function createParticle(index) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const angle = Math.random() * Math.PI * 2;
    const radius = (Math.min(w, h) * 0.11) + Math.random() * Math.min(w, h) * 0.3;
    return {
      id: index,
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      size: 0.5 + Math.random() * 2,
      alpha: 0.08 + Math.random() * 0.28,
      orbitAngle: angle,
      orbitRadius: radius,
      disperse: 0
    };
  }

  function resetParticles() {
    particles.length = 0;
    for (let i = 0; i < baseCount; i += 1) {
      particles.push(createParticle(i));
    }
  }

  function whisper(message) {
    whisperEl.textContent = message;
    whisperEl.classList.add("show");
    window.setTimeout(() => whisperEl.classList.remove("show"), 9000);
  }

  function drawGenieTarget(p) {
    const cx = window.innerWidth * 0.72;
    const cy = window.innerHeight * 0.58;

    const t = p.id / baseCount;
    const neck = Math.sin(t * Math.PI) * 12;
    const bodyCurve = Math.sin(t * Math.PI * 2.2) * 16;

    return {
      tx: cx + Math.cos(p.orbitAngle) * (p.orbitRadius * (0.25 + intensity * 0.5)) + bodyCurve,
      ty: cy + Math.sin(p.orbitAngle * 1.4) * (p.orbitRadius * 0.14 + neck)
    };
  }

  function animate() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (const p of particles) {
      const target = drawGenieTarget(p);
      const force = mode === "genie" ? 0.009 + intensity * 0.018 : 0.0025;

      if (mode === "disperse") {
        p.disperse = Math.min(1, p.disperse + 0.02);
        p.vx += (Math.random() - 0.5) * 0.3 + (p.x < window.innerWidth / 2 ? -0.02 : 0.02);
        p.vy += (Math.random() - 0.5) * 0.26 - 0.01;
      } else {
        p.disperse = Math.max(0, p.disperse - 0.03);
        p.vx += (target.tx - p.x) * force;
        p.vy += (target.ty - p.y) * force;
      }

      if (pointer.active) {
        const dx = pointer.x - p.x;
        const dy = pointer.y - p.y;
        const dist = Math.max(8, Math.hypot(dx, dy));
        p.vx += (dx / dist) * 0.014;
        p.vy += (dy / dist) * 0.014;
      }

      p.vx *= 0.92;
      p.vy *= 0.92;
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -20 || p.x > window.innerWidth + 20 || p.y < -20 || p.y > window.innerHeight + 20) {
        p.x = Math.random() * window.innerWidth;
        p.y = window.innerHeight + Math.random() * 8;
        p.vx = (Math.random() - 0.5) * 0.2;
        p.vy = -Math.random() * 0.2;
      }

      const fadeByMode = mode === "disperse" ? (1 - p.disperse) : 1;
      const gaze = pointer.active ? 1 : 0.65;
      ctx.fillStyle = `rgba(94, 88, 81, ${p.alpha * fadeByMode * gaze})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(animate);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
  });
  window.addEventListener("mouseleave", () => {
    pointer.active = false;
  });

  window.addEventListener("message", (event) => {
    const msg = event.data;
    if (!msg || typeof msg !== "object") {
      return;
    }

    if (msg.type === "state") {
      intensity = typeof msg.intensity === "number" ? Math.max(0.15, Math.min(1, msg.intensity)) : intensity;
      mode = (msg.state === "anxious" || msg.state === "lost" || msg.state === "focused") ? "genie" : "idle";
    }

    if (msg.type === "whisper" && typeof msg.message === "string") {
      whisper(msg.message);
    }

    if (msg.type === "disperse") {
      mode = "disperse";
      setTimeout(() => {
        mode = "idle";
      }, 3400);
    }
  });

  resize();
  resetParticles();
  animate();
})();
