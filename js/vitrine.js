/* vitrine.js — ambiente grande pintado, os 4 ambientes na mesma cor (miniaturas),
   o resumo da cor escolhida e a barrinha fixa "ver no ambiente" no rodapé da tela. */

const Vitrine = {
  semTinta: false,

  montar() {
    const M = $("miniaturas");
    M.innerHTML = "";
    Object.values(D.ambientes).forEach((a) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mini";
      b.setAttribute("role", "tab");
      b.dataset.amb = a.id;
      b.innerHTML = `<canvas width="240" height="${Math.round(240 * a.altura / a.largura)}" aria-hidden="true"></canvas><span>${esc(a.nome)}</span>`;
      b.addEventListener("click", () => App.trocarAmbiente(a.id));
      M.appendChild(b);
    });

    const ver = $("verOriginal");
    const segurar = (v) => { Vitrine.semTinta = v; Vitrine.desenharGrande(); };
    ver.addEventListener("pointerdown", (e) => { e.preventDefault(); segurar(true); });
    ["pointerup", "pointerleave", "pointercancel"].forEach((t) => ver.addEventListener(t, () => segurar(false)));
    ver.addEventListener("contextmenu", (e) => e.preventDefault());

    // barrinha fixa: aparece quando a foto sai da tela (cliente escolhendo cor lá embaixo)
    const barra = document.createElement("div");
    barra.className = "barra-cor";
    barra.id = "barraCor";
    barra.hidden = true;
    document.body.appendChild(barra);
    const foto = document.querySelector(".vitrine");
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => { barra.dataset.longe = e.isIntersecting ? "" : "1"; Vitrine.barra(); }, { threshold: 0.15 }).observe(foto);
    }

    App.aoMudar((c, op) => {
      Vitrine.desenhar();
      if (!op.soAmbiente) { Vitrine.resumo(c); Vitrine.barra(); }
    });
  },

  desenharGrande() {
    const a = D.ambientes[App.ambiente];
    const tela = $("telaGrande");
    if (tela.width !== a.largura) { tela.width = a.largura; tela.height = a.altura; }
    Pintura.desenhar(tela, App.ambiente, App.cor && App.cor.hex, Vitrine.semTinta);
  },

  desenhar() {
    Vitrine.desenharGrande();
    document.querySelectorAll(".mini").forEach((b) => {
      b.setAttribute("aria-selected", b.dataset.amb === App.ambiente);
      Pintura.desenhar(b.querySelector("canvas"), b.dataset.amb, App.cor && App.cor.hex);
    });
  },

  // nenhuma cor escolhida ainda: paredes brancas e um convite para escolher
  semCor() {
    $("corAtual").innerHTML = `
      <div class="cor-topo">
        <span class="amostra" style="background:#fff" aria-hidden="true"></span>
        <div>
          <h1 class="cor-nome">Escolha uma cor</h1>
          <p class="cor-origem">Toque numa cor na faixa embaixo da foto para pintar as paredes.</p>
        </div>
      </div>
      <div class="cor-acoes"><a class="botao" href="index.html#explorar">Ver a cartela completa</a></div>`;
  },

  resumo(c) {
    const chips = [NOME_TOM[c.tom], ...c.familias.map((f) => NOME_FAMILIA[f]), ...c.sensacoes.slice(0, 2).map((s) => NOME_SENSACAO[s])]
      .filter(Boolean).map((t) => `<span class="chip-info">${esc(t)}</span>`).join("");
    const mesmas = CORES.filter((x) => x !== c && semAcento(x.nome) === semAcento(c.nome));
    $("corAtual").innerHTML = `
      <div class="cor-topo">
        <span class="amostra" style="background:${c.hex}" aria-hidden="true"></span>
        <div>
          <h1 class="cor-nome">${esc(c.nome)}</h1>
          <p class="cor-origem">${esc(codigoTexto(c))}${codigoTexto(c) ? " · " : ""}${esc(origemTexto(c))}</p>
        </div>
      </div>
      <div class="chips-info">${chips}</div>
      <p class="cor-preco">${c.esgotada ? '<span class="selo cinza">Sem estoque no momento</span>' :
        `a partir de <strong>${brl(c.aPartir)}</strong>${c.temOferta ? ' <span class="selo">Oferta</span>' : ""}`}</p>
      ${mesmas.length ? `<p class="cor-mesmas">Mesmo nome em: ${mesmas.slice(0, 4).map((m) => `<button type="button" class="link" data-id="${esc(m.id)}">${esc(origemTexto(m))}</button>`).join(", ")}</p>` : ""}
      <div class="cor-acoes">
        <button type="button" class="botao primario" data-ir="compra">Ver tintas e preços</button>
        <button type="button" class="botao" data-ir="calculadora">Calcular quantidade</button>
        <button type="button" class="botao" id="btnLink">Copiar link</button>
      </div>`;
    $("corAtual").querySelectorAll("[data-ir]").forEach((b) => b.addEventListener("click", () => irPara($(b.dataset.ir))));
    $("corAtual").querySelectorAll("[data-id]").forEach((b) => b.addEventListener("click", () => App.escolher(POR_ID.get(b.dataset.id))));
    $("btnLink").addEventListener("click", async () => {
      const link = App.linkDaCor(c);
      try { await navigator.clipboard.writeText(link); $("btnLink").textContent = "Link copiado!"; }
      catch (e) { prompt("Copie o link:", link); }
      setTimeout(() => { const b = $("btnLink"); if (b) b.textContent = "Copiar link"; }, 2000);
    });
  },

  barra() {
    const barra = $("barraCor"), c = App.cor;
    if (!barra || !c) return;
    barra.hidden = !barra.dataset.longe;
    barra.innerHTML = `<span class="amostra" style="background:${c.hex}"></span>
      <span class="barra-txt"><strong>${esc(c.nome)}</strong><small>${c.aPartir ? "a partir de " + brl(c.aPartir) : esc(origemTexto(c))}</small></span>
      <button type="button" class="botao primario">Ver no ambiente</button>`;
    barra.querySelector("button").addEventListener("click", () => irPara(document.querySelector(".vitrine")));
  },
};
