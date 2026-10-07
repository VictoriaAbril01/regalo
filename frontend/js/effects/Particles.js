export class Particles {
  constructor(host) { this.host = host; this.frame = null; this.canvas = null; this.particles = []; }
  burst() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'explosion-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.host.append(this.canvas);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth, height = window.innerHeight;
    this.canvas.width = width * ratio;
    this.canvas.height = height * ratio;
    const ctx = this.canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    const colors = ['#183e5d', '#8fb0c3', '#d5b46a', '#fff9e8', '#b58a3a'];
    this.particles = Array.from({ length: 145 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 9;
      return { x: width / 2, y: height * .46, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 3, size: 3 + Math.random() * 8, rotation: Math.random() * 6, spin: (Math.random() - .5) * .18, color: colors[Math.floor(Math.random() * colors.length)], life: 1, heart: Math.random() < .18 };
    });
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const particle of this.particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += .15;
        particle.vx *= .993;
        particle.rotation += particle.spin;
        particle.life -= .008;
        if (particle.life <= 0) continue;
        ctx.save();
        ctx.globalAlpha = Math.max(0, particle.life);
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.fillStyle = particle.color;
        if (particle.heart) {
          ctx.font = `${particle.size * 2.5}px Georgia`;
          ctx.fillText('💛', 0, 0);
        } else ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * .65);
        ctx.restore();
      }
      if (this.particles.some(particle => particle.life > 0)) this.frame = requestAnimationFrame(draw);
      else this.destroy();
    };
    this.frame = requestAnimationFrame(draw);
  }
  destroy() { if (this.frame) cancelAnimationFrame(this.frame); this.frame = null; this.canvas?.remove(); this.canvas = null; this.particles = []; }
}
