/* carrossel.js — "Inspire-se": um slide por ambiente, cada um pintado com uma tinta
   diferente (sorteada a cada visita entre as latas prontas com estoque). Igual ao
   carrossel do site de pisos: setas, pontinhos, arrastar no celular e troca sozinha
   depois de 10 s sem interação. Clicar no slide abre a página do ambiente com a cor.
   A pintura é a mesma do simulador (js/pintura.js), feita no navegador. */

const INTERVALO_CARROSSEL = 10000;

const Carrossel = {
  slides: [],
  atual: 0,
  timer: null,

  // uma cor por ambiente, sem repetir tom; só cores que aparecem bem na parede
  sortear() {
    const embaralhar = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const boas = CORES.filter((c) => {
      if (!c.prontas.length || c.esgotada || !c.usos.has("parede")) return false;
      const L = c.lab[0], C = Math.hypot(c.lab[1], c.lab[2]);
      return L > 40 && L < 88 && C > 10;
    });
    const tons = new Set();
    const out = [];
    for (const amb of Object.keys(D.ambientes)) {
      const c = embaralhar(boas.slice()).find((x) => !tons.has(x.tom)) || boas[0];
      if (!c) break;
      tons.add(c.tom);
      out.push({ amb, c });
    }
    return out;
  },

  montar() {
    const el = $("carrossel");
    if (!el) return;
    Carrossel.slides = Carrossel.sortear();
    if (!Carrossel.slides.length) { el.hidden = true; return; }

    const slides = Carrossel.slides.map(({ amb, c }, i) => {
      const a = D.ambientes[amb];
      return `<a class="slide" href="${App.urlAmbiente(c, amb)}" data-i="${i}" aria-hidden="${i !== 0}" tabindex="${i === 0 ? 0 : -1}"
          aria-label="${esc(a.nome)} pintada de ${esc(c.nome)} — ver no simulador">
        <canvas width="${a.largura}" height="${a.altura}" aria-hidden="true"></canvas>
        <span class="slide-legenda">
          <span class="slide-amb">${esc(a.nome)}</span>
          <strong class="slide-nome"><span class="slide-amostra" style="background:${c.hex}"></span>${esc(c.nome)}</strong>
          <span class="slide-ver">${esc(origemTexto(c))}${c.aPartir != null ? ` · a partir de ${brl(c.aPartir)}` : ""} · Ver no simulador →</span>
        </span>
      </a>`;
    }).join("");
    const pontos = Carrossel.slides.map((_, i) =>
      `<button type="button" class="ponto" data-i="${i}" aria-label="Foto ${i + 1}" aria-current="${i === 0}"></button>`).join("");

    el.innerHTML = `
      <div class="carrossel" aria-roledescription="carrossel" aria-label="Ambientes pintados com as nossas tintas">
        <div class="slides">${slides}</div>
        <button type="button" class="seta seta-ant" aria-label="Foto anterior">‹</button>
        <button type="button" class="seta seta-prox" aria-label="Próxima foto">›</button>
        <div class="pontos">${pontos}</div>
      </div>`;

    // clique abre a página do ambiente (link normal); depois de arrastar, não abre
    el.querySelectorAll(".slide").forEach((s) => s.addEventListener("click", (ev) => { if (Carrossel.arrastou) ev.preventDefault(); }));
    el.querySelector(".seta-ant").addEventListener("click", () => Carrossel.ir(Carrossel.atual - 1));
    el.querySelector(".seta-prox").addEventListener("click", () => Carrossel.ir(Carrossel.atual + 1));
    el.querySelectorAll(".ponto").forEach((b) => b.addEventListener("click", () => Carrossel.ir(+b.dataset.i)));

    // arrastar para o lado no celular
    const area = el.querySelector(".slides");
    let x0 = null;
    area.addEventListener("pointerdown", (ev) => { x0 = ev.clientX; Carrossel.arrastou = false; });
    area.addEventListener("pointerup", (ev) => {
      if (x0 === null) return;
      const dx = ev.clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 40) { Carrossel.arrastou = true; Carrossel.ir(Carrossel.atual + (dx < 0 ? 1 : -1)); }
    });
    area.addEventListener("dragstart", (ev) => ev.preventDefault());
    el.addEventListener("keydown", (ev) => {
      if (ev.key === "ArrowLeft") Carrossel.ir(Carrossel.atual - 1);
      if (ev.key === "ArrowRight") Carrossel.ir(Carrossel.atual + 1);
    });
    document.addEventListener("visibilitychange", Carrossel.agendar);

    Carrossel.ir(0);
  },

  // mostra o slide i e já pinta o próximo, para a troca ser instantânea
  ir(i) {
    const n = Carrossel.slides.length;
    Carrossel.atual = ((i % n) + n) % n;
    $("carrossel").querySelectorAll(".slide").forEach((s, k) => {
      const ativo = k === Carrossel.atual;
      s.classList.toggle("ativo", ativo);
      s.setAttribute("aria-hidden", !ativo);
      s.tabIndex = ativo ? 0 : -1;
      if (!s.dataset.pintado && (ativo || k === (Carrossel.atual + 1) % n)) {
        const { amb, c } = Carrossel.slides[k];
        Pintura.desenhar(s.querySelector("canvas"), amb, c.hex);
        s.dataset.pintado = "1";
      }
    });
    $("carrossel").querySelectorAll(".ponto").forEach((b, k) => b.setAttribute("aria-current", k === Carrossel.atual));
    Carrossel.agendar();
  },

  // qualquer troca (automática ou do cliente) recomeça a contagem de 10 s
  agendar() {
    clearTimeout(Carrossel.timer);
    if (!document.hidden) Carrossel.timer = setTimeout(() => Carrossel.ir(Carrossel.atual + 1), INTERVALO_CARROSSEL);
  },
};
