/* ════════════════════════════════════════════════════════════════════════════
   CONSTRUALUM · comportamiento de la landing
   Dependencias (CDN, cargadas con defer antes de este archivo):
     · GSAP + ScrollTrigger  → animaciones ligadas al scroll
     · Lenis                 → scroll suave con inercia
   Todo lo demás (shader WebGL del hero, acordeones, cotizador) es JS propio.
   Si una librería no carga, la página sigue siendo 100% usable (modo estático).
   ════════════════════════════════════════════════════════════════════════════ */
(() => {
    'use strict';

    /* ── CONFIGURACIÓN ──────────────────────────────────────────────────────── */
    const WA_NUMBER = '5213141024780';                       // +52 1 314 102 4780
    const waURL = (text) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;

    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

    /** Ejecuta un módulo sin que un error tumbe al resto de la página. */
    const safe = (name, fn, critical = false) => {
        try { return fn(); } catch (err) {
            console.error(`[Construalum] ${name}:`, err);
            if (critical) root.classList.add('static');
        }
    };

    let lenis = null;
    const hasGsap = () => !!(window.gsap && window.ScrollTrigger);

    /* ════════════════════════════════════════════════════════════════════════
       1. MÓDULOS QUE NO DEPENDEN DE GSAP
       ════════════════════════════════════════════════════════════════════════ */

    /** Todos los CTA llevan su mensaje propio hacia WhatsApp. */
    function hookWhatsApp() {
        $$('[data-wa]').forEach((a) => { a.href = waURL(a.dataset.wa); });
    }

    /** Acordeón de preguntas frecuentes (una abierta a la vez). */
    function initAccordion() {
        const items = $$('[data-accordion] .acc');
        items.forEach((item) => {
            const btn = $('.acc__btn', item);
            btn.addEventListener('click', () => {
                const open = !item.classList.contains('is-open');
                items.forEach((o) => {
                    o.classList.remove('is-open');
                    $('.acc__btn', o).setAttribute('aria-expanded', 'false');
                });
                if (open) {
                    item.classList.add('is-open');
                    btn.setAttribute('aria-expanded', 'true');
                }
                if (hasGsap()) setTimeout(() => ScrollTrigger.refresh(), 700);
            });
        });
    }

    /** Pestañas Residencial / Comercial con barra deslizante. */
    function initTabs() {
        const tabs = $$('.tab');
        const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
        const bar = $('.tabs__bar');
        if (!tabs.length) return;

        const moveBar = () => {
            const active = tabs.find((t) => t.classList.contains('is-active')) || tabs[0];
            bar.style.setProperty('--x', `${active.offsetLeft}px`);
            bar.style.setProperty('--w', `${active.offsetWidth}px`);
        };
        const show = (i, focus) => {
            tabs.forEach((t, k) => {
                const on = k === i;
                t.classList.toggle('is-active', on);
                t.setAttribute('aria-selected', String(on));
                t.tabIndex = on ? 0 : -1;
                panels[k].hidden = !on;
                panels[k].classList.toggle('is-active', on);
            });
            if (focus) tabs[i].focus();
            moveBar();
            if (hasGsap() && !reduceMotion) {
                const boxes = $$('.gal__box', panels[i]);
                gsap.fromTo(boxes, { clipPath: 'inset(0 0 100% 0)' },
                    { clipPath: 'inset(0 0 0% 0)', duration: 1.1, stagger: 0.09, ease: 'power4.out', clearProps: 'clipPath' });
                gsap.fromTo($$('img', panels[i]), { scale: 1.3 }, { scale: 1, duration: 1.6, stagger: 0.09, ease: 'power3.out', clearProps: 'scale' });
                ScrollTrigger.refresh();
            }
        };
        tabs.forEach((t, i) => {
            t.addEventListener('click', () => show(i));
            t.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowRight') { e.preventDefault(); show((i + 1) % tabs.length, true); }
                if (e.key === 'ArrowLeft') { e.preventDefault(); show((i - 1 + tabs.length) % tabs.length, true); }
            });
        });
        moveBar();
        window.addEventListener('resize', moveBar);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveBar);
    }

    /** Cotizador de 3 pasos que termina en un mensaje de WhatsApp ya redactado. */
    function initQuote() {
        const form = $('#cotizador');
        if (!form) return;
        const steps = $$('.qs', form);
        const dots = $$('.quote__steps li', form);
        const prev = $('[data-prev]', form);
        const next = $('[data-next]', form);
        const send = $('[data-send]', form);
        const done = $('.quote__done', form);
        const fallback = $('[data-fallback]', form);
        let cur = 0;

        const show = (n, focus = true) => {
            cur = n;
            steps.forEach((s, i) => s.classList.toggle('is-active', i === n));
            dots.forEach((d, i) => d.classList.toggle('is-on', i <= n));
            prev.hidden = n === 0;
            next.hidden = n === steps.length - 1;
            send.hidden = n !== steps.length - 1;
            done.hidden = true;
            const fs = steps[n];
            if (hasGsap() && !reduceMotion) gsap.fromTo(fs, { opacity: 0, x: 28 }, { opacity: 1, x: 0, duration: 0.6, ease: 'power3.out' });
            if (focus) {
                const target = $('input:checked, input:not([type=checkbox]):not([type=radio]), input', fs);
                if (target) target.focus({ preventScroll: true });
            }
        };

        const valid = () => {
            const fs = steps[cur];
            const err = $('.qerr', fs);
            let ok = true;
            if (cur === 0) ok = $$('input[name=servicio]:checked', form).length > 0;
            if (cur === 2) {
                const name = $('#q-nombre');
                ok = name.value.trim().length > 1;
                name.setAttribute('aria-invalid', String(!ok));
            }
            if (err) err.hidden = ok;
            return ok;
        };

        const message = () => {
            const data = new FormData(form);
            const servicios = data.getAll('servicio');
            const lines = [
                'Hola Construalum, quiero cotizar un proyecto.',
                '',
                `• Necesito: ${servicios.length ? servicios.join(', ') : 'Asesoría general'}`,
                `• Tipo de proyecto: ${data.get('tipo')}`,
                `• Medidas: ${data.get('medidas')}`,
                `• Mi nombre: ${String(data.get('nombre') || '').trim()}`
            ];
            const extra = String(data.get('mensaje') || '').trim();
            if (extra) lines.push(`• Comentarios: ${extra}`);
            return lines.join('\n');
        };

        next.addEventListener('click', () => { if (valid()) show(cur + 1); });
        prev.addEventListener('click', () => show(cur - 1));
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (cur < steps.length - 1) { if (valid()) show(cur + 1); return; }
            if (!valid()) return;
            const url = waURL(message());
            fallback.href = url;
            done.hidden = false;
            const win = window.open(url, '_blank', 'noopener');
            if (!win) done.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
        $('#q-nombre').addEventListener('input', (e) => {
            if (e.target.value.trim().length > 1) { e.target.setAttribute('aria-invalid', 'false'); $('.qerr', steps[2]).hidden = true; }
        });
        $$('input[name=servicio]', form).forEach((c) => c.addEventListener('change', () => { $('.qerr', steps[0]).hidden = true; }));
        show(0, false);
    }

    /** Menú móvil a pantalla completa con foco atrapado. */
    function initMenu() {
        const burger = $('#burger');
        const menu = $('#menu');
        if (!burger || !menu) return;
        const links = $$('a', menu);
        let open = false;

        const set = (state) => {
            if (open === state) return;
            open = state;
            burger.setAttribute('aria-expanded', String(open));
            burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
            root.classList.toggle('menu-open', open);
            if (open) {
                menu.hidden = false;
                if (lenis) lenis.stop(); else document.body.style.overflow = 'hidden';
                if (hasGsap() && !reduceMotion) {
                    gsap.fromTo(menu, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.8, ease: 'power4.inOut', clearProps: 'clipPath' });
                    gsap.fromTo($$('.menu__link, .menu__foot > *', menu), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.07, delay: 0.25 });
                }
                links[0].focus({ preventScroll: true });
            } else {
                if (lenis) lenis.start(); else document.body.style.overflow = '';
                if (hasGsap() && !reduceMotion) {
                    gsap.to(menu, { clipPath: 'inset(0 0 100% 0)', duration: 0.6, ease: 'power4.inOut', onComplete: () => { menu.hidden = true; gsap.set(menu, { clearProps: 'clipPath' }); } });
                } else menu.hidden = true;
                burger.focus({ preventScroll: true });
            }
        };
        burger.addEventListener('click', () => set(!open));
        document.addEventListener('keydown', (e) => {
            if (!open) return;
            if (e.key === 'Escape') set(false);
            if (e.key === 'Tab') {
                const list = [burger, ...$$('a, button', menu)];
                const first = list[0], last = list[list.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        });
        links.forEach((l) => l.addEventListener('click', () => set(false)));
        window.__closeMenu = () => set(false);
    }

    /** Scroll a anclas (Lenis cuando existe, nativo si no). */
    function initAnchors() {
        $$('a[href^="#"]').forEach((a) => {
            a.addEventListener('click', (e) => {
                const id = a.getAttribute('href');
                if (!id || id === '#') return;
                const target = id === '#inicio' ? document.body : $(id);
                if (!target) return;
                e.preventDefault();
                if (lenis) lenis.scrollTo(id === '#inicio' ? 0 : target, { duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) });
                else target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
                history.replaceState(null, '', id);
            });
        });
        const top = $('[data-top]');
        if (top) top.addEventListener('click', () => (lenis ? lenis.scrollTo(0, { duration: 2.2 }) : window.scrollTo({ top: 0, behavior: 'smooth' })));
    }

    /** Servicios: lista viva que rota sola y un escenario de imágenes con cortina. */
    function initServices() {
        const box = $('[data-services]');
        if (!box) return;
        const items = $$('.srv__item', box);
        const figs = $$('.srv__fig', box);
        const DUR = 6500;
        let cur = 0;
        let manual = reduceMotion;
        box.style.setProperty('--srv-dur', `${DUR}ms`);
        if (manual) box.classList.add('is-manual');

        const set = (i) => {
            if (i === cur) return;
            items.forEach((it, k) => {
                const on = k === i;
                it.classList.toggle('is-active', on);
                $('.srv__btn', it).setAttribute('aria-expanded', String(on));
            });
            figs.forEach((f, k) => {
                f.classList.toggle('is-prev', k === cur);
                f.classList.toggle('is-active', k === i);
            });
            cur = i;
            const prog = $('.srv__prog', items[i]);
            prog.style.animation = 'none'; void prog.offsetWidth; prog.style.animation = '';
        };
        items.forEach((it, i) => {
            $('.srv__btn', it).addEventListener('click', () => {
                manual = true; box.classList.add('is-manual');
                set(i);
            });
        });
        box.addEventListener('animationend', (e) => {
            if (!manual && e.target.classList && e.target.classList.contains('srv__prog')) set((cur + 1) % items.length);
        });

        // pausa al interactuar o cuando la sección no está en pantalla
        const list = $('.srv__list', box);
        let hover = false, visible = false;
        const sync = () => box.classList.toggle('is-paused', hover || !visible);
        list.addEventListener('pointerenter', () => { hover = true; sync(); });
        list.addEventListener('pointerleave', () => { hover = false; sync(); });
        list.addEventListener('focusin', () => { hover = true; sync(); });
        list.addEventListener('focusout', () => { hover = false; sync(); });
        new IntersectionObserver((en) => { visible = en[0].isIntersecting; sync(); }, { threshold: 0.25 }).observe(box);
        sync();
    }

    /** Foco de luz que sigue al cursor en las tarjetas bento. */
    function initSpotlight() {
        if (!finePointer) return;
        $$('[data-spot]').forEach((el) => {
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                el.style.setProperty('--mx', `${e.clientX - r.left}px`);
                el.style.setProperty('--my', `${e.clientY - r.top}px`);
            }, { passive: true });
        });
    }

    /* ════════════════════════════════════════════════════════════════════════
       2. SHADER WEBGL DEL HERO
          Luz que atraviesa cristal: dominio distorsionado + brillo rojo de
          marca + partículas bokeh. Se pausa fuera de pantalla.
       ════════════════════════════════════════════════════════════════════════ */
    const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse;
float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
  float a = hash(i); float b = hash(i+vec2(1.0,0.0)); float c = hash(i+vec2(0.0,1.0)); float d = hash(i+vec2(1.0,1.0));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}
float fbm(vec2 p){ float v = 0.0; float a = 0.5; for(int i=0;i<5;i++){ v += a*noise(p); p = p*2.02 + vec2(1.7,9.2); a *= 0.5; } return v; }
void main(){
  vec2 frag = gl_FragCoord.xy;
  vec2 p = (frag - 0.5*uRes) / min(uRes.x, uRes.y);
  float t = uTime*0.05;
  vec2 q = vec2(fbm(p*1.3 + vec2(0.0, t)), fbm(p*1.3 + vec2(5.2,1.3) - t));
  vec2 r = vec2(fbm(p*1.6 + 3.5*q + vec2(1.7,9.2) + t*1.2), fbm(p*1.6 + 3.5*q + vec2(8.3,2.8) - t));
  float f = fbm(p*1.1 + 3.2*r);

  vec3 ink   = vec3(0.024, 0.031, 0.047);
  vec3 steel = vec3(0.060, 0.105, 0.190);
  vec3 ice   = vec3(0.50, 0.66, 0.98);
  vec3 red   = vec3(0.89, 0.12, 0.14);

  vec3 col = mix(ink, steel, smoothstep(0.2, 0.9, f));

  /* velos de cristal: bandas diagonales deformadas */
  float bands = sin((p.x*1.4 - p.y*1.0 + r.x*2.2 + t*6.0)*3.2);
  bands = smoothstep(0.55, 1.0, bands);
  col += ice * bands * smoothstep(0.35, 0.85, f) * 0.075;

  /* calor rojo de marca, atraído por el cursor */
  vec2 m = (uMouse - 0.5) * vec2(uRes.x/uRes.y, 1.0);
  float heat = exp(-length(p - vec2(0.62,-0.40) - m*0.30) * 2.2);
  col += red * heat * (0.20 + 0.38*f);
  float heat2 = exp(-length(p - vec2(-0.75,0.55)) * 2.4);
  col += vec3(0.10,0.20,0.40) * heat2 * 0.45;

  /* partículas bokeh a la deriva */
  for(int k=0;k<2;k++){
    float s = 5.0 + float(k)*4.0;
    vec2 g = p*s + vec2(float(k)*7.3, -t*(6.0 + float(k)*3.0));
    vec2 id = floor(g); vec2 gv = fract(g) - 0.5;
    float h = hash(id + float(k)*13.1);
    vec2 off = (vec2(hash(id+1.7), hash(id+9.2)) - 0.5) * 0.6;
    float d = length(gv - off);
    float rad = 0.04 + 0.05*hash(id+3.3);
    float b = smoothstep(rad, rad*0.2, d) * step(0.86, h);
    float tw = 0.5 + 0.5*sin(uTime*0.8 + h*30.0);
    vec3 bc = mix(vec3(0.75,0.85,1.0), red, step(0.93, hash(id+5.5)));
    col += bc * b * tw * 0.30;
  }

  float v = smoothstep(1.35, 0.25, length(p*vec2(0.8,1.0)));
  col *= mix(0.55, 1.0, v);
  col += (hash(frag + uTime) - 0.5) * 0.012;
  gl_FragColor = vec4(col, 1.0);
}`;

    function initHeroGL() {
        const canvas = $('.hero__gl');
        const hero = $('.hero');
        if (!canvas || !hero) return;
        const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
        if (!gl) return;

        const compile = (type, src) => {
            const s = gl.createShader(type);
            gl.shaderSource(s, src); gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
            return s;
        };
        const prog = gl.createProgram();
        gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
        gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
        gl.useProgram(prog);

        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, 'p');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

        const uRes = gl.getUniformLocation(prog, 'uRes');
        const uTime = gl.getUniformLocation(prog, 'uTime');
        const uMouse = gl.getUniformLocation(prog, 'uMouse');

        const mouse = { x: 0.6, y: 0.4, tx: 0.6, ty: 0.4 };
        const resize = () => {
            const k = Math.min(window.devicePixelRatio || 1, 1.5) * (window.innerWidth < 768 ? 0.42 : 0.58);
            const w = Math.max(2, Math.round(canvas.clientWidth * k));
            const h = Math.max(2, Math.round(canvas.clientHeight * k));
            if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
        };
        const draw = (time) => {
            resize();
            mouse.x += (mouse.tx - mouse.x) * 0.05;
            mouse.y += (mouse.ty - mouse.y) * 0.05;
            gl.uniform2f(uRes, canvas.width, canvas.height);
            gl.uniform1f(uTime, time);
            gl.uniform2f(uMouse, mouse.x, mouse.y);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        };

        if (finePointer) {
            hero.addEventListener('pointermove', (e) => {
                const r = hero.getBoundingClientRect();
                mouse.tx = (e.clientX - r.left) / r.width;
                mouse.ty = 1 - (e.clientY - r.top) / r.height;
            }, { passive: true });
        }

        // un solo fotograma si el usuario pidió menos movimiento
        if (reduceMotion) { draw(14); canvas.classList.add('is-on'); return; }

        let visible = true, raf = 0;
        const start = performance.now();
        const loop = () => {
            raf = 0;
            if (!visible || document.hidden) return;
            draw((performance.now() - start) / 1000 + 14);
            raf = requestAnimationFrame(loop);
        };
        const kick = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop); };
        new IntersectionObserver((en) => { visible = en[0].isIntersecting; kick(); }, { threshold: 0 }).observe(hero);
        document.addEventListener('visibilitychange', kick);
        draw(14);
        canvas.classList.add('is-on');
        kick();
    }

    /* ════════════════════════════════════════════════════════════════════════
       3. PRELOADER: dos hojas de ventana corrediza que se abren
       ════════════════════════════════════════════════════════════════════════ */
    function runLoader(onReveal) {
        const loader = $('#loader');
        if (!loader) { onReveal(); return Promise.resolve(); }

        return new Promise((resolve) => {
            const arms = $$('.ld__arm', loader);
            const ring = $('.ld__ring', loader);
            const count = $('.ld__count', loader);
            const bar = $('.ld__bar i', loader);
            const state = { v: 0 };
            const render = () => {
                count.textContent = String(Math.round(state.v)).padStart(3, '0');
                bar.style.transform = `scaleX(${state.v / 100})`;
            };

            gsap.set(arms, { scaleY: 0, svgOrigin: '0 0' });
            gsap.set(['.ld__word', '.ld__sub', '.ld__meter'], { opacity: 0, y: 14 });

            const intro = gsap.timeline();
            intro
                .to(ring, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut' }, 0.1)
                .to(arms, { scaleY: 1, duration: 0.95, ease: 'back.out(1.7)', stagger: 0.07 }, 0.45)
                .to(['.ld__word', '.ld__sub', '.ld__meter'], { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.1 }, 0.9);

            // la marca respira mientras carga
            gsap.to('.ld__mark', { rotation: 360, duration: 14, ease: 'none', repeat: -1 });
            gsap.to(state, { v: 92, duration: 2.2, ease: 'power1.out', onUpdate: render });

            let loaded = document.readyState === 'complete';
            if (!loaded) window.addEventListener('load', () => { loaded = true; }, { once: true });
            const minTime = reduceMotion ? 0 : 2300;
            const t0 = performance.now();

            const exit = () => {
                gsap.killTweensOf('.ld__mark');
                const ex = gsap.timeline({
                    onComplete: () => { loader.remove(); resolve(); }
                });
                ex.to('.ld__center', { scale: 1.1, opacity: 0, duration: 0.6, ease: 'power2.in' })
                    .to('.ld__panel--l', { xPercent: -101, duration: 1.3, ease: 'power4.inOut' }, '-=0.15')
                    .to('.ld__panel--r', { xPercent: 101, duration: 1.3, ease: 'power4.inOut' }, '<')
                    .add(onReveal, '-=0.85');
            };
            const finish = () => gsap.to(state, { v: 100, duration: 0.5, ease: 'power2.out', onUpdate: render, onComplete: exit });

            const poll = setInterval(() => {
                const elapsed = performance.now() - t0;
                if ((loaded && elapsed >= minTime) || elapsed > 6500) { clearInterval(poll); finish(); }
            }, 80);
        });
    }

    /* ════════════════════════════════════════════════════════════════════════
       4. INTRO DEL HERO + EFECTOS CONSTANTES
       ════════════════════════════════════════════════════════════════════════ */
    function heroIntro() {
        const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
        tl.fromTo('.ln__in', { yPercent: 112, y: 0 }, { yPercent: 0, y: 0, duration: 1.35, stagger: 0.12 }, 0)
            .fromTo('[data-hero-in]', { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.16 }, 0.45)
            .fromTo('.win', { '--ty': '-26deg', '--tx': '7deg' }, { '--ty': '0deg', '--tx': '0deg', duration: 2.2, ease: 'power3.out' }, 0.35)
            .fromTo('.win', { scale: 0.9 }, { scale: 1, duration: 2, ease: 'power3.out' }, 0.35)
            .fromTo('.cota__line', { scaleX: 0, scaleY: 0 }, { scaleX: 1, scaleY: 1, duration: 1.4, ease: 'power3.inOut', stagger: 0.2 }, 1.1)
            .fromTo('.cota__lbl', { opacity: 0 }, { opacity: 1, duration: 0.9 }, 1.7)
            .fromTo('.seal', { scale: 0, rotation: -120 }, { scale: 1, rotation: 0, duration: 1.4, ease: 'back.out(1.5)' }, 1.3);
        return tl;
    }

    /** Inclinación 3D de la ventana + paralaje de la imagen según el cursor. */
    function initHeroTilt() {
        const win = $('#win');
        const hero = $('.hero');
        const img = $('.win__img');
        if (!win || !finePointer || reduceMotion) return;
        const t = { x: 0, y: 0 }, c = { x: 0, y: 0 };
        hero.addEventListener('pointermove', (e) => {
            const r = hero.getBoundingClientRect();
            t.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
            t.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
        }, { passive: true });
        hero.addEventListener('pointerleave', () => { t.x = 0; t.y = 0; });
        gsap.ticker.add(() => {
            c.x += (t.x - c.x) * 0.07;
            c.y += (t.y - c.y) * 0.07;
            if (Math.abs(c.x - t.x) + Math.abs(c.y - t.y) < 0.0005) return;
            // "--ty" y "--tx" se consumen en .win__frame; la imagen se desplaza a contramano
            win.style.setProperty('--ty', `${(c.x * 7).toFixed(2)}deg`);
            win.style.setProperty('--tx', `${(-c.y * 5).toFixed(2)}deg`);
            img.style.transform = `translate3d(${(-c.x * 14).toFixed(1)}px, ${(-c.y * 10).toFixed(1)}px, 0)`;
        });
    }

    /** Botones magnéticos: se acercan suavemente al cursor. */
    function initMagnetic() {
        if (!finePointer || reduceMotion) return;
        $$('[data-magnetic]').forEach((el) => {
            el.style.transition = 'none';
            const qx = gsap.quickTo(el, 'x', { duration: 0.7, ease: 'elastic.out(1, 0.55)' });
            const qy = gsap.quickTo(el, 'y', { duration: 0.7, ease: 'elastic.out(1, 0.55)' });
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                qx((e.clientX - (r.left + r.width / 2)) * 0.28);
                qy((e.clientY - (r.top + r.height / 2)) * 0.4);
            });
            el.addEventListener('pointerleave', () => { qx(0); qy(0); });
        });
    }

    /** La franja de servicios se acelera (y se invierte) con la velocidad del scroll. */
    function initMarquee() {
        const track = $('.marquee__track');
        if (!track || !track.getAnimations || reduceMotion) return;
        const anim = track.getAnimations()[0];
        if (!anim) return;
        anim.currentTime = 1e8;                    // margen para poder correr hacia atrás
        let dir = 1, rate = 1;
        const baseRate = 1;
        if (lenis) lenis.on('scroll', ({ velocity }) => { if (Math.abs(velocity) > 0.3) dir = velocity < 0 ? -1 : 1; });
        gsap.ticker.add(() => {
            const v = lenis ? Math.abs(lenis.velocity) : 0;
            const target = dir * (baseRate + clamp(v * 0.35, 0, 7));
            rate += (target - rate) * 0.06;
            anim.updatePlaybackRate(rate);
        });
    }

    /* ════════════════════════════════════════════════════════════════════════
       5. ANIMACIONES LIGADAS AL SCROLL
       ════════════════════════════════════════════════════════════════════════ */

    /** Divide un título en palabras para poder encenderlas una a una. */
    function splitWords(el) {
        const text = el.textContent.trim();
        el.setAttribute('aria-label', text);
        el.innerHTML = text.split(/\s+/).map((w) => `<span class="w" aria-hidden="true">${w}</span>`).join(' ');
        return $$('.w', el);
    }

    function initHeaderScroll() {
        const hdr = $('#site-header');
        const bar = $('.hdr__progress');
        const setBar = gsap.quickSetter(bar, 'scaleX');
        ScrollTrigger.create({
            start: 0, end: 'max',
            onUpdate: (self) => {
                setBar(self.progress);
                if (root.classList.contains('menu-open')) return;
                const y = self.scroll();
                hdr.classList.toggle('is-hidden', self.direction === 1 && y > 520);
                if (self.direction === -1 || y < 520) hdr.classList.remove('is-hidden');
            }
        });
        // enlace activo según la sección visible
        $$('.hdr__nav a').forEach((a) => {
            const sec = $(a.getAttribute('href'));
            if (!sec) return;
            ScrollTrigger.create({
                trigger: sec, start: 'top 55%', end: 'bottom 55%',
                onToggle: (self) => a.classList.toggle('is-current', self.isActive)
            });
        });
    }

    function initReveals() {
        const show = (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', stagger: 0.12, overwrite: true });
        ScrollTrigger.batch('[data-reveal]', { start: 'top 90%', onEnter: show, onEnterBack: show });
    }

    function initHeroScroll() {
        const st = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
        gsap.to('.hero__mark', { y: 180, ease: 'none', scrollTrigger: st });
        gsap.to('.hero__copy', { yPercent: -10, ease: 'none', scrollTrigger: st });
        gsap.to('.hero__visual', { yPercent: -16, ease: 'none', scrollTrigger: st });
    }

    function initChapter() {
        gsap.fromTo('.chapter__panel',
            { clipPath: 'inset(9vh 5vw 0vh 5vw)' },
            { clipPath: 'inset(0vh 0vw 0vh 0vw)', ease: 'none', scrollTrigger: { trigger: '.chapter', start: 'top 94%', end: 'top 18%', scrub: true } });

        const title = $('.manifesto');
        if (title) {
            const words = splitWords(title);
            gsap.fromTo(words, { opacity: 0.13 },
                { opacity: 1, ease: 'none', stagger: 0.14, scrollTrigger: { trigger: title, start: 'top 82%', end: 'bottom 48%', scrub: 0.6 } });
        }
        $$('[data-pillar]').forEach((p) => {
            const t = $('.pillar__title', p);
            gsap.fromTo(t, { '--p': '0%' }, { '--p': '100%', ease: 'none', scrollTrigger: { trigger: p, start: 'top 86%', end: 'top 38%', scrub: 0.7 } });
            gsap.fromTo(p, { x: -50, opacity: 0 }, { x: 0, opacity: 1, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: p, start: 'top 90%' } });
        });
    }

    /** La imagen "se abre" como una ventana hasta ocupar toda la pantalla. */
    function initExpand() {
        const small = window.innerWidth < 768;
        const tl = gsap.timeline({
            scrollTrigger: { trigger: '.expand', start: 'top top', end: '+=170%', pin: '.expand__pin', scrub: 0.8, anticipatePin: 1 }
        });
        tl.fromTo('.expand__media', { clipPath: small ? 'inset(26% 14% 26% 14%)' : 'inset(22% 32% 22% 32%)' },
            { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.inOut', duration: 1 }, 0)
            .fromTo('.expand__media img', { scale: 1.5 }, { scale: 1, ease: 'power2.inOut', duration: 1 }, 0)
            .fromTo('.expand__shade', { opacity: 0 }, { opacity: 1, ease: 'none', duration: 0.55 }, 0.45)
            .fromTo('.expand__content > *', { y: 60, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.14, duration: 0.5, ease: 'power3.out' }, 0.72)
            .to({}, { duration: 0.35 });                         // pausa final con la imagen completa
    }

    /** Proceso: scroll horizontal en escritorio, línea que se dibuja en móvil. */
    function initProcess() {
        const proc = $('.process');
        const mm = gsap.matchMedia();

        mm.add('(min-width: 1024px)', () => {
            const track = $('.process__track');
            const mark = $('.rail__mark');
            const rail = $('.process__rail');
            const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
            const tween = gsap.to(track, {
                x: () => -dist(), ease: 'none',
                scrollTrigger: {
                    trigger: proc, start: 'top top', end: () => `+=${dist() * 1.05}`, pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true,
                    onUpdate: (self) => {
                        proc.style.setProperty('--fill', self.progress.toFixed(4));
                        const w = rail.clientWidth;
                        gsap.set(mark, { x: self.progress * w, rotation: self.progress * 900 });
                    }
                }
            });
            $$('.step').forEach((step) => {
                gsap.fromTo(step, { opacity: 0.28, y: 24 }, {
                    opacity: 1, y: 0, ease: 'none',
                    scrollTrigger: { trigger: step, containerAnimation: tween, start: 'left 88%', end: 'left 58%', scrub: true }
                });
            });
            return () => { proc.style.removeProperty('--fill'); };
        });

        mm.add('(max-width: 1023px)', () => {
            ScrollTrigger.create({
                trigger: '.process__track', start: 'top 72%', end: 'bottom 62%', scrub: true,
                onUpdate: (self) => proc.style.setProperty('--fill', self.progress.toFixed(4))
            });
            $$('.step').forEach((step) => {
                gsap.fromTo(step, { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: step, start: 'top 88%' } });
            });
            const track = $('.process__track');
            proc.style.setProperty('--fill', 0);
            return () => { proc.style.removeProperty('--fill'); void track; };
        });
    }

    function initProjectsScroll() {
        $$('.gal__box').forEach((box) => {
            const img = $('img', box);
            gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: box, start: 'top bottom', end: 'bottom top', scrub: true } });
        });
        $$('.tabpanel.is-active .gal__box').forEach((box) => {
            gsap.fromTo(box, { clipPath: 'inset(0 0 100% 0)' },
                { clipPath: 'inset(0 0 0% 0)', duration: 1.2, ease: 'power4.out', clearProps: 'clipPath', scrollTrigger: { trigger: box, start: 'top 90%' } });
        });
    }

    function initBento() {
        $$('.bx').forEach((bx) => {
            const img = $('.bx__img', bx);
            if (img) gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: bx, start: 'top bottom', end: 'bottom top', scrub: true } });
        });
    }

    function initBand() {
        gsap.from('.band__in > *', { y: 70, opacity: 0, duration: 1.2, ease: 'power3.out', stagger: 0.14, scrollTrigger: { trigger: '.band', start: 'top 68%' } });
        gsap.fromTo('.band__slab', { clipPath: 'polygon(0 30%, 100% 18%, 100% 82%, 0 70%)' },
            { clipPath: 'polygon(0 12%, 100% 0, 100% 88%, 0 100%)', ease: 'none', scrollTrigger: { trigger: '.band', start: 'top 95%', end: 'top 25%', scrub: true } });
    }

    function initFooter() {
        gsap.fromTo('.ftr__word', { yPercent: 40, opacity: 0 },
            { yPercent: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: '.ftr__word', start: 'top 105%', end: 'bottom 92%', scrub: true } });
    }

    /* ════════════════════════════════════════════════════════════════════════
       6. ARRANQUE
       ════════════════════════════════════════════════════════════════════════ */
    function bootStatic() {
        // sin GSAP o con movimiento reducido: todo visible, funcional y sin pines
        root.classList.add('static');
        const loader = $('#loader');
        if (loader) loader.remove();
        root.classList.remove('is-loading');
        const fab = $('.fab');
        if (fab) fab.classList.add('is-on');
        safe('hero-gl', initHeroGL);
    }

    function bootFull() {
        gsap.registerPlugin(ScrollTrigger);
        root.classList.add('is-loading');

        if (window.Lenis) {
            lenis = new Lenis({
                duration: 1.3,
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                wheelMultiplier: 0.9,
                touchMultiplier: 1.3
            });
            lenis.on('scroll', ScrollTrigger.update);
            gsap.ticker.add((time) => lenis.raf(time * 1000));
            gsap.ticker.lagSmoothing(0);
            lenis.stop();
        }

        safe('anchors', initAnchors);
        safe('menu', initMenu);
        safe('hero-gl', initHeroGL);

        const reveal = () => {
            root.classList.remove('is-loading');
            if (lenis) lenis.start();
            safe('hero-intro', heroIntro);
            const fab = $('.fab');
            if (fab) {
                setTimeout(() => { fab.classList.add('is-on', 'show-tip'); }, 1800);
                setTimeout(() => fab.classList.remove('show-tip'), 6200);
            }
        };

        // módulos de scroll: se registran detrás del loader (invisibles)
        safe('reveals', initReveals, true);
        safe('header', initHeaderScroll);
        safe('hero-scroll', initHeroScroll);
        safe('chapter', initChapter);
        safe('expand', initExpand);
        safe('process', initProcess);
        safe('projects', initProjectsScroll);
        safe('bento', initBento);
        safe('band', initBand);
        safe('footer', initFooter);
        safe('tilt', initHeroTilt);
        safe('magnetic', initMagnetic);
        safe('marquee', initMarquee);

        runLoader(reveal).then(() => {
            ScrollTrigger.refresh();
        });

        const refresh = () => ScrollTrigger.refresh();
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
        window.addEventListener('load', () => setTimeout(refresh, 300), { once: true });
    }

    function boot() {
        hookWhatsApp();
        safe('accordion', initAccordion);
        safe('quote', initQuote);
        safe('services', initServices);
        safe('spotlight', initSpotlight);

        if (hasGsap() && !reduceMotion) {
            bootFull();
            safe('tabs', initTabs);
        } else {
            safe('tabs', initTabs);
            safe('anchors', initAnchors);
            safe('menu', initMenu);
            bootStatic();
        }
        window.__construalumReady = true;
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
