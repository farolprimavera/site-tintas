/* ambiente.js — página "Ver no ambiente" (ambiente.html): ambiente grande + miniaturas,
   faixa de cores embaixo da foto (troca a cor sem rolar a página), onde comprar,
   calculadora e comparativo das linhas.
   Sem cor no link (ambiente.html), as paredes aparecem brancas, como na foto. */

const Faixa = {
  aba: "prontas",

  montar() {
    $("faixaCores").innerHTML = `
      <div class="faixa-topo">
        <div class="faixa-abas" role="tablist" aria-label="Quais cores mostrar">
          <button type="button" role="tab" data-aba="prontas" aria-selected="true">Latas prontas</button>
          <button type="button" role="tab" data-aba="parecidas" aria-selected="false">Parecidas com esta</button>
          <button type="button" role="tab" data-aba="tinto" aria-selected="false">Tintométrico</button>
        </div>
        <a class="link faixa-todas" href="index.html#explorar">Ver cartela completa</a>
      </div>
      <div class="faixa-trilho">
        <button type="button" class="faixa-seta" data-dir="-1" aria-label="Cores anteriores">‹</button>
        <div class="faixa-lista" id="faixaLista"></div>
        <button type="button" class="faixa-seta" data-dir="1" aria-label="Mais cores">›</button>
      </div>`;
    $("faixaCores").querySelectorAll("[data-aba]").forEach((b) => b.addEventListener("click", () => { Faixa.aba = b.dataset.aba; Faixa.listar(true); }));
    $("faixaCores").querySelectorAll("[data-dir]").forEach((b) => b.addEventListener("click", () => {
      const L = $("faixaLista");
      L.scrollBy({ left: +b.dataset.dir * L.clientWidth * 0.8, behavior: "smooth" });
    }));
    $("faixaLista").addEventListener("click", (e) => {
      const b = e.target.closest("[data-cor]");
      if (b) App.escolher(POR_ID.get(b.dataset.cor), { daFaixa: true });
    });
    App.aoMudar((c, op) => {
      if (op.soAmbiente) return;
      if (op.daFaixa) Faixa.marcar(); else Faixa.listar(true);
    });
    Faixa.listar(true);
  },

  cores() {
    const disp = CORES.filter((c) => !c.esgotada && c.usos.has("parede"));
    const c = App.cor;
    if (Faixa.aba === "parecidas" && c) {
      const d = (x) => (x.lab[0] - c.lab[0]) ** 2 + (x.lab[1] - c.lab[1]) ** 2 + (x.lab[2] - c.lab[2]) ** 2;
      return disp.filter((x) => x !== c).sort((a, b) => d(a) - d(b)).slice(0, 40);
    }
    if (Faixa.aba === "tinto") return disp.filter((x) => x.tinto && !x.prontas.length).sort((a, b) => a.ordem - b.ordem).filter((_, i) => i % 6 === 0).slice(0, 80);
    return disp.filter((x) => x.prontas.length).sort((a, b) => a.ordem - b.ordem);
  },

  listar(voltarInicio) {
    if (Faixa.aba === "parecidas" && !App.cor) Faixa.aba = "prontas";
    $("faixaCores").querySelectorAll("[data-aba]").forEach((b) => {
      b.setAttribute("aria-selected", b.dataset.aba === Faixa.aba);
      if (b.dataset.aba === "parecidas") b.hidden = !App.cor;
    });
    const lista = Faixa.cores();
    $("faixaLista").innerHTML = lista.map((c) => `<button type="button" class="faixa-cor" data-cor="${esc(c.id)}" aria-pressed="${App.cor === c}" title="${esc(c.nome)}">
        <span style="background:${c.hex}"></span><small>${esc(c.nome)}</small></button>`).join("");
    if (voltarInicio) $("faixaLista").scrollLeft = 0;
  },

  marcar() {
    $("faixaLista").querySelectorAll("[data-cor]").forEach((b) => b.setAttribute("aria-pressed", App.cor && b.dataset.cor === App.cor.id));
  },
};

(function () {
  const secoes = ["compra", "calculadora", "linhas"].map($);
  secoes.forEach((s) => (s.hidden = true)); // só aparecem depois de escolher a cor
  App.aoMudar((c, op) => { if (!op.soAmbiente) secoes.forEach((s) => (s.hidden = false)); });

  Vitrine.montar();
  Faixa.montar();

  window.addEventListener("hashchange", () => {
    if (/^#[a-z]+$/.test(location.hash)) return;
    const c = App.lerLink();
    if (c && c !== App.cor) App.escolher(c);
    else Vitrine.desenhar();
  });

  Pintura.preparar().then(() => {
    const doLink = App.lerLink();
    if (doLink) App.escolher(doLink);
    else { Vitrine.desenhar(); Vitrine.semCor(); }
  }).catch((e) => {
    console.error(e);
    $("corAtual").innerHTML = '<p class="vazio">Não consegui carregar os ambientes. Recarregue a página.</p>';
  });
})();
