/* app.js — dados, estado e utilidades compartilhadas por todos os módulos.

   Os dados vêm de dados/tintas.js (window.TINTAS_SITE), gerado por
   ferramentas/montar_dados.py. Nada aqui usa fetch: o site abre com dois
   cliques no index.html (file://) e também no GitHub Pages. */

const WHATSAPP = "552127763391"; // mesmo número do rodapé; vazio = esconde os botões de WhatsApp

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const semAcento = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const brl = (v) => v == null ? "" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = (v, casas = 1) => v.toLocaleString("pt-BR", { maximumFractionDigits: casas });

const D = window.TINTAS_SITE || { cores: [], linhas: {}, bases: [], ambientes: {}, atualizado: {} };

/* onde cada linha pode ser usada → grupos do filtro "Onde aplicar" */
const USOS = { parede: "Paredes", piso: "Pisos", "madeira-metal": "Madeira e metal" };
function usosDaLinha(l) {
  const u = new Set();
  if (l.onde.includes("Parede")) u.add("parede");
  if (l.onde.includes("Piso")) u.add("piso");
  if (l.onde.includes("Madeira") || l.onde.includes("Metal")) u.add("madeira-metal");
  return u;
}

const NOME_TOM = { branco: "Brancos", cinza: "Cinzas", preto: "Pretos", bege: "Beges", amarelo: "Amarelos", laranja: "Laranjas",
  vermelho: "Vermelhos", rosa: "Rosas", roxo: "Roxos", azul: "Azuis", verde: "Verdes", marrom: "Marrons" };
const NOME_FAMILIA = { neutros: "Neutros", pasteis: "Tons pastéis", vibrantes: "Vibrantes", terrosos: "Terrosos", escuros: "Escuros" };
const NOME_SENSACAO = { aconchegante: "Aconchegante", moderno: "Moderno", tranquilo: "Tranquilo", energia: "Energia",
  elegante: "Elegante", natural: "Natural" };

/* ---------- prepara as cores ---------- */
const CORES = D.cores;
const POR_ID = new Map();
CORES.forEach((c) => {
  POR_ID.set(c.id, c);
  const usos = new Set();
  const precos = [];
  c.prontas.forEach((pl) => {
    const l = D.linhas[pl.linha];
    if (l) usosDaLinha(l).forEach((u) => usos.add(u));
    pl.produtos.forEach((p) => { if (!p.sem_estoque && (p.oferta || p.vista)) precos.push(p.oferta || p.vista); });
  });
  if (c.tinto) {
    c.tinto.opcoes.forEach(([bi, preco, , esgotado]) => {
      const l = D.linhas[D.bases[bi].linha];
      if (l) usosDaLinha(l).forEach((u) => usos.add(u));
      if (!esgotado) precos.push(preco);
    });
  }
  c.usos = usos;
  c.aPartir = precos.length ? Math.min(...precos) : null;
  c.esgotada = !precos.length;
  c.temOferta = c.prontas.some((pl) => pl.produtos.some((p) => p.oferta && !p.sem_estoque));
  c.origens = new Set([...(c.prontas.length ? [c.marca.toLowerCase()] : []), ...(c.tinto ? ["tinto"] : [])]);
  c.busca = semAcento(`${c.nome} ${c.codigo} ${c.marca} ${c.tinto ? c.tinto.cod : ""}`);
  const L = c.lab[0], C = Math.hypot(c.lab[1], c.lab[2]);
  let h = Math.atan2(c.lab[2], c.lab[1]) * 180 / Math.PI; if (h < 0) h += 360;
  // ordem "de cartela": neutros do claro ao escuro, depois o arco-íris
  c.ordem = C < 8 ? -1000 + (100 - L) : Math.floor(((h + 340) % 360) / 24) * 1000 + (100 - L);
});

/* rótulo curto de onde a cor vem */
function origemTexto(c) {
  const p = [];
  if (c.prontas.length) p.push(`Lata pronta ${c.marca}`);
  if (c.tinto) p.push("Tintométrico Iquine");
  return p.join(" · ");
}
function codigoTexto(c) {
  if (c.tinto && c.marca === "Iquine") return `Cor Iquine ${c.tinto.cod}`;
  return c.codigo ? `Cor ${c.marca} ${c.codigo}` : "";
}

/* ---------- estado ---------- */
const App = {
  cor: null,
  ambiente: Object.keys(D.ambientes)[0] || "sala",
  ouvintes: [],
  aoMudar(f) { App.ouvintes.push(f); },
  escolher(c, opcoes = {}) {
    if (!c) return;
    App.cor = c;
    App.ouvintes.forEach((f) => f(c, opcoes));
    App.salvarLink();
  },
  trocarAmbiente(id) {
    if (!D.ambientes[id]) return;
    App.ambiente = id;
    App.ouvintes.forEach((f) => f(App.cor, { soAmbiente: true }));
    App.salvarLink();
  },
  salvarLink() {
    if (!App.cor) return;
    const h = `#cor=${encodeURIComponent(App.cor.id)}&amb=${App.ambiente}`;
    if (location.hash !== h) history.replaceState(null, "", h);
  },
  lerLink() {
    const p = new URLSearchParams(location.hash.slice(1));
    if (p.get("amb") && D.ambientes[p.get("amb")]) App.ambiente = p.get("amb");
    return POR_ID.get(p.get("cor") || "");
  },
  // endereço da página do ambiente com a cor (para links e para mandar no WhatsApp)
  urlAmbiente(c, amb) {
    return `ambiente.html#cor=${encodeURIComponent(c.id)}&amb=${amb || App.ambiente}`;
  },
  // endereço publicado: aberto do disco (file://) ou em teste local, o link/QR aponta para o site no ar
  SITE: "https://farolprimavera.github.io/site-tintas/",
  linkDaCor(c) {
    const publicado = /^https?:$/.test(location.protocol) && !/^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname);
    const pasta = publicado ? location.href.split("#")[0].split("?")[0].replace(/[^/]*$/, "") : App.SITE;
    return pasta + App.urlAmbiente(c);
  },
  whatsapp(texto) {
    return WHATSAPP ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}` : "";
  },
};

/* rola até um elemento respeitando o topo */
function irPara(el) {
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------- tema claro/escuro e aviso de tela ---------- */
(function () {
  const raiz = document.documentElement;
  $("tema").addEventListener("click", () => {
    const escuroAgora = raiz.dataset.tema ? raiz.dataset.tema === "escuro" : matchMedia("(prefers-color-scheme: dark)").matches;
    raiz.dataset.tema = escuroAgora ? "claro" : "escuro";
    try { localStorage.setItem("tema", raiz.dataset.tema); } catch (e) {}
  });

  // aviso de tela: só existe na página do simulador
  if ($("avisoTela")) {
    let fechado = false;
    try { fechado = localStorage.getItem("avisoTela") === "1"; } catch (e) {}
    $("avisoTela").hidden = fechado;
    $("fecharAvisoTela").addEventListener("click", () => {
      $("avisoTela").hidden = true;
      try { localStorage.setItem("avisoTela", "1"); } catch (e) {}
    });
  }

  const a = D.atualizado || {};
  const partes = [];
  if (a.latas) partes.push(`latas prontas em ${a.latas}`);
  if (a.tintometrico) partes.push(`tintométrico em ${a.tintometrico}`);
  if (partes.length && $("atualizado")) $("atualizado").textContent = `Preços atualizados: ${partes.join(" · ")}.`;
})();

/* ---------- menu do topo ----------
   Link com data-secao: se a seção está nesta página, rola até ela sem mexer no
   endereço (o #cor= da cor escolhida continua lá). Se não está (ex.: "Sobre"
   aberto na página de produtos), segue o link normal para index.html#sobre. */
document.querySelectorAll(".menu a[data-secao]").forEach((a) => a.addEventListener("click", (e) => {
  const alvo = document.getElementById(a.dataset.secao);
  if (!alvo) return;
  e.preventDefault();
  if (a.dataset.secao === "inicio") window.scrollTo({ top: 0, behavior: "smooth" });
  else irPara(alvo);
}));

/* ---------- botão flutuante "voltar ao topo" (todas as páginas) ---------- */
(function () {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "ir-topo";
  b.hidden = true;
  b.setAttribute("aria-label", "Voltar ao topo da página");
  b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Topo</span>';
  b.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  document.body.appendChild(b);
  let agendado = false;
  window.addEventListener("scroll", () => {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(() => { b.hidden = window.scrollY < 500; agendado = false; });
  }, { passive: true });
})();
