/* pintura.js — pinta as paredes dos ambientes no próprio navegador.

   Cada ambiente tem a foto e uma máscara (branco = parede), embutidas em
   dados/ambientes.js como data URL para o canvas poder ler os pixels mesmo
   abrindo o site do disco (file://).

   Como pinta: a cor escolhida é multiplicada pela luz da foto (luminância
   do pixel ÷ "ref", o branco da parede). Assim sombras, cantos e a luz da
   janela continuam aparecendo, como numa parede pintada de verdade. */

const Pintura = {
  amb: {},       // id → { W, H, base, lum, alpha, ref }
  pronto: null,  // Promise

  carregarImagem(src) {
    return new Promise((ok, erro) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = erro;
      i.src = src;
    });
  },

  preparar() {
    const imgs = window.AMBIENTES_IMG || {};
    Pintura.pronto = Promise.all(Object.keys(D.ambientes).map(async (id) => {
      const info = D.ambientes[id], fonte = imgs[id];
      if (!fonte) return;
      const [foto, mask] = await Promise.all([Pintura.carregarImagem(fonte.foto), Pintura.carregarImagem(fonte.parede)]);
      const W = foto.naturalWidth, H = foto.naturalHeight;
      const tela = document.createElement("canvas");
      tela.width = W; tela.height = H;
      const c = tela.getContext("2d", { willReadFrequently: true });
      c.drawImage(foto, 0, 0);
      const base = c.getImageData(0, 0, W, H);
      c.clearRect(0, 0, W, H);
      c.drawImage(mask, 0, 0, W, H);
      const m = c.getImageData(0, 0, W, H).data;
      const n = W * H, lum = new Float32Array(n), cru = new Float32Array(n), alpha = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const j = i * 4;
        lum[i] = 0.299 * base.data[j] + 0.587 * base.data[j + 1] + 0.114 * base.data[j + 2];
        cru[i] = m[j] / 255;
      }
      // borda suave (3×3) para a tinta não ficar serrilhada
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let s = 0, k = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy; if (yy < 0 || yy >= H) continue;
          for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx < 0 || xx >= W) continue; s += cru[yy * W + xx]; k++; }
        }
        alpha[y * W + x] = s / k;
      }
      Pintura.amb[id] = { W, H, base, lum, alpha, ref: info.ref || 230, saida: new ImageData(W, H) };
    }));
    return Pintura.pronto;
  },

  /* desenha o ambiente `id` pintado com `hex` no canvas `tela` (no tamanho dele) */
  desenhar(tela, id, hex, semTinta) {
    const a = Pintura.amb[id];
    if (!a) return;
    const o = a.saida.data;
    o.set(a.base.data);
    if (!semTinta && hex) {
      const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
      const { alpha, lum, ref } = a;
      for (let i = 0, n = a.W * a.H; i < n; i++) {
        const al = alpha[i];
        if (al === 0) continue;
        const j = i * 4, f = Math.min(lum[i] / ref, 1.08);
        o[j] += (Math.min(255, r * f) - o[j]) * al;
        o[j + 1] += (Math.min(255, g * f) - o[j + 1]) * al;
        o[j + 2] += (Math.min(255, b * f) - o[j + 2]) * al;
      }
    }
    if (tela.width === a.W && tela.height === a.H) {
      tela.getContext("2d").putImageData(a.saida, 0, 0);
    } else {
      // miniatura: pinta no tamanho cheio e reduz
      if (!Pintura.aux) Pintura.aux = document.createElement("canvas");
      const aux = Pintura.aux;
      aux.width = a.W; aux.height = a.H;
      aux.getContext("2d").putImageData(a.saida, 0, 0);
      const c = tela.getContext("2d");
      c.imageSmoothingQuality = "high";
      c.drawImage(aux, 0, 0, tela.width, tela.height);
    }
  },
};
