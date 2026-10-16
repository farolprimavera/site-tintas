/* busca.js — barra de busca do topo (todas as páginas).
   Enquanto digita, sugere CORES (abrem o simulador já pintado) e TINTAS (abrem a
   página de produtos filtrada). Enter sem escolher sugestão: produtos.html?q=termo
   (ou a cartela, index.html?q=termo#explorar, quando o termo só acha cores).
   Usa CORES, D, semAcento e esc de js/app.js. */

const Busca = {
  MAX_CORES: 6,
  MAX_TINTAS: 3,
  itens: [],   // sugestões mostradas agora (para setas e Enter)
  ativo: -1,

  iniciar() {
    const campo = $("buscaTopo");
    const caixa = $("buscaSugestoes");
    if (!campo || !caixa) return;

    // na página de produtos o termo pesquisado continua no campo
    const q = new URLSearchParams(location.search).get("q");
    if (q && !$("fBusca")) campo.value = q; // no simulador o termo vai para a busca da cartela

    // Enter sem escolher sugestão: tintas → página de produtos; só cores → cartela
    campo.form.addEventListener("submit", (e) => {
      const termo = semAcento(campo.value.trim());
      if (!termo) { e.preventDefault(); return; }
      const temTinta = Object.values(D.linhas).some((l) => semAcento(`${l.nome} ${l.marca} ${l.acabamento || ""} ${l.categoria || ""}`).includes(termo));
      if (!temTinta) { e.preventDefault(); location.href = `index.html?q=${encodeURIComponent(campo.value.trim())}#explorar`; }
    });

    let t;
    campo.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => Busca.sugerir(campo.value), 120); });
    campo.addEventListener("focus", () => { if (campo.value.trim()) Busca.sugerir(campo.value); });
    campo.addEventListener("keydown", (e) => {
      if (caixa.hidden) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const n = Busca.itens.length;
        Busca.marcar((Busca.ativo + (e.key === "ArrowDown" ? 1 : -1) + n) % n);
      } else if (e.key === "Enter" && Busca.ativo >= 0) {
        e.preventDefault();
        location.href = Busca.itens[Busca.ativo].href;
      } else if (e.key === "Escape") {
        Busca.fechar();
      }
    });
    document.addEventListener("click", (e) => { if (!e.target.closest(".busca-topo")) Busca.fechar(); });
    // escolheu uma sugestão da mesma página (#cor=...): fecha a lista e volta ao topo
    caixa.addEventListener("click", (e) => { if (e.target.closest("a")) { Busca.fechar(); campo.blur(); window.scrollTo({ top: 0 }); } });
  },

  sugerir(texto) {
    const termo = semAcento(texto.trim());
    if (termo.length < 2) return Busca.fechar();

    const comeca = (s) => semAcento(s).startsWith(termo);
    const cores = CORES.filter((c) => c.busca.includes(termo))
      .sort((a, b) => (comeca(b.nome) - comeca(a.nome)) || (a.esgotada - b.esgotada) || (!!b.prontas.length - !!a.prontas.length))
      .slice(0, Busca.MAX_CORES);
    const tintas = Object.entries(D.linhas)
      .filter(([, l]) => semAcento(`${l.nome} ${l.marca} ${l.acabamento || ""} ${l.categoria || ""}`).includes(termo))
      .slice(0, Busca.MAX_TINTAS);

    Busca.itens = [
      ...tintas.map(([, l]) => ({ href: `produtos.html?q=${encodeURIComponent(l.nome)}`,
        html: `<span class="sug-icone" aria-hidden="true">🪣</span><span><b>${esc(l.nome)}</b><small>${l.tipo === "tintometrico" ? "Tintométrico Iquine" : "Lata pronta " + esc(l.marca)}</small></span>` })),
      ...cores.map((c) => ({ href: `index.html#cor=${encodeURIComponent(c.id)}&amb=sala`,
        html: `<span class="sug-cor" style="background:${c.hex}" aria-hidden="true"></span><span><b>${esc(c.nome)}</b><small>${esc(codigoTexto(c) || c.marca)}${c.esgotada ? " · sem estoque" : ""}</small></span>` })),
    ];
    const caixa = $("buscaSugestoes");
    caixa.innerHTML = Busca.itens.length
      ? Busca.itens.map((it, i) => `<a class="sug" id="sug${i}" role="option" href="${esc(it.href)}">${it.html}</a>`).join("") +
        (tintas.length
          ? `<a class="sug-todos" href="produtos.html?q=${encodeURIComponent(texto.trim())}">Ver todas as tintas com “${esc(texto.trim())}”</a>`
          : `<a class="sug-todos" href="index.html?q=${encodeURIComponent(texto.trim())}#explorar">Ver todas as cores com “${esc(texto.trim())}”</a>`)
      : `<p class="sug-vazio">Nada encontrado para “${esc(texto.trim())}”.</p>`;
    caixa.hidden = false;
    $("buscaTopo").setAttribute("aria-expanded", "true");
    Busca.ativo = -1;
  },

  marcar(i) {
    Busca.ativo = i;
    $("buscaSugestoes").querySelectorAll(".sug").forEach((el, j) => el.classList.toggle("ativo", j === i));
    $("buscaTopo").setAttribute("aria-activedescendant", `sug${i}`);
  },

  fechar() {
    const caixa = $("buscaSugestoes");
    if (!caixa || caixa.hidden) return;
    caixa.hidden = true;
    $("buscaTopo").setAttribute("aria-expanded", "false");
    $("buscaTopo").removeAttribute("aria-activedescendant");
    Busca.ativo = -1;
  },
};

Busca.iniciar();
