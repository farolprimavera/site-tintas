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

  // ---------- fotos da loja: passa sozinha a cada 5 s, setas e foto ampliada ----------
  const trilho = $("fotosLoja");
  if (trilho) {
    const passo = (dir) => {
      const fim = trilho.scrollLeft + trilho.clientWidth >= trilho.scrollWidth - 4;
      if (dir > 0 && fim) trilho.scrollTo({ left: 0, behavior: "smooth" });
      else trilho.scrollBy({ left: dir * (trilho.firstElementChild.offsetWidth + 12), behavior: "smooth" });
    };
    let timer;
    const agendar = () => { clearInterval(timer); timer = setInterval(() => { if (!document.hidden) passo(1); }, 5000); };
    document.querySelectorAll("[data-fotos]").forEach((b) => b.addEventListener("click", () => { passo(+b.dataset.fotos); agendar(); }));
    trilho.addEventListener("pointerdown", agendar);
    agendar();

    const dlg = $("fotoAmpliada");
    trilho.addEventListener("click", (e) => {
      const b = e.target.closest(".foto-loja");
      if (!b || !dlg.showModal) return;
      $("fotoAmpliadaImg").src = b.dataset.grande;
      $("fotoAmpliadaImg").alt = b.querySelector("img").alt;
      $("fotoAmpliadaLegenda").textContent = b.dataset.legenda;
      dlg.showModal();
      clearInterval(timer);
    });
    dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.closest("[data-fechar-foto]")) dlg.close(); });
    dlg.addEventListener("close", agendar);
  }
})();
