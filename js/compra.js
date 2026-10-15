/* compra.js — "Onde comprar esta cor": latas prontas e tintométrico, com acabamento,
   onde usar, base da máquina, embalagens e preço. Também monta a tabela "Qual tinta escolher?". */

const ICONE_ONDE = {
  Parede: "🧱", Interior: "🏠", Exterior: "🌤️", Gesso: "◻️", Madeira: "🪵", Metal: "🔩", Piso: "⬛", Azulejo: "🔲",
};

const Compra = {
  linhaTinto: null, // linha escolhida no tintométrico (fica entre uma cor e outra)
  embTinto: null,

  ondeHtml(l) {
    return l.onde.map((o) => `<span class="onde"><span aria-hidden="true">${ICONE_ONDE[o] || "•"}</span>${esc(o)}</span>`).join("");
  },

  fichaHtml(l) {
    return `<div class="ficha">
      ${Compra.ondeHtml(l)}
      ${l.acabamento ? `<span class="atributo">Acabamento: <b>${esc(l.acabamento)}</b></span>` : ""}
      ${l.categoria ? `<span class="atributo">Linha: <b>${esc(l.categoria)}</b></span>` : ""}
    </div>`;
  },

  precoHtml(p) {
    if (p.vista == null) return '<span class="consulte">Consulte o preço no balcão</span>';
    if (p.oferta) return `<span class="selo">Oferta</span> <s>${brl(p.vista)}</s> <b>${brl(p.oferta)}</b>`;
    const prazo = p.prazo && p.prazo !== p.vista ? ` <small>· ${brl(p.prazo)} a prazo</small>` : "";
    return `<b>${brl(p.vista)}</b> <small>à vista</small>${prazo}`;
  },

  pedido(c, linha, emb) {
    return `Olá! Quero a tinta ${linha}, cor ${c.nome} (${codigoTexto(c) || c.marca}), ${emb}. Vi no simulador: ${App.linkDaCor(c)}`;
  },

  botaoWhats(texto) {
    const url = App.whatsapp(texto);
    return url ? `<a class="botao whats" href="${esc(url)}" target="_blank" rel="noopener">Pedir no WhatsApp</a>` : "";
  },

  render(c) {
    const O = $("opcoes");
    const partes = [];
    c.prontas.forEach((pl) => {
      const l = D.linhas[pl.linha] || { nome: pl.linha, onde: [] };
      partes.push(`<article class="opcao">
        <header class="opcao-topo">
          <div><h3>${esc(l.nome)}</h3><p class="opcao-sub">Lata pronta ${esc(l.marca || c.marca)}</p></div>
        </header>
        ${l.descricao ? `<p class="opcao-desc">${esc(l.descricao)}</p>` : ""}
        ${Compra.fichaHtml(l)}
        <ul class="produtos">${pl.produtos.map((p) => `
          <li class="produto${p.sem_estoque ? " fora" : ""}">
            ${p.foto ? `<img src="imagens/produtos/${esc(p.foto)}.webp" alt="" loading="lazy" width="56" height="56">` : `<span class="lata" style="background:${c.hex}"></span>`}
            <div class="produto-info">
              <div class="produto-emb">${esc(p.embalagem)}</div>
              <div class="produto-preco">${p.sem_estoque ? '<span class="selo cinza">Sem estoque</span> ' : ""}${Compra.precoHtml(p)}</div>
              <div class="produto-cod">Cód. ${esc(p.codigo)}</div>
            </div>
            ${!p.sem_estoque ? Compra.botaoWhats(Compra.pedido(c, l.nome, p.embalagem)).replace("Pedir no WhatsApp", "Pedir") : ""}
          </li>`).join("")}
        </ul>
      </article>`);
    });

    if (c.tinto) partes.push(`<article class="opcao tinto" id="opcaoTinto"></article>`);
    O.innerHTML = partes.join("") || '<p class="vazio">Esta cor não está disponível no momento.</p>';
    if (c.tinto) Compra.tinto(c);

    const n = c.prontas.length + (c.tinto ? 1 : 0);
    $("compraResumo").textContent = n > 1 ? `${n} opções` : "";
    Compra.tabela(c);
  },

  /* tintométrico: escolhe a tinta (linha) e o tamanho; a base vem da fórmula */
  tinto(c) {
    const ops = c.tinto.opcoes.map(([bi, preco, corantes, esg]) => ({ b: D.bases[bi], preco, corantes, esg: !!esg }));
    const linhas = [...new Set(ops.map((o) => o.b.linha))];
    if (!linhas.includes(Compra.linhaTinto)) {
      const ok = ops.find((o) => !o.esg && D.linhas[o.b.linha] && D.linhas[o.b.linha].nome === "Delanil Rende Muito") || ops.find((o) => !o.esg) || ops[0];
      Compra.linhaTinto = ok.b.linha;
    }
    const daLinha = ops.filter((o) => o.b.linha === Compra.linhaTinto);
    if (!daLinha.some((o) => o.b.embalagem === Compra.embTinto)) Compra.embTinto = (daLinha.find((o) => !o.esg) || daLinha[0]).b.embalagem;
    const o = daLinha.find((x) => x.b.embalagem === Compra.embTinto);
    const l = D.linhas[Compra.linhaTinto] || { nome: Compra.linhaTinto, onde: [] };

    $("opcaoTinto").innerHTML = `
      <header class="opcao-topo">
        <div><h3>Feita na hora no tintométrico</h3><p class="opcao-sub">Cor Iquine ${esc(c.tinto.cod)} · preparada na máquina da loja</p></div>
      </header>
      <p class="passo">1. Escolha a tinta</p>
      <div class="chips">${linhas.map((lid) => {
        const da = ops.filter((x) => x.b.linha === lid), ok = da.filter((x) => !x.esg);
        const menor = Math.min(...(ok.length ? ok : da).map((x) => x.preco));
        return `<button type="button" class="chip${ok.length ? "" : " fora"}" data-linha="${esc(lid)}" aria-pressed="${lid === Compra.linhaTinto}">
          ${esc((D.linhas[lid] || {}).nome || lid)}<small>${ok.length ? "a partir de " + brl(menor) : "sem estoque"}</small></button>`;
      }).join("")}</div>
      ${l.descricao ? `<p class="opcao-desc">${esc(l.descricao)}</p>` : ""}
      ${Compra.fichaHtml(l)}
      <p class="passo">2. Escolha o tamanho</p>
      <div class="chips">${daLinha.map((x) => `<button type="button" class="chip${x.esg ? " fora" : ""}" data-emb="${esc(x.b.embalagem)}" aria-pressed="${x.b.embalagem === Compra.embTinto}">${esc(x.b.embalagem)}</button>`).join("")}</div>
      <div class="preco-tinto">
        ${o.esg ? '<span class="selo cinza">Sem estoque</span>' : ""}
        <div class="preco-grande">${brl(o.preco)}</div>
        <div class="preco-conta">Base ${esc(o.b.base)} ${brl(o.preco - o.corantes)} + corantes ${brl(o.corantes)}</div>
        <p class="preco-pedir">No balcão, peça: <b>cor Iquine ${esc(c.tinto.cod)}</b> em ${esc(l.nome)}, ${esc(o.b.embalagem)}. A máquina usa a <b>base ${esc(o.b.base)}</b> para esta cor.</p>
        ${o.esg ? "" : Compra.botaoWhats(Compra.pedido(c, l.nome + " (tintométrico)", o.b.embalagem))}
      </div>`;
    $("opcaoTinto").querySelectorAll("[data-linha]").forEach((b) => b.addEventListener("click", () => { Compra.linhaTinto = b.dataset.linha; Compra.tinto(c); Calc.render(); }));
    $("opcaoTinto").querySelectorAll("[data-emb]").forEach((b) => b.addEventListener("click", () => { Compra.embTinto = b.dataset.emb; Compra.tinto(c); }));
  },

  /* comparativo de todas as linhas, destacando as disponíveis para a cor escolhida */
  tabela(c) {
    const naCor = new Map();
    c.prontas.forEach((pl) => naCor.set(pl.linha, Math.min(...pl.produtos.filter((p) => !p.sem_estoque && p.vista).map((p) => p.oferta || p.vista), Infinity)));
    if (c.tinto) c.tinto.opcoes.forEach(([bi, preco, , esg]) => {
      const lid = D.bases[bi].linha;
      if (!esg) naCor.set(lid, Math.min(naCor.get(lid) ?? Infinity, preco));
      else if (!naCor.has(lid)) naCor.set(lid, Infinity);
    });
    const ordem = { Premium: 0, Standard: 1, "Econômica": 2 };
    const linhas = Object.entries(D.linhas).sort((a, b) =>
      (naCor.has(b[0]) - naCor.has(a[0])) || (a[1].tipo !== b[1].tipo ? (a[1].tipo === "tintometrico" ? -1 : 1) : 0) ||
      ((ordem[a[1].categoria] ?? 3) - (ordem[b[1].categoria] ?? 3)) || a[1].nome.localeCompare(b[1].nome));
    $("tabelaLinhas").innerHTML = `
      <thead><tr><th>Tinta</th><th>Acabamento</th><th>Onde usar</th><th>Linha</th><th>Rende*</th><th>Nesta cor</th></tr></thead>
      <tbody>${linhas.map(([lid, l]) => {
        const v = naCor.get(lid);
        return `<tr class="${naCor.has(lid) ? "tem" : ""}">
          <td><b>${esc(l.nome)}</b><small>${l.tipo === "tintometrico" ? "Tintométrico Iquine" : "Lata pronta " + esc(l.marca)}</small></td>
          <td>${esc(l.acabamento)}</td>
          <td>${esc(l.onde.filter((o) => o !== "Parede" || l.onde.length === 1).join(", "))}</td>
          <td>${esc(l.categoria)}</td>
          <td>${l.rendimento ? `${num(l.rendimento)} m²/L` : "—"}</td>
          <td>${!naCor.has(lid) ? "—" : v === Infinity ? '<span class="selo cinza">sem estoque</span>' : "✓ " + brl(v)}</td>
        </tr>`;
      }).join("")}</tbody>
      <tfoot><tr><td colspan="6">* Rendimento aproximado por demão, em parede lisa e selada. Confira na embalagem.</td></tr></tfoot>`;
  },
};

App.aoMudar((c, op) => { if (!op.soAmbiente) Compra.render(c); });
