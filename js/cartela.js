/* cartela.js — cartela de cores com busca e filtros por família, sensação, tom,
   onde aplicar e origem (lata pronta ou tintométrico). */

const Cartela = {
  f: { busca: "", uso: "parede", origem: "", familia: "", sensacao: "", tom: "", ordem: "destaque", disponiveis: true },
  porPagina: 60,
  mostrando: 60,

  montar() {
    const tons = Object.keys(NOME_TOM);
    const AMOSTRA_TOM = { branco: "#f4f2ec", cinza: "#9a9a98", preto: "#2a2a2a", bege: "#e2d2b4", amarelo: "#f2cf4a", laranja: "#ef8b3c",
      vermelho: "#c8392f", rosa: "#ef9fb4", roxo: "#8a62b0", azul: "#3f7fc5", verde: "#5aa665", marrom: "#8a5a3b" };
    $("filtros").innerHTML = `
      <div class="busca">
        <input type="search" id="fBusca" placeholder="Buscar por nome ou código (ex.: gelo, 1323, palha)" aria-label="Buscar cor" autocomplete="off">
      </div>
      <div class="filtro-linha" role="group" aria-label="Família de cores">
        <span class="filtro-rot">Família</span>
        <div class="rolagem">${[["", "Todas"], ...Object.entries(NOME_FAMILIA)].map(([k, n]) =>
          `<button type="button" class="chip" data-familia="${k}" aria-pressed="${k === ""}">${n}</button>`).join("")}</div>
      </div>
      <div class="filtro-linha" role="group" aria-label="Sensação">
        <span class="filtro-rot">Sensação</span>
        <div class="rolagem">${Object.entries(NOME_SENSACAO).map(([k, n]) =>
          `<button type="button" class="chip" data-sensacao="${k}" aria-pressed="false">${n}</button>`).join("")}</div>
      </div>
      <div class="filtro-linha" role="group" aria-label="Tom">
        <span class="filtro-rot">Tom</span>
        <div class="rolagem tons">${tons.map((t) =>
          `<button type="button" class="tom" data-tom="${t}" aria-pressed="false" title="${NOME_TOM[t]}"><span style="background:${AMOSTRA_TOM[t]}"></span>${NOME_TOM[t]}</button>`).join("")}</div>
      </div>
      <div class="filtro-selects">
        <label>Onde aplicar
          <select id="fUso"><option value="parede">Paredes</option><option value="piso">Pisos</option><option value="madeira-metal">Madeira e metal</option><option value="">Todas</option></select>
        </label>
        <label>Origem
          <select id="fOrigem"><option value="">Todas</option><option value="tinto">Tintométrico Iquine</option><option value="coral">Latas prontas Coral</option><option value="iquine">Latas prontas Iquine</option></select>
        </label>
        <label>Ordenar
          <select id="fOrdem"><option value="destaque">Latas prontas primeiro</option><option value="cor">Por cor</option><option value="nome">Nome</option><option value="preco">Menor preço</option></select>
        </label>
        <label class="check"><input type="checkbox" id="fDisp" checked> Só com estoque</label>
      </div>
      <p class="contagem" id="contagemCores" aria-live="polite"></p>`;

    let t;
    $("fBusca").addEventListener("input", (e) => { clearTimeout(t); t = setTimeout(() => { Cartela.f.busca = semAcento(e.target.value.trim()); Cartela.listar(true); }, 150); });
    const grupo = (attr, chave, unico) => $("filtros").querySelectorAll(`[data-${attr}]`).forEach((b) => b.addEventListener("click", () => {
      const v = b.dataset[attr];
      Cartela.f[chave] = Cartela.f[chave] === v && !unico ? "" : v;
      $("filtros").querySelectorAll(`[data-${attr}]`).forEach((x) => x.setAttribute("aria-pressed", x.dataset[attr] === Cartela.f[chave]));
      Cartela.listar(true);
    }));
    grupo("familia", "familia", true);
    grupo("sensacao", "sensacao");
    grupo("tom", "tom");
    $("fUso").addEventListener("change", (e) => { Cartela.f.uso = e.target.value; Cartela.listar(true); });
    $("fOrigem").addEventListener("change", (e) => { Cartela.f.origem = e.target.value; Cartela.listar(true); });
    $("fOrdem").addEventListener("change", (e) => { Cartela.f.ordem = e.target.value; Cartela.listar(true); });
    $("fDisp").addEventListener("change", (e) => { Cartela.f.disponiveis = e.target.checked; Cartela.listar(true); });
    $("mostrarMais").addEventListener("click", () => { Cartela.mostrando += Cartela.porPagina; Cartela.listar(); });
    App.aoMudar((c, op) => { if (!op.soAmbiente) Cartela.marcar(); });
  },

  filtrar() {
    const f = Cartela.f;
    const r = CORES.filter((c) =>
      (!f.uso || c.usos.has(f.uso)) &&
      (!f.origem || c.origens.has(f.origem)) &&
      (!f.familia || c.familias.includes(f.familia)) &&
      (!f.sensacao || c.sensacoes.includes(f.sensacao)) &&
      (!f.tom || c.tom === f.tom) &&
      (!f.disponiveis || !c.esgotada) &&
      (!f.busca || c.busca.includes(f.busca)));
    if (f.ordem === "nome") r.sort((a, b) => a.nome.localeCompare(b.nome));
    else if (f.ordem === "preco") r.sort((a, b) => (a.aPartir ?? 1e9) - (b.aPartir ?? 1e9));
    else if (f.ordem === "cor") r.sort((a, b) => a.ordem - b.ordem);
    else r.sort((a, b) => (!!b.prontas.length - !!a.prontas.length) || a.ordem - b.ordem); // latas prontas (pronta-entrega) primeiro
    // busca: o que começa com o termo vem primeiro
    if (f.busca) r.sort((a, b) => (semAcento(b.nome).startsWith(f.busca) - semAcento(a.nome).startsWith(f.busca)));
    return r;
  },

  listar(reiniciar) {
    if (reiniciar) Cartela.mostrando = Cartela.porPagina;
    const lista = Cartela.filtrar();
    const G = $("gradeCores");
    $("contagemCores").textContent = `${lista.length.toLocaleString("pt-BR")} cor${lista.length === 1 ? "" : "es"}`;
    G.innerHTML = lista.length ? "" : '<p class="vazio">Nenhuma cor com esses filtros. Tente tirar algum filtro.</p>';
    const frag = document.createDocumentFragment();
    lista.slice(0, Cartela.mostrando).forEach((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "amostra-card";
      b.dataset.id = c.id;
      b.setAttribute("aria-pressed", App.cor === c);
      const selos = [c.temOferta ? '<span class="selo">Oferta</span>' : "", c.esgotada ? '<span class="selo cinza">Sem estoque</span>' : ""].join("");
      b.innerHTML = `<span class="amostra-cor" style="background:${c.hex}">${selos}${c.tinto ? '<span class="maquina" title="Tintométrico">◆</span>' : ""}</span>
        <span class="amostra-nome">${esc(c.nome)}</span>
        <span class="amostra-cod">${esc(c.prontas.length ? c.marca : "Tintométrico")}${c.codigo ? " · " + esc(c.codigo) : ""}</span>
        ${c.aPartir ? `<span class="amostra-preco">a partir de ${brl(c.aPartir)}</span>` : ""}`;
      b.addEventListener("click", () => App.escolher(c, { daCartela: true }));
      frag.appendChild(b);
    });
    G.appendChild(frag);
    $("mostrarMais").hidden = lista.length <= Cartela.mostrando;
    $("mostrarMais").textContent = `Mostrar mais cores (${(lista.length - Cartela.mostrando).toLocaleString("pt-BR")} restantes)`;
  },

  marcar() {
    document.querySelectorAll(".amostra-card").forEach((b) => b.setAttribute("aria-pressed", App.cor && b.dataset.id === App.cor.id));
  },
};
