/* inicio.js — liga tudo: abas da seção "Escolha sua cor", cor inicial e link direto (#cor=...). */

(function () {
  // abas Cartela | Monte sua cor
  const abas = { abaCartela: "painelCartela", abaMonte: "painelMonte" };
  Object.entries(abas).forEach(([aba, painel]) => $(aba).addEventListener("click", () => {
    Object.entries(abas).forEach(([a, p]) => { $(a).setAttribute("aria-selected", a === aba); $(p).hidden = a !== aba; });
    if (aba === "abaMonte" && !Monte.montado) Monte.montar();
  }));

  Vitrine.montar();
  Cartela.montar();

  window.addEventListener("hashchange", () => {
    const c = App.lerLink();
    if (c && c !== App.cor) App.escolher(c);
    else Vitrine.desenhar();
  });

  Pintura.preparar().then(() => {
    const doLink = App.lerLink();
    const inicial = doLink ||
      CORES.find((c) => /verde kiwi/i.test(c.nome) && !c.esgotada) ||
      CORES.find((c) => !c.esgotada) || CORES[0];
    App.escolher(inicial);
    Cartela.listar(true);
  }).catch((e) => {
    console.error(e);
    $("corAtual").innerHTML = '<p class="vazio">Não consegui carregar os ambientes. Recarregue a página.</p>';
  });
})();
