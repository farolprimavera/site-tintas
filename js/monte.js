/* monte.js — "Monte sua cor": gradiente com as cores reais do tintométrico Iquine.
   Cada quadradinho é a cor da máquina mais próxima daquele tom (só cores com base
   e corantes em estoque), então o cliente nunca escolhe uma cor que a loja não faz. */

const Monte = {
  cromo: 24,
  HUES: 18,
  LUZ: [93, 86, 78, 70, 61, 52, 43, 34, 25],
  celulas: [],
  montado: false,
  atual: null,   // cor tocada no gradiente (na página inicial não há cor escolhida no App)

  montar() {
    $("monte").innerHTML = `
      <p class="secao-texto">Toque no tom que você quer. A cor é preparada na hora, na máquina da loja.</p>
      <div class="seg" role="group" aria-label="Intensidade da cor">
        <button type="button" class="chip" data-c="10" aria-pressed="false">Suave</button>
        <button type="button" class="chip" data-c="24" aria-pressed="true">Média</button>
        <button type="button" class="chip" data-c="45" aria-pressed="false">Viva</button>
      </div>
      <div class="gradiente" id="gradiente" aria-label="Gradiente de cores do tintométrico"></div>
      <div class="monte-escolha" id="monteEscolha" hidden></div>`;
    $("monte").querySelectorAll("[data-c]").forEach((b) => b.addEventListener("click", () => {
      $("monte").querySelectorAll("[data-c]").forEach((x) => x.setAttribute("aria-pressed", x === b));
      Monte.cromo = +b.dataset.c;
      Monte.grade();
    }));
    App.aoMudar((c, op) => { if (!op.soAmbiente) Monte.marcar(c); });
    Monte.montado = true;
    Monte.grade();
  },

  grade() {
    const disp = CORES.filter((c) => c.tinto && !c.esgotada && c.usos.has("parede"));
    if (!disp.length) { $("monte").innerHTML = '<p class="vazio">Tintométrico indisponível no momento.</p>'; return; }
    const G = $("gradiente");
    G.innerHTML = "";
    Monte.celulas = [];
    const perto = (L, a, b) => {
      let m = Infinity, r = null;
      for (const c of disp) { const q = c.lab, d = (q[0] - L) ** 2 + (q[1] - a) ** 2 + (q[2] - b) ** 2; if (d < m) { m = d; r = c; } }
      return r;
    };
    Monte.LUZ.forEach((L) => {
      const linha = [perto(L, 0, 0)]; // 1ª coluna: brancos e cinzas
      for (let h = 0; h < Monte.HUES; h++) {
        const ang = (h * 360 / Monte.HUES + 20) * Math.PI / 180;
        const cr = Monte.cromo * (L > 88 ? 0.55 : L < 35 ? 0.8 : 1);
        linha.push(perto(L, cr * Math.cos(ang), cr * Math.sin(ang)));
      }
      linha.forEach((c) => {
        const b = document.createElement("button");
        b.type = "button";
        b.style.background = c.hex;
        b.title = `${c.nome} · cor ${c.tinto.cod}`;
        b.setAttribute("aria-label", b.title);
        b.setAttribute("aria-pressed", (Monte.atual || App.cor) === c);
        // tocar só escolhe (fica na página, como antes); o botão "Ver no ambiente" abre a página do ambiente
        b.addEventListener("click", () => { if ($("telaGrande")) App.escolher(c, { doMonte: true }); else Monte.marcar(c); });
        G.appendChild(b);
        Monte.celulas.push([b, c]);
      });
    });
  },

  marcar(c) {
    if (!Monte.montado || !c) return;
    Monte.atual = c;
    Monte.celulas.forEach(([b, x]) => b.setAttribute("aria-pressed", x === c));
    const E = $("monteEscolha");
    if (!c.tinto) { E.hidden = true; return; }
    E.hidden = false;
    const naPagina = !!$("telaGrande"); // página do ambiente: a foto grande já mostra a cor
    E.innerHTML = `${naPagina ? "" : `<canvas class="monte-previa" id="montePrevia" width="240" height="163" aria-label="Sala pintada com ${esc(c.nome)}"></canvas>`}
      <span class="amostra" style="background:${c.hex}"></span>
      <div><b>${esc(c.nome)}</b><small>Cor Iquine ${esc(c.tinto.cod)}${c.aPartir ? " · a partir de " + brl(c.aPartir) : ""}</small></div>
      ${naPagina ? `<button type="button" class="botao primario" id="monteVer">Ver tinta e preço</button>`
                 : `<a class="botao primario" href="${App.urlAmbiente(c)}">Ver no ambiente</a>`}`;
    if (naPagina) $("monteVer").addEventListener("click", () => irPara($("compra")));
    else Pintura.pronto && Pintura.pronto.then(() => { const t = $("montePrevia"); if (t) Pintura.desenhar(t, "sala", c.hex); });
  },
};
