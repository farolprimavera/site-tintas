/* ==========================================================================
   sw.js — service worker do simulador de tintas (fica na raiz: o escopo dele é a
   pasta onde está, e precisa cobrir o site inteiro)

   POR QUE ELE EXISTE. Para o navegador aceitar instalar o site como
   aplicativo (o Chrome exige HTTPS, manifest e um service worker com
   tratador de `fetch`) e para o site abrir sem internet com o que o cliente
   já viu. Sem este arquivo o site funciona igual, só não instala — é o que
   acontece abrindo o index.html com dois cliques (file://).

   ESTRATÉGIA POR TIPO:

   - index.html e dados/* ........ REDE PRIMEIRO. Preço muda toda semana;
                                   com internet o cliente sempre vê o mais
                                   novo. O cache só responde offline.
   - CSS, JS, ícones, logo ....... cache e atualiza por trás
                                   (stale-while-revalidate).
   - imagens/** .................. CACHE PRIMEIRO (fotos das latas), guardando
                                   só as que o cliente viu, no máximo MAX_IMAGENS.
   - outros domínios ............. passam direto (Google Fonts, WhatsApp).

   VERSAO: aumente a cada publicação que mexa em HTML, CSS, JS ou nas
   imagens (`tintas-v2`, `tintas-v3`…). Só preço (dados/*) não precisa.
   Com versão nova, o site mostra "Nova versão disponível. Atualizar".
   ========================================================================== */

const VERSAO = "tintas-v7";
const CASCA = `${VERSAO}-casca`;
const IMAGENS = `${VERSAO}-imagens`;
const MAX_IMAGENS = 120;

const ARQUIVOS_CASCA = [
  "./",
  "./index.html",
  "./ambiente.html",
  "./produtos.html",
  "./ofertas.html",
  "./tintometrico.html",
  "./site.webmanifest",
  "./css/styles.css",
  "./dados/tintas.js",
  "./dados/ambientes.js",
  "./dados/misturas.js",
  "./js/app.js",
  "./js/pintura.js",
  "./js/vitrine.js",
  "./js/carrossel.js",
  "./js/ambiente.js",
  "./js/compra.js",
  "./js/calculadora.js",
  "./js/cartela.js",
  "./js/monte.js",
  "./js/inicio.js",
  "./js/pwa.js",
  "./js/produtos.js",
  "./js/ofertas.js",
  "./js/busca.js",
  "./js/tintometrico.js",
  "./js/totem.js",
  "./marca/logo-farol-web.png",
  "./marca/icone-tintometrico-96.png",
  "./marca/icone-tintometrico-192.png",
  "./marca/parede-loja-800.webp",
  "./marca/parede-loja-1440.webp",
  "./icones/favicon.ico",
  "./icones/favicon.svg",
  "./icones/apple-touch-icon.png",
  "./icones/icon-192.png",
  "./icones/icon-512.png",
  "./icones/icon-maskable-512.png",
];

self.addEventListener("install", (evento) => {
  // cache: "reload" pula o cache HTTP do navegador: a casca nova sai do servidor.
  // Sem skipWaiting aqui: a versão nova espera o cliente tocar em "Atualizar".
  evento.waitUntil(
    caches.open(CASCA).then((c) =>
      c.addAll(ARQUIVOS_CASCA.map((url) => new Request(url, { cache: "reload" })))
    )
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(
        nomes.filter((n) => n !== CASCA && n !== IMAGENS).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (evento) => {
  if (evento.data === "PULAR_ESPERA") self.skipWaiting();
});

self.addEventListener("fetch", (evento) => {
  const req = evento.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // caminho relativo ao escopo: "index.html", "dados/tintas.js", "imagens/produtos/x.webp"...
  const escopo = new URL(self.registration.scope).pathname;
  const caminho = url.pathname.startsWith(escopo) ? url.pathname.slice(escopo.length) : url.pathname;

  if (req.mode === "navigate" || caminho === "" || caminho === "index.html" || caminho.startsWith("dados/")) {
    evento.respondWith(redePrimeiro(req));
  } else if (caminho.startsWith("imagens/")) {
    evento.respondWith(imagem(req, caminho));
  } else {
    evento.respondWith(cacheEAtualiza(req, evento));
  }
});

/* --------------------------------------------------------------------- */

async function redePrimeiro(req) {
  try {
    // no-cache: revalida com o servidor em vez de aceitar a cópia de 10 min do GitHub Pages
    const resp = await fetch(req.url, { cache: "no-cache", credentials: "same-origin" });
    if (resp.ok) {
      const copia = resp.clone();
      caches.open(CASCA).then((c) => c.put(req, copia));
    }
    return resp;
  } catch (e) {
    const achado = await caches.match(req, { ignoreSearch: true });
    if (achado) return achado;
    if (req.mode === "navigate") return caches.match("./index.html");
    return Response.error();
  }
}

async function cacheEAtualiza(req, evento) {
  const cache = await caches.open(CASCA);
  const guardado = await cache.match(req, { ignoreSearch: true });
  const daRede = fetch(req)
    .then((resp) => {
      if (resp.ok) cache.put(req, resp.clone());
      return resp;
    })
    .catch(() => null);
  if (guardado) {
    evento.waitUntil(daRede);
    return guardado;
  }
  return (await daRede) || Response.error();
}

async function imagem(req, caminho) {
  const cache = await caches.open(IMAGENS);
  const guardada = await cache.match(req);
  if (guardada) return guardada;
  try {
    const resp = await fetch(req);
    if (resp.ok) {
      await cache.put(req, resp.clone());
      limitarImagens(cache);
    }
    return resp;
  } catch (e) {
    return imagemOffline(caminho);
  }
}

// Apaga as mais antigas (keys() vem na ordem em que entraram).
let limpando = false;
async function limitarImagens(cache) {
  if (limpando) return;
  limpando = true;
  try {
    const chaves = await cache.keys();
    const sobra = chaves.length - MAX_IMAGENS;
    for (let i = 0; i < sobra; i++) await cache.delete(chaves[i]);
  } finally {
    limpando = false;
  }
}

/* Sem internet e sem a foto no cache: um quadro neutro. Nunca imagem quebrada. */
async function imagemOffline() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56" width="56" height="56"><rect width="56" height="56" fill="#e8ebe9"/></svg>`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "no-store" } });
}
