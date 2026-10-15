/* calculadora.js — quanto de tinta comprar: paredes (largura × altura), menos portas e
   janelas, × demãos ÷ rendimento da linha, + 10% de margem. Sugere a combinação de
   embalagens mais barata da linha escolhida, para a cor escolhida. */

const Calc = {
  paredes: [{ l: 4, a: 2.7 }, { l: 3, a: 2.7 }],
  portas: 1,
  janelas: 1,
  porta: 0.8 * 2.1,
  janela: 1.2 * 1.0,
  demaos: null,
  linha: null,
  MARGEM: 0.1,

  /* linhas da cor escolhida, com as embalagens em estoque */
  opcoes(c) {
    const r = new Map();
    c.prontas.forEach((pl) => {
      const l = D.linhas[pl.linha];
      if (!l) return;
      const embs = pl.produtos.filter((p) => !p.sem_estoque && p.litros && (p.oferta || p.vista))
        .map((p) => ({ nome: p.embalagem, litros: p.litros, preco: p.oferta || p.vista, codigo: p.codigo }));
      r.set(pl.linha, { l, nome: `${l.nome} (lata pronta)`, embs });
    });
    if (c.tinto) c.tinto.opcoes.forEach(([bi, preco, , esg]) => {
      const b = D.bases[bi], l = D.linhas[b.linha];
      if (!l) return;
      if (!r.has(b.linha)) r.set(b.linha, { l, nome: `${l.nome} (tintométrico)`, embs: [] });
      if (!esg && b.litros) r.get(b.linha).embs.push({ nome: b.embalagem, litros: b.litros, preco, codigo: b.codigo });
    });
    return r;
  },

  /* combinação mais barata que cobre `litros` (programação dinâmica em centilitros) */
  melhor(litros, embs) {
    if (!embs.length || litros <= 0) return null;
    const alvo = Math.ceil(litros * 100), tam = embs.map((e) => Math.round(e.litros * 100));
    const lim = alvo + Math.max(...tam);
    const custo = new Float64Array(lim + 1).fill(Infinity), de = new Int16Array(lim + 1).fill(-1);
    custo[0] = 0;
    for (let v = 1; v <= lim; v++) {
      for (let i = 0; i < embs.length; i++) {
        const t = tam[i];
        if (t <= v && custo[v - t] + embs[i].preco < custo[v]) { custo[v] = custo[v - t] + embs[i].preco; de[v] = i; }
      }
    }
    let v = -1, m = Infinity;
    for (let x = alvo; x <= lim; x++) if (custo[x] < m - 0.001) { m = custo[x]; v = x; }
    if (v < 0) return null;
    const qtd = new Array(embs.length).fill(0);
    for (let x = v; x > 0; x -= tam[de[x]]) qtd[de[x]]++;
    return { itens: embs.map((e, i) => ({ ...e, qtd: qtd[i] })).filter((e) => e.qtd).sort((a, b) => b.litros - a.litros), total: m, litros: v / 100 };
  },

  render() {
    const c = App.cor;
    if (!c) return;
    const ops = Calc.opcoes(c);
    if (!ops.has(Calc.linha)) Calc.linha = ops.has(Compra.linhaTinto) ? Compra.linhaTinto : [...ops.keys()][0];
    const op = ops.get(Calc.linha);
    const l = op ? op.l : null;
    const demaos = Calc.demaos || (l ? l.demaos : 2);

    $("calc").innerHTML = `
      <div class="calc-campos">
        <fieldset>
          <legend>Paredes (em metros)</legend>
          <div id="calcParedes">${Calc.paredes.map((p, i) => `
            <div class="parede-linha">
              <span class="parede-n">${i + 1}</span>
              <label>Largura <input type="number" inputmode="decimal" min="0" step="0.1" value="${p.l}" data-i="${i}" data-k="l"></label>
              <span aria-hidden="true">×</span>
              <label>Altura <input type="number" inputmode="decimal" min="0" step="0.1" value="${p.a}" data-i="${i}" data-k="a"></label>
              ${Calc.paredes.length > 1 ? `<button type="button" class="remover" data-rem="${i}" aria-label="Remover parede ${i + 1}">×</button>` : ""}
            </div>`).join("")}
          </div>
          <button type="button" class="botao" id="calcMais">+ Adicionar parede</button>
        </fieldset>
        <fieldset class="calc-desc">
          <legend>Descontar</legend>
          <label>Portas <input type="number" inputmode="numeric" min="0" step="1" value="${Calc.portas}" id="calcPortas"><small>0,80 × 2,10 m cada</small></label>
          <label>Janelas <input type="number" inputmode="numeric" min="0" step="1" value="${Calc.janelas}" id="calcJanelas"><small>1,20 × 1,00 m cada</small></label>
        </fieldset>
        <fieldset class="calc-desc">
          <legend>Tinta</legend>
          <label class="largo">Linha
            <select id="calcLinha">${[...ops].map(([lid, o]) => `<option value="${esc(lid)}"${lid === Calc.linha ? " selected" : ""}>${esc(o.nome)}</option>`).join("")}</select>
          </label>
          <label>Demãos <input type="number" inputmode="numeric" min="1" max="4" step="1" value="${demaos}" id="calcDemaos"></label>
        </fieldset>
      </div>
      <div class="calc-resultado" id="calcResultado" aria-live="polite"></div>`;

    const R = $("calc");
    R.querySelectorAll("[data-k]").forEach((inp) => inp.addEventListener("input", () => {
      Calc.paredes[+inp.dataset.i][inp.dataset.k] = Math.max(0, parseFloat(inp.value.replace(",", ".")) || 0);
      Calc.resultado(ops);
    }));
    R.querySelectorAll("[data-rem]").forEach((b) => b.addEventListener("click", () => { Calc.paredes.splice(+b.dataset.rem, 1); Calc.render(); }));
    $("calcMais").addEventListener("click", () => { Calc.paredes.push({ l: 3, a: 2.7 }); Calc.render(); });
    $("calcPortas").addEventListener("input", (e) => { Calc.portas = Math.max(0, parseInt(e.target.value) || 0); Calc.resultado(ops); });
    $("calcJanelas").addEventListener("input", (e) => { Calc.janelas = Math.max(0, parseInt(e.target.value) || 0); Calc.resultado(ops); });
    $("calcDemaos").addEventListener("input", (e) => { Calc.demaos = Math.min(4, Math.max(1, parseInt(e.target.value) || 1)); Calc.resultado(ops); });
    $("calcLinha").addEventListener("change", (e) => { Calc.linha = e.target.value; Calc.demaos = null; Calc.render(); });
    Calc.resultado(ops);
  },

  resultado(ops) {
    const c = App.cor, op = ops.get(Calc.linha), Rz = $("calcResultado");
    const bruta = Calc.paredes.reduce((s, p) => s + p.l * p.a, 0);
    const area = Math.max(0, bruta - Calc.portas * Calc.porta - Calc.janelas * Calc.janela);
    if (!op) { Rz.innerHTML = '<p class="vazio">Esta cor não tem tinta disponível para calcular.</p>'; return; }
    const l = op.l, demaos = Calc.demaos || l.demaos || 2;
    if (!l.rendimento) {
      Rz.innerHTML = `<p><b>${num(area)} m²</b> de parede. ${esc(l.nome)} é um efeito decorativo: o consumo depende da aplicação. Consulte no balcão.</p>`;
      return;
    }
    const litros = area * demaos / l.rendimento * (1 + Calc.MARGEM);
    const m = Calc.melhor(litros, op.embs);
    const lista = m ? m.itens.map((e) => `${e.qtd}× ${e.nome}`).join(" + ") : "";
    const texto = m ? `Olá! Quero ${lista} de ${l.nome}, cor ${c.nome} (${codigoTexto(c) || c.marca}), para ${num(area)} m². Vi no simulador: ${App.linkDaCor(c)}` : "";
    Rz.innerHTML = `
      <div class="calc-numeros">
        <div><span>Área para pintar</span><b>${num(area)} m²</b></div>
        <div><span>Tinta necessária</span><b>${num(litros)} L</b><small>${demaos} demão${demaos > 1 ? "s" : ""} · rende ~${num(l.rendimento)} m²/L · +10% de margem</small></div>
      </div>
      ${m ? `<div class="calc-sugestao">
          <span>Sugestão mais em conta</span>
          <ul>${m.itens.map((e) => `<li><b>${e.qtd}×</b> ${esc(e.nome)} <small>${brl(e.preco)} cada</small></li>`).join("")}</ul>
          <div class="calc-total">${brl(m.total)} <small>${num(m.litros)} L no total</small></div>
          ${Compra.botaoWhats(texto)}
        </div>` : area > 0 ? '<p class="vazio">Nenhuma embalagem desta linha em estoque para esta cor. Consulte no balcão.</p>' : ""}
      <p class="calc-nota">Cálculo aproximado. Paredes novas, com reboco cru ou cor muito diferente da anterior podem precisar de fundo ou de mais uma demão.</p>`;
  },
};

App.aoMudar((c, op) => { if (!op.soAmbiente) Calc.render(); });
