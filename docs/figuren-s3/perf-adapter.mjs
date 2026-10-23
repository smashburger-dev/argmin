// Test-only adapter: the unmodified S1 performance harness opens the lab's
// first figure. Select another native figure by changing only the HTTP copy
// of FigureLab, leaving all repository engine, painter and lab files intact.
import http from 'node:http';
const scenes = {
  'smoothie-row-and-column': 'l-linalg-systems',
  'solution-cases-3d': 'l-linalg-independence',
  'span-carpet': 'l-linalg-independence',
  'receipt-elimination': 'l-linalg-gauss',
  'receipt-echelon-3x3': 'l-linalg-gauss',
};
let scene = 'smoothie-row-and-column';
http.createServer(async (req, res) => {
  if (req.url.startsWith('/__scene/')) {
    const selected = req.url.split('/').at(-1);
    if (!scenes[selected]) { res.writeHead(400); res.end('unknown scene'); return; }
    scene = selected; res.end(scene); return;
  }
  try {
    const upstream = await fetch(`http://127.0.0.1:4402${req.url}`, { headers: { accept: req.headers.accept ?? '*/*' } });
    if (req.url.startsWith('/src/figures/FigureLab.tsx')) {
      let body = await upstream.text();
      body = body.replace(/const LAB_LESSON = [^;]+;/, `const LAB_LESSON = '${scenes[scene]}';`);
      body = body.replace('lesson.blocks.find(block => block.fig)', `lesson.blocks.find(block => block.fig?.scene === '${scene}')`);
      // Prediction gates are outside the frame-time measurement. Keep the native
      // specification otherwise intact. For short scenes, the harness's beat 3
      // maps to the penultimate state so its final transition remains measurable.
      body = body.replace(
        "setSpec(lesson.blocks.find(block => block.fig?.scene === '" + scene + "')?.fig ?? null)",
        "setSpec((() => { const chosen = lesson.blocks.find(block => block.fig?.scene === '" + scene + "')?.fig; return chosen ? {...chosen, predict: undefined} : null; })())"
      );
      const penultimate = scene === 'span-carpet' ? 1 : scene === 'receipt-echelon-3x3' ? 2 : 3;
      body = body.replace('initialBeat: labBeat()', 'initialBeat: Math.min(labBeat(), ' + penultimate + ')');
      res.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store' });
      res.end(body); return;
    }
    const headers = Object.fromEntries(upstream.headers);
    delete headers['content-encoding']; delete headers['content-length'];
    res.writeHead(upstream.status, headers);
    res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (e) { res.writeHead(502); res.end(String(e)); }
}).listen(4498, '127.0.0.1', () => console.log('S3 performance adapter 4498 -> app 4402'));
