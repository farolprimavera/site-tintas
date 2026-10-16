/* produtos.js — página "Produtos": uma ficha por linha de tinta (latas prontas Coral e
   Iquine e tintométrico Iquine), com foto, ficha técnica, embalagens, preço "a partir de"
   e as cores. Cada cor abre o simulador já pintado (ambiente.html#cor=...).
   Usa só window.TINTAS_SITE (dados/tintas.js) e as utilidades de js/app.js. */

const ICONES_ONDE = {
  Parede: "🧱", Interior: "🏠", Exterior: "🌤️", Gesso: "◻️", Madeira: "🪵", Metal: "🔩", Piso: "⬛", Azulejo: "🔲",
};
const ORDEM_CATEGORIA = { Premium: 0, Standard: 1, "Econômica": 2 };
const GRUPOS_PRODUTOS = [
  { id: "coral", titulo: "Latas prontas Coral", texto: "Cores prontas, é só levar." },
  { id: "iquine", titulo: "Latas prontas Iquine", texto: "Cores prontas, é só levar." },
  { id: "tinto", titulo: "Tintométrico Iquine", texto: "Você escolhe a cor e a tinta, e a máquina da loja prepara na hora." },
];
const CORES_NA_FICHA = 16; // amostras visíveis antes de "ver todas"

const Produtos = {
  f: { busca: "", grupo: "", uso: "" },
  lista: [],

  /* junta tudo o que a página precisa de cada linha */
  preparar() {
    const fichas = new Map();
    const ficha = (lid) => {
      if (!fichas.has(lid)) {
        const l = D.linhas[lid] || { nome: lid, marca: "", onde: [], tipo: "pronta" };
        fichas.set(lid, {
          id: lid, l, cores: [], fotos: new Map(), embalagens: new Map(), precos: [],
          grupo: l.tipo === "tintometrico" ? "tinto" : semAcento(l.marca),
        });
      }
      return fichas.get(lid);
    };

    CORES.forEach((c) => {
      c.prontas.forEach((pl) => {
        const f = ficha(pl.linha);
        f.cores.push(c);
        pl.produtos.forEach((p) => {
          if (p.foto) f.fotos.set(p.foto, (f.fotos.get(p.foto) || 0) + 1);
          const e = f.embalagens.get(p.embalagem) || { litros: p.litros || 0, ok: false, preco: null };
          if (!p.sem_estoque) {
            e.ok = true;
            // guarda os preços do produto mais barato desta embalagem (à vista, a prazo e oferta)
            const ef = p.oferta || p.vista;
            if (ef && (!e.preco || ef < (e.preco.oferta || e.preco.vista))) e.preco = { vista: p.vista, prazo: p.prazo, oferta: p.oferta };
          }
          f.embalagens.set(p.embalagem, e);
          if (!p.sem_estoque && (p.oferta || p.vista)) f.precos.push(p.oferta || p.vista);
        });
      });
      if (c.tinto) {
        const vistas = new Set();
        c.tinto.opcoes.forEach(([bi, preco, , esg]) => {
          const b = D.bases[bi];
          const f = ficha(b.linha);
          if (!vistas.has(b.linha)) { f.cores.push(c); vistas.add(b.linha); }
          const e = f.embalagens.get(b.embalagem) || { litros: b.litros || 0, ok: false, min: Infinity };
          if (!esg) { e.ok = true; f.precos.push(preco); e.min = Math.min(e.min, preco); }
          f.embalagens.set(b.embalagem, e);
        });
      }
    });

    Produtos.lista = [...fichas.values()].map((f) => {
      f.cores.sort((a, b) => a.ordem - b.ordem);
      f.aPartir = f.precos.length ? Math.min(...f.precos) : null;
      f.foto = [...f.fotos.entries()].sort((a, b) => b[1] - a[1]).map((x) => x[0])[0] || "";
      f.usos = usosDaLinha(f.l);
      f.busca = semAcento(`${f.l.nome} ${f.l.marca} ${f.l.categoria || ""} ${f.l.acabamento || ""} ${f.l.descricao || ""}`);
      return f;
    }).sort((a, b) =>
      // com estoque primeiro, depois as linhas com mais cores (as principais da loja)
      ((a.aPartir == null) - (b.aPartir == null)) || (b.cores.length - a.cores.length) ||
      ((ORDEM_CATEGORIA[a.l.categoria] ?? 3) - (ORDEM_CATEGORIA[b.l.categoria] ?? 3)) || a.l.nome.localeCompare(b.l.nome));
  },

  montar() {
    $("filtrosProdutos").innerHTML = `
      <div class="busca">
        <input type="search" id="pBusca" placeholder="Buscar tinta (ex.: esmalte, piso, rende muito)" aria-label="Buscar tinta" autocomplete="off">
      </div>
      <div class="filtro-linha" role="group" aria-label="Origem">
        <span class="filtro-rot">Origem</span>
        <div class="rolagem">${[["", "Todas"], ...GRUPOS_PRODUTOS.map((g) => [g.id, g.titulo.replace("Latas prontas ", "Latas ")])].map(([k, n]) =>
          `<button type="button" class="chip" data-grupo="${k}" aria-pressed="${k === ""}">${esc(n)}</button>`).join("")}</div>
      </div>
      <div class="filtro-linha" role="group" aria-label="Onde aplicar">
        <span class="filtro-rot">Onde</span>
        <div class="rolagem">${[["", "Tudo"], ...Object.entries(USOS)].map(([k, n]) =>
          `<button type="button" class="chip" data-uso="${k}" aria-pressed="${k === ""}">${esc(n)}</button>`).join("")}</div>
      </div>`;

    // veio da busca do topo (produtos.html?q=...)
    const q = new URLSearchParams(location.search).get("q");
    if (q) { $("pBusca").value = q; Produtos.f.busca = semAcento(q.trim()); }

    let t;
    $("pBusca").addEventListener("input", (e) => {
      clearTimeout(t);
      t = setTimeout(() => { Produtos.f.busca = semAcento(e.target.value.trim()); Produtos.listar(); }, 150);
    });
    ["grupo", "uso"].forEach((attr) => $("filtrosProdutos").querySelectorAll(`[data-${attr}]`).forEach((b) => b.addEventListener("click", () => {
      Produtos.f[attr] = b.dataset[attr];
      $("filtrosProdutos").querySelectorAll(`[data-${attr}]`).forEach((x) => x.setAttribute("aria-pressed", x === b));
      Produtos.listar();
    })));

    // "ver todas as cores" e "ver menos" (um ouvinte só para a lista inteira)
    $("listaProdutos").addEventListener("click", (e) => {
      const emb = e.target.closest("[data-emb]");
      if (emb) { Produtos.mostrarEmbalagem(emb); return; }
      const b = e.target.closest("[data-abrir]");
      if (!b) return;
      const card = b.closest(".ficha-produto");
      const aberto = card.classList.toggle("aberto");
      b.textContent = aberto ? "Ver menos" : b.dataset.abrir;
    });
  },

  listar() {
    const f = Produtos.f;
    const r = Produtos.lista.filter((p) =>
      (!f.grupo || p.grupo === f.grupo) && (!f.uso || p.usos.has(f.uso)) && (!f.busca || p.busca.includes(f.busca)));
    $("contagemProdutos").textContent = `${r.length} ${r.length === 1 ? "tinta" : "tintas"}`;
    const html = GRUPOS_PRODUTOS.map((g) => {
      const doGrupo = r.filter((p) => p.grupo === g.id);
      if (!doGrupo.length) return "";
      return `<section class="grupo-produtos" aria-labelledby="g-${g.id}">
        <div class="grupo-topo"><h2 id="g-${g.id}">${esc(g.titulo)}</h2><p>${esc(g.texto)}</p></div>
        <div class="grade-produtos">${doGrupo.map(Produtos.card).join("")}</div>
      </section>`;
    }).join("");
    $("listaProdutos").innerHTML = html || `<p class="vazio">Nenhuma tinta com esses filtros.
      Procurando uma cor? Use a busca do topo ou veja a <a class="link" href="index.html#explorar">cartela de cores</a>.</p>`;
  },

  // preço da embalagem escolhida: à vista, a prazo e oferta (lata pronta) ou "a partir de" (tintométrico)
  mostrarEmbalagem(botao) {
    const card = botao.closest(".ficha-produto");
    const p = Produtos.lista.find((x) => x.id === card.dataset.linha);
    const e = p && p.embalagens.get(botao.dataset.emb);
    if (!e) return;
    card.querySelectorAll("[data-emb]").forEach((b) => b.setAttribute("aria-pressed", b === botao));
    const alvo = card.querySelector("[data-preco]");
    const nome = esc(botao.dataset.emb);
    if (!e.ok) { alvo.innerHTML = `<span class="emb-nome">${nome}</span> <span class="selo cinza">Sem estoque</span>`; return; }
    if (p.grupo === "tinto") {
      alvo.innerHTML = `<span class="emb-nome">${nome}</span><div class="emb-precos"><span><small>a partir de</small><b>${brl(e.min)}</b></span></div>
        <small class="emb-obs">O preço muda com a cor (quantidade de corante).</small>`;
      return;
    }
    const pr = e.preco || {};
    const itens = [];
    if (pr.oferta) itens.push(`<span class="oferta"><small>Oferta</small><b>${brl(pr.oferta)}</b></span>`);
    if (pr.vista) itens.push(`<span${pr.oferta ? ' class="riscado"' : ""}><small>À vista</small><b>${brl(pr.vista)}</b></span>`);
    if (pr.prazo && pr.prazo !== pr.vista) itens.push(`<span><small>A prazo</small><b>${brl(pr.prazo)}</b></span>`);
    alvo.innerHTML = `<span class="emb-nome">${nome}</span><div class="emb-precos">${itens.join("") || '<span class="consulte">Consulte no balcão</span>'}</div>`;
  },

  card(p) {
    const l = p.l;
    const tinto = p.grupo === "tinto";
    const disponiveis = p.cores.filter((c) => !c.esgotada);
    const primeira = disponiveis[0] || p.cores[0];

    // tintométrico tem centenas de cores: amostra espalhada pela cartela + link para a cartela completa
    let amostras = p.cores;
    if (tinto && p.cores.length > CORES_NA_FICHA) {
      const passo = p.cores.length / CORES_NA_FICHA;
      amostras = Array.from({ length: CORES_NA_FICHA }, (_, i) => p.cores[Math.floor(i * passo + passo / 2)]);
    }
    const sobra = amostras.length - CORES_NA_FICHA;

    const foto = tinto
      ? `<div class="ficha-foto maquina-foto" aria-hidden="true">${amostras.slice(0, 8).map((c) => `<span style="background:${c.hex}"></span>`).join("")}<b>Feita na hora</b></div>`
      : p.foto
        ? `<div class="ficha-foto"><img src="imagens/produtos/${esc(p.foto)}.webp" alt="Lata ${esc(l.nome)}" loading="lazy" width="180" height="180"></div>`
        : `<div class="ficha-foto"><span class="lata" style="background:${primeira ? primeira.hex : "#ddd"}"></span></div>`;

    // embalagens: botões; ao tocar mostram os preços daquele tamanho
    const embalagens = [...p.embalagens.entries()].sort((a, b) => a[1].litros - b[1].litros)
      .map(([nome, e]) => `<button type="button" class="emb${e.ok ? "" : " fora"}" data-emb="${esc(nome)}" aria-pressed="false">${esc(nome)}</button>`).join("");

    const cores = amostras.map((c) => `<a class="bolinha${c.esgotada ? " fora" : ""}" href="ambiente.html#cor=${encodeURIComponent(c.id)}&amb=sala"
      style="background:${c.hex}" title="${esc(c.nome)}${c.esgotada ? " (sem estoque)" : ""}"><span class="sr">${esc(c.nome)}</span></a>`).join("");

    const verTodas = tinto
      ? `<a class="link" href="index.html#explorar">Ver as ${num(p.cores.length, 0)} cores na cartela</a>`
      : sobra > 0 ? `<button type="button" class="link" data-abrir="Ver todas as ${p.cores.length} cores">Ver todas as ${p.cores.length} cores</button>` : "";

    const whats = App.whatsapp(`Olá! Quero saber mais sobre a tinta ${l.nome}${tinto ? " (tintométrico Iquine)" : ` ${l.marca}`}.`);

    return `<article class="ficha-produto${tinto ? " tinto" : ""}" data-linha="${esc(p.id)}">
      ${foto}
      <div class="ficha-corpo">
        <p class="ficha-marca">${tinto ? "Tintométrico Iquine" : `Lata pronta ${esc(l.marca)}`}${l.categoria ? ` · ${esc(l.categoria)}` : ""}</p>
        <h3>${esc(l.nome)}</h3>
        ${l.descricao ? `<p class="opcao-desc">${esc(l.descricao)}</p>` : ""}
        <div class="ficha">
          ${(l.onde || []).map((o) => `<span class="onde"><span aria-hidden="true">${ICONES_ONDE[o] || "•"}</span>${esc(o)}</span>`).join("")}
          ${l.acabamento ? `<span class="atributo">Acabamento: <b>${esc(l.acabamento)}</b></span>` : ""}
          ${l.rendimento ? `<span class="atributo">Rende <b>~${num(l.rendimento)} m²/L</b> por demão</span>` : ""}
        </div>
        <div class="ficha-preco" data-preco>${p.aPartir != null
          ? `<small>a partir de</small> <b>${brl(p.aPartir)}</b>`
          : '<span class="selo cinza">Sem estoque</span>'}</div>
        <div class="ficha-bloco"><span class="passo">Embalagens <small>toque para ver o preço</small></span><div class="embs">${embalagens}</div></div>
        <div class="ficha-bloco">
          <span class="passo">${tinto ? "Algumas cores" : `${p.cores.length} ${p.cores.length === 1 ? "cor" : "cores"}`}</span>
          <div class="bolinhas">${cores}</div>
          ${verTodas}
        </div>
        <div class="ficha-acoes">
          ${primeira ? `<a class="botao primario" href="ambiente.html#cor=${encodeURIComponent(primeira.id)}&amb=sala">Ver no ambiente</a>` : ""}
          ${whats ? `<a class="botao whats" href="${esc(whats)}" target="_blank" rel="noopener">Perguntar no WhatsApp</a>` : ""}
        </div>
      </div>
    </article>`;
  },
};

Produtos.preparar();
Produtos.montar();
Produtos.listar();
