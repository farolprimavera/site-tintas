/* totem.js — modo totem: depois de 2 minutos sem ninguém mexer, volta para a
   tela inicial (index.html), limpa e no topo.

   Só funciona no aparelho que foi marcado como totem, para não atrapalhar
   quem usa o site em casa:
     - abra uma vez  .../index.html?totem=1   → o aparelho vira totem
     - para desligar .../index.html?totem=0
   A marca fica guardada no navegador do aparelho (localStorage).

   Nos últimos AVISO segundos aparece "Ainda está aí?" com um botão para
   continuar. Se ninguém tocar, o site volta ao início. Depois de voltar, o
   contador só recomeça quando alguém mexer de novo (não fica recarregando
   à toa a cada 2 minutos). */

(() => {
  const MINUTOS = 2;      // tempo parado até voltar ao início
  const AVISO = 15;       // segundos de aviso antes de voltar
  const CHAVE = "farol-totem";
  const INICIO = "index.html";

  // liga/desliga pelo endereço e lembra no aparelho
  let ligado = false;
  try {
    const p = new URLSearchParams(location.search).get("totem");
    if (p === "1") localStorage.setItem(CHAVE, "1");
    if (p === "0") localStorage.removeItem(CHAVE);
    ligado = localStorage.getItem(CHAVE) === "1";
  } catch (e) {
    ligado = new URLSearchParams(location.search).get("totem") === "1";
  }
  if (!ligado) return;

  const espera = MINUTOS * 60 * 1000 - AVISO * 1000;
  let timer = null, contagem = null, aviso = null, mexeu = false;

  const voltar = () => location.replace(INICIO);

  function esconderAviso() {
    clearInterval(contagem);
    if (aviso) { aviso.remove(); aviso = null; }
  }

  function mostrarAviso() {
    let resta = AVISO;
    aviso = document.createElement("div");
    aviso.setAttribute("role", "alertdialog");
    aviso.setAttribute("aria-live", "assertive");
    aviso.style.cssText = "position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);padding:16px";
    aviso.innerHTML = `
      <div style="background:#fff;color:#1d2b24;border-radius:16px;padding:28px 26px;max-width:420px;width:100%;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.3);font-family:inherit">
        <p style="font-size:1.5rem;font-weight:700;margin:0 0 8px">Ainda está aí?</p>
        <p style="margin:0 0 20px;font-size:1.05rem">Voltando para o início em <b id="totemSeg">${resta}</b> s.</p>
        <button type="button" style="background:#0e5a3a;color:#fff;border:0;border-radius:999px;padding:14px 30px;font-size:1.1rem;font-weight:700;cursor:pointer">Continuar aqui</button>
      </div>`;
    document.body.appendChild(aviso);
    contagem = setInterval(() => {
      resta -= 1;
      const s = document.getElementById("totemSeg");
      if (s) s.textContent = resta;
      if (resta <= 0) { clearInterval(contagem); voltar(); }
    }, 1000);
  }

  function armar() {
    clearTimeout(timer);
    timer = setTimeout(mostrarAviso, espera);
  }

  function atividade() {
    if (aviso) esconderAviso();
    mexeu = true;
    armar();
  }

  ["pointerdown", "touchstart", "keydown", "wheel", "scroll", "input"].forEach((ev) =>
    window.addEventListener(ev, atividade, { passive: true, capture: true }));

  // Na tela inicial limpa (acabou de voltar), só começa a contar quando alguém mexer.
  // Em qualquer outra página, ou com algo no endereço, conta desde já.
  const naInicial = /(^|\/)(index\.html)?$/.test(location.pathname) && !location.hash &&
    !new URLSearchParams(location.search).has("q");
  if (!naInicial) { mexeu = true; armar(); }
})();
