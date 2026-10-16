/* ofertas.js — página "Ofertas": cada lata pronta com preço de oferta e estoque,
   da maior para a menor economia. O preço de oferta vem da "Tabela de Preço"
   (fontes/precos.json → dados/tintas.js, campo "oferta"). */

const Ofertas = {
  listar() {
    const itens = [];
    CORES.forEach((c) => c.prontas.forEach((pl) => {
      const l = D.linhas[pl.linha] || { nome: pl.linha, marca: c.marca };
      pl.produtos.forEach((p) => {
        if (!p.oferta || p.sem_estoque || !p.vista || p.oferta >= p.vista) return;
        itens.push({ c, l, p, desconto: Math.round((1 - p.oferta / p.vista) * 100) });
      });
    }));
    itens.sort((a, b) => b.desconto - a.desconto || a.p.oferta - b.p.oferta);

    $("contagemOfertas").textContent = itens.length ? `${itens.length} ${itens.length === 1 ? "oferta" : "ofertas"}` : "";
    $("listaOfertas").innerHTML = itens.length ? itens.map(Ofertas.card).join("") : `
      <div class="ofertas-vazio">
        <p><b>Nenhuma oferta no momento.</b> As ofertas mudam toda semana: volte depois ou veja todas as tintas.</p>
        <a class="botao primario" href="produtos.html">Ver todas as tintas</a>
      </div>`;
  },

  card({ c, l, p, desconto }) {
    const link = `ambiente.html#cor=${encodeURIComponent(c.id)}&amb=sala`;
    const pedido = App.whatsapp(`Olá! Quero a oferta: ${l.nome}, cor ${c.nome} (${codigoTexto(c) || c.marca}), ${p.embalagem}, por ${brl(p.oferta)}. Cód. ${p.codigo}.`);
    return `<article class="oferta">
      <div class="oferta-foto">
        ${p.foto ? `<img src="imagens/produtos/${esc(p.foto)}.webp" alt="" loading="lazy" width="160" height="160">` : `<span class="lata" style="background:${c.hex}"></span>`}
        <span class="oferta-desconto">-${desconto}%</span>
      </div>
      <div class="oferta-corpo">
        <p class="ficha-marca">Lata pronta ${esc(l.marca || c.marca)}</p>
        <h2>${esc(l.nome)} <span>${esc(p.embalagem)}</span></h2>
        <p class="oferta-cor"><span class="bolinha" style="background:${c.hex}" aria-hidden="true"></span>${esc(c.nome)}<small>${esc(codigoTexto(c))}</small></p>
        <p class="oferta-preco"><s>${brl(p.vista)}</s> <b>${brl(p.oferta)}</b> <small>à vista</small></p>
        <p class="produto-cod">Cód. ${esc(p.codigo)}</p>
        <div class="ficha-acoes">
          <a class="botao primario" href="${link}">Ver no ambiente</a>
          ${pedido ? `<a class="botao whats" href="${esc(pedido)}" target="_blank" rel="noopener">Pedir no WhatsApp</a>` : ""}
        </div>
      </div>
    </article>`;
  },
};

Ofertas.listar();
