/* tintometrico.js — página "Tintométrico" (tintometrico.html), em 3 passos:
   1. o cliente escolhe o tom (verdes, azuis, beges...);
   2. vê todas as cores da máquina daquele tom, separadas por claridade, e pode
      filtrar por claras/escuras e suaves/vivas;
   3. toca numa cor e vê a parede pintada, a MISTURA (quanto de cada corante a
      máquina coloca), cores parecidas (mais clara, mais escura, mais viva, mais
      suave), as tintas em que ela pode ser feita e o preço.
   Dados: window.TINTAS_SITE (dados/tintas.js) e window.MISTURAS (dados/misturas.js,
   gerado por ferramentas/montar_misturas.py). Pintura: js/pintura.js. */

const TONS_ORDEM = ["branco", "bege", "amarelo", "laranja", "vermelho", "rosa", "roxo", "azul", "verde", "marrom", "cinza", "preto"];
const CLARIDADE = [
  { id: "bem-claras", nome: "Bem claras", min: 82, max: 101 },
  { id: "claras", nome: "Claras", min: 68, max: 82 },
  { id: "medias", nome: "Médias", min: 48, max: 68 },
  { id: "escuras", nome: "Escuras", min: -1, max: 48 },
];
const INTENSIDADE = { suaves: [0, 14], medias: [14, 32], vivas: [32, 999] };
const M = window.MISTURAS || { corantes: {}, cores: {}, galao_ml: 3200 };

const Tinto = {
  cores: [],          // só as cores do tintométrico
  tom: "",
  f: { claridade: "", intensidade: "" },
  cor: null,
  pinturaPronta: null,

  iniciar() {
    Tinto.cores = CORES.filter((c) => c.tinto).map((c) => {
      c.L = c.lab[0];
      c.C = Math.hypot(c.lab[1], c.lab[2]);
      return c;
    });
    Tinto.pinturaPronta = typeof Pintura !== "undefined" && window.AMBIENTES_IMG ? Pintura.preparar() : Promise.resolve();
    Tinto.montarTons();

    $("tfClaridade").addEventListener("click", (e) => Tinto.filtro(e, "claridade"));
    $("tfIntensidade").addEventListener("click", (e) => Tinto.filtro(e, "intensidade"));
    $("tGrade").addEventListener("click", (e) => {
      const b = e.target.closest("[data-cor]");
      if (b) Tinto.escolher(POR_ID.get(b.dataset.cor));
    });
    $("tDetalhe").addEventListener("click", (e) => {
      const b = e.target.closest("[data-cor]");
      if (b) { Tinto.escolher(POR_ID.get(b.dataset.cor), true); return; }
      if (e.target.closest("[data-fechar]")) Tinto.fecharDetalhe();
    });
    $("trocarTom").addEventListener("click", () => irPara($("passo1")));

    // link direto: tintometrico.html#tom=verde ou #cor=<id>
    const p = new URLSearchParams(location.hash.slice(1));
    const c = POR_ID.get(p.get("cor") || "");
    if (c && c.tinto) { Tinto.abrirTom(c.tom, false); Tinto.escolher(c, true); }
    else if (p.get("tom") && TONS_ORDEM.includes(p.get("tom"))) Tinto.abrirTom(p.get("tom"), false);
  },

  /* ---------- passo 1: tons ---------- */
  montarTons() {
    const porTom = {};
    Tinto.cores.forEach((c) => (porTom[c.tom] = porTom[c.tom] || []).push(c));
    $("tTons").innerHTML = TONS_ORDEM.filter((t) => porTom[t] && porTom[t].length >= 3).map((t) => {
      const lista = porTom[t].slice().sort((a, b) => b.L - a.L);
      // leque: 6 amostras do mais claro ao mais escuro
      const leque = Array.from({ length: 6 }, (_, i) => lista[Math.round(i * (lista.length - 1) / 5)]);
      return `<button type="button" class="tom-card" data-tom="${t}" aria-pressed="false">
        <span class="tom-leque" aria-hidden="true">${leque.map((c) => `<i style="background:${c.hex}"></i>`).join("")}</span>
        <span class="tom-nome">${esc(NOME_TOM[t])}</span>
        <span class="tom-qtd">${lista.length} cores</span>
      </button>`;
    }).join("");
    $("tTons").addEventListener("click", (e) => {
      const b = e.target.closest("[data-tom]");
      if (b) Tinto.abrirTom(b.dataset.tom, true);
    });
  },

  abrirTom(tom, rolar) {
    Tinto.tom = tom;
    Tinto.f = { claridade: "", intensidade: "" };
    $("tTons").querySelectorAll("[data-tom]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.tom === tom));
    document.querySelectorAll("#tfClaridade [data-v], #tfIntensidade [data-v]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === ""));
    $("passo2").hidden = false;
    $("tTomNome").textContent = NOME_TOM[tom];
    Tinto.listar();
    history.replaceState(null, "", `#tom=${tom}`);
    if (rolar) irPara($("passo2"));
  },

  filtro(e, chave) {
    const b = e.target.closest("[data-v]");
    if (!b) return;
    Tinto.f[chave] = b.dataset.v;
    b.parentElement.querySelectorAll("[data-v]").forEach((x) => x.setAttribute("aria-pressed", x === b));
    Tinto.listar();
  },

  /* ---------- passo 2: cores do tom, por claridade ---------- */
  listar() {
    const [cmin, cmax] = INTENSIDADE[Tinto.f.intensidade] || [0, 999];
    const doTom = Tinto.cores.filter((c) => c.tom === Tinto.tom && c.C >= cmin && c.C < cmax);
    const faixas = CLARIDADE.filter((f) => !Tinto.f.claridade || f.id === Tinto.f.claridade).map((f) => {
      const lista = doTom.filter((c) => c.L >= f.min && c.L < f.max)
        // dentro da faixa: em degradê pelo matiz (ex.: verde-amarelado → verde → verde-azulado), do claro ao escuro
        .sort((a, b) => Math.round(Tinto.matiz(a) / 10) - Math.round(Tinto.matiz(b) / 10) || b.L - a.L);
      if (!lista.length) return "";
      return `<div class="faixa">
        <h3>${f.nome} <small>${lista.length}</small></h3>
        <div class="amostras">${lista.map((c) => `<button type="button" class="amostra-t${c.esgotada ? " fora" : ""}${Tinto.cor === c ? " ativa" : ""}"
          data-cor="${esc(c.id)}" style="background:${c.hex}" title="${esc(c.nome)} · ${esc(c.tinto.cod)}"
          aria-label="${esc(c.nome)}, código ${esc(c.tinto.cod)}${c.esgotada ? ", sem estoque" : ""}"></button>`).join("")}</div>
      </div>`;
    }).join("");
    const total = doTom.filter((c) => !Tinto.f.claridade || CLARIDADE.some((f) => f.id === Tinto.f.claridade && c.L >= f.min && c.L < f.max)).length;
    $("tContagem").textContent = `${total} ${total === 1 ? "cor" : "cores"}`;
    $("tGrade").innerHTML = faixas || '<p class="vazio">Nenhuma cor com esses filtros. Tente “Todas”.</p>';
  },

  // matiz em graus, começando no vermelho; cinzas (pouca cor) vão para o fim
  matiz(c) {
    if (c.C < 6) return 400 + (100 - c.L);
    let h = Math.atan2(c.lab[2], c.lab[1]) * 180 / Math.PI;
    return h < 0 ? h + 360 : h;
  },

  /* ---------- passo 3: a cor escolhida ---------- */
  escolher(c, rolarLista) {
    if (!c) return;
    Tinto.cor = c;
    if (c.tom !== Tinto.tom) Tinto.abrirTom(c.tom, false);
    $("tGrade").querySelectorAll(".amostra-t").forEach((b) => b.classList.toggle("ativa", b.dataset.cor === c.id));
    history.replaceState(null, "", `#cor=${encodeURIComponent(c.id)}`);

    const mix = M.cores[c.tinto.cod];
    const linhas = Tinto.linhasDaCor(c);
    const vizinhas = Tinto.vizinhas(c);
    const whats = App.whatsapp(`Olá! Quero a cor ${c.nome} (cor Iquine ${c.tinto.cod}) no tintométrico. Vi no site: ${App.linkDaCor(c)}`);

    $("tDetalhe").innerHTML = `
      <button type="button" class="detalhe-fechar" data-fechar aria-label="Fechar">×</button>
      <div class="det-topo">
        <div class="det-parede"><canvas id="tParede" width="742" height="504" aria-label="Sala pintada com ${esc(c.nome)}"></canvas></div>
        <div class="det-nome">
          <span class="amostra" style="background:${c.hex}"></span>
          <div><h2>${esc(c.nome)}</h2><p>Cor Iquine <b>${esc(c.tinto.cod)}</b> · ${esc(NOME_TOM[c.tom])}</p></div>
        </div>
      </div>

      ${mix ? Tinto.misturaHtml(mix) : ""}

      <div class="det-bloco">
        <h3>Quer variar?</h3>
        <div class="vizinhas">${vizinhas.map(([rot, v]) => v
          ? `<button type="button" class="vizinha" data-cor="${esc(v.id)}"><span style="background:${v.hex}"></span><b>${rot}</b><small>${esc(v.nome)}</small></button>`
          : `<span class="vizinha vazia"><span></span><b>${rot}</b><small>—</small></span>`).join("")}</div>
      </div>

      <div class="det-bloco">
        <h3>Em qual tinta?</h3>
        <ul class="det-linhas">${linhas.map((l) => `<li class="${l.ok ? "" : "fora"}">
          <span><b>${esc(l.nome)}</b><small>${esc(l.acabamento || "")}${l.categoria ? " · " + esc(l.categoria) : ""}</small></span>
          <span class="det-preco">${l.ok ? `<small>a partir de</small> ${brl(l.min)}` : "sem estoque"}</span>
        </li>`).join("")}</ul>
      </div>

      <div class="det-acoes">
        <a class="botao primario" href="index.html#cor=${encodeURIComponent(c.id)}&amb=sala">Ver nos ambientes e calcular</a>
        ${whats ? `<a class="botao whats" href="${esc(whats)}" target="_blank" rel="noopener">Pedir no WhatsApp</a>` : ""}
      </div>
      <p class="det-nota">No balcão, peça a <b>cor Iquine ${esc(c.tinto.cod)}</b>: a máquina prepara na hora. As cores da tela são aproximadas.</p>`;

    $("tDetalhe").hidden = false;
    document.body.classList.add("com-detalhe");
    Tinto.pinturaPronta.then(() => {
      const tela = $("tParede");
      if (tela && Pintura.amb && Pintura.amb.sala) Pintura.desenhar(tela, "sala", c.hex);
      else if (tela) tela.parentElement.style.background = c.hex;
    });
    if (rolarLista) {
      const b = $("tGrade").querySelector(`[data-cor="${CSS.escape(c.id)}"]`);
      if (b) b.scrollIntoView({ block: "nearest" });
    }
    $("tDetalhe").scrollTop = 0;
  },

  fecharDetalhe() {
    $("tDetalhe").hidden = true;
    document.body.classList.remove("com-detalhe");
  },

  // receita: barra com a proporção de cada corante + lista em ml por galão
  misturaHtml([prod, base, receita]) {
    const total = receita.reduce((s, [, ml]) => s + ml, 0) || 1;
    const nome = (cod) => (M.corantes[cod] || [cod])[0];
    const cor = (cod) => (M.corantes[cod] || [, "#999"])[1];
    const ml = (v) => v >= 10 ? num(v, 0) : num(v, 1);
    return `<div class="det-bloco">
      <h3>A mistura <small>como a máquina faz esta cor</small></h3>
      <div class="mistura-conta">
        <span class="gota base" title="Base ${esc(base)}">Base ${esc(base)}</span>
        ${receita.map(([cod]) => `<span class="mais" aria-hidden="true">+</span><span class="gota" style="--c:${cor(cod)}" title="${esc(nome(cod))}"></span>`).join("")}
        <span class="mais" aria-hidden="true">=</span>
        <span class="gota resultado" style="--c:${Tinto.cor.hex}"></span>
      </div>
      <div class="mistura-barra" aria-hidden="true">${receita.map(([cod, v]) =>
        `<i style="flex:${Math.max(v / total, 0.03)};background:${cor(cod)}"></i>`).join("")}</div>
      <ul class="mistura-lista">${receita.map(([cod, v]) => `<li><span class="ponto-c" style="background:${cor(cod)}"></span>${esc(nome(cod))}<b>${ml(v)} ml</b></li>`).join("")}</ul>
      <p class="det-nota">Para um galão (3,2 L) de ${esc(prod)}, base ${esc(base)}. Em outras tintas e tamanhos a máquina ajusta a quantidade.</p>
    </div>`;
  },

  linhasDaCor(c) {
    const por = new Map();
    c.tinto.opcoes.forEach(([bi, preco, , esg]) => {
      const b = D.bases[bi], l = D.linhas[b.linha] || { nome: b.linha };
      const x = por.get(b.linha) || { ...l, min: Infinity, ok: false };
      if (!esg) { x.ok = true; x.min = Math.min(x.min, preco); }
      por.set(b.linha, x);
    });
    return [...por.values()].sort((a, b) => (b.ok - a.ok) || a.min - b.min);
  },

  // a cor mais parecida em cada direção (mesma família de matiz)
  vizinhas(c) {
    const [L, a, b] = c.lab, C = c.C;
    const h = Math.atan2(b, a);
    const busca = (ok, nota) => {
      let melhor = null, m = Infinity;
      Tinto.cores.forEach((x) => {
        if (x === c || !ok(x)) return;
        const s = nota(x);
        if (s < m) { m = s; melhor = x; }
      });
      return melhor;
    };
    const dHue = (x) => { let d = Math.abs(Math.atan2(x.lab[2], x.lab[1]) - h); if (d > Math.PI) d = 2 * Math.PI - d; return d * Math.max(C, x.C); };
    const dAB = (x) => Math.hypot(x.lab[1] - a, x.lab[2] - b);
    return [
      ["Mais clara", busca((x) => x.L > L + 4, (x) => dAB(x) * 1.5 + Math.abs(x.L - L - 9))],
      ["Mais escura", busca((x) => x.L < L - 4, (x) => dAB(x) * 1.5 + Math.abs(L - x.L - 9))],
      ["Mais viva", busca((x) => x.C > C + 5 && Math.abs(x.L - L) < 10, (x) => dHue(x) * 2 + Math.abs(x.C - C - 10) + Math.abs(x.L - L))],
      ["Mais suave", busca((x) => x.C < C - 4 && Math.abs(x.L - L) < 10, (x) => dHue(x) * 2 + Math.abs(C - x.C - 8) + Math.abs(x.L - L))],
    ];
  },
};

Tinto.iniciar();
