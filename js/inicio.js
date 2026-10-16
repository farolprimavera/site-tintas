/* inicio.js — página inicial: abas "Cartela | Monte sua cor", carrossel "Inspire-se"
   e rolagem para a seção pedida no link (index.html#sobre, #explorar...).
   Tocar numa cor abre a página do ambiente (ambiente.html#cor=...). */

(function () {
  const secaoInicial = /^#[a-z]+$/.test(location.hash) ? document.getElementById(location.hash.slice(1)) : null;

  // abas Cartela | Monte sua cor
  const abas = { abaCartela: "painelCartela", abaMonte: "painelMonte" };
  Object.entries(abas).forEach(([aba, painel]) => $(aba).addEventListener("click", () => {
    Object.entries(abas).forEach(([a, p]) => { $(a).setAttribute("aria-selected", a === aba); $(p).hidden = a !== aba; });
    if (aba === "abaMonte" && !Monte.montado) Monte.montar();
  }));

  // link antigo com cor (index.html#cor=...): manda para a página do ambiente
  if (/^#cor=/.test(location.hash)) { location.replace("ambiente.html" + location.hash); return; }

  Cartela.montar();
  Cartela.listar(true);
  if (secaoInicial && secaoInicial.id !== "inicio") secaoInicial.scrollIntoView({ block: "start" });

  Pintura.preparar().then(() => Carrossel.montar()).catch((e) => console.error(e));
})();
