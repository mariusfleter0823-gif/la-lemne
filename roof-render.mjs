// Opaque orthographic renderer. Depth is resolved per pixel, not per polygon centre.
// The raster is embedded in the SVG so labels, printing and screenshots stay together.
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const paper = rgb('#f3f8ef');
const color = (hex, opacity = 1) => rgb(hex).map((n, i) => Math.round(n * opacity + paper[i] * (1 - opacity)));
export function projectFaces(faces, project) {
  return faces.map(face => ({ ...face, points: face.points.map(project), color: color(face.fill, face.opacity), edgeColor: color(face.stroke, face.opacity) }));
}

// CPU fallback also provides deterministic tests for the exact visibility contract.
// Larger depth is nearer to the camera; nothing behind a filled pixel can draw on it.
export function rasterizeDepth(faces, width, height, outlines = true) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  const depth = new Float64Array(width * height).fill(-Infinity);
  const edge = (a, b, x, y) => (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
  const paint = (x, y, z, ink, bias = 0) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (z + bias < depth[p]) return;
    depth[p] = Math.max(depth[p], z);
    const k=p*4; pixels[k]=ink[0]; pixels[k+1]=ink[1]; pixels[k+2]=ink[2]; pixels[k+3]=255;
  };
  for (const face of faces) for (let i = 1; i < face.points.length - 1; i++) {
    const [a, b, c] = [face.points[0], face.points[i], face.points[i + 1]], area = edge(a, b, c[0], c[1]);
    if (Math.abs(area) < 1e-10) continue;
    const minX = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))), maxX = Math.min(width - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
    const minY = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))), maxY = Math.min(height - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const u = edge(b, c, x + .5, y + .5) / area, v = edge(c, a, x + .5, y + .5) / area, w = 1 - u - v;
      if (u >= -1e-9 && v >= -1e-9 && w >= -1e-9) paint(x, y, u * a[2] + v * b[2] + w * c[2], face.color);
    }
  }
  if (outlines) for (const face of faces) for (let i = 0; i < face.points.length; i++) {
    const a = face.points[i], b = face.points[(i + 1) % face.points.length], count = Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) * 2);
    for (let j = 0; j <= count; j++) {
      const t = count ? j / count : 0;
      paint(Math.floor(a[0] + (b[0] - a[0]) * t), Math.floor(a[1] + (b[1] - a[1]) * t), a[2] + (b[2] - a[2]) * t, face.edgeColor, 1e-5);
    }
  }
  return { pixels, depth };
}

let gpu, fallback;
function createGPU() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, depth: true, preserveDrawingBuffer: true });
  if (!gl) return null;
  const shader = (type, source) => {
    const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error('Roof shader compilation failed');
    return s;
  };
  const vertex = shader(gl.VERTEX_SHADER, 'attribute vec3 p; attribute vec3 ink; varying vec3 c; void main(){gl_Position=vec4(p,1.0);c=ink;}');
  const fragment = shader(gl.FRAGMENT_SHADER, 'precision mediump float; varying vec3 c; void main(){gl_FragColor=vec4(c,1.0);}');
  const program = gl.createProgram(); gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error('Roof shader linking failed');
  gl.deleteShader(vertex); gl.deleteShader(fragment);
  return { canvas, gl, program, buffer: gl.createBuffer(), p: gl.getAttribLocation(program, 'p'), ink: gl.getAttribLocation(program, 'ink') };
}
export function renderRoofImage(faces, project, width, height) {
  const projected = projectFaces(faces, project), ratio = Math.min(2, window.devicePixelRatio || 1);
  if (gpu === undefined) { try { gpu = createGPU(); } catch { gpu = null; } }
  if (gpu && !gpu.gl.isContextLost()) {
    const { canvas, gl, program, buffer, p, ink } = gpu;
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    gl.viewport(0, 0, canvas.width, canvas.height); gl.useProgram(program);
    const depths = projected.flatMap(f => f.points.map(p => p[2])), near = Math.max(...depths), far = Math.min(...depths), span = Math.max(.01, near - far);
    const vertex = (point, c) => [point[0] / width * 2 - 1, 1 - point[1] / height * 2, .95 - (point[2] - far) / span * 1.9, ...c.map(n => n / 255)];
    const triangles = [], lines = [];
    for (const face of projected) {
      for (let i = 1; i < face.points.length - 1; i++) for (const point of [face.points[0], face.points[i], face.points[i + 1]]) triangles.push(...vertex(point, face.color));
      for (let i = 0; i < face.points.length; i++) for (const point of [face.points[i], face.points[(i + 1) % face.points.length]]) lines.push(...vertex(point, face.edgeColor));
    }
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
    gl.clearColor(0, 0, 0, 0); gl.clearDepth(1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.enableVertexAttribArray(p); gl.enableVertexAttribArray(ink);
    gl.vertexAttribPointer(p, 3, gl.FLOAT, false, 24, 0); gl.vertexAttribPointer(ink, 3, gl.FLOAT, false, 24, 12);
    const draw = (data, primitive) => { gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW); gl.drawArrays(primitive, 0, data.length / 6); };
    // Constant precision bias only. A slope-scaled offset can exceed the 25 mm
    // decking thickness in an oblique view and expose concealed rafter edges.
    gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(0, 2); draw(triangles, gl.TRIANGLES); gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.lineWidth(1); draw(lines, gl.LINES);
    return { url: canvas.toDataURL('image/png'), backend: 'webgl-depth' };
  }
  fallback ||= document.createElement('canvas');
  fallback.width = Math.round(width * ratio); fallback.height = Math.round(height * ratio);
  const scaled = projected.map(f => ({ ...f, points: f.points.map(([x, y, z]) => [x * ratio, y * ratio, z]) }));
  const { pixels } = rasterizeDepth(scaled, fallback.width, fallback.height);
  fallback.getContext('2d').putImageData(new ImageData(pixels, fallback.width, fallback.height), 0, 0);
  return { url: fallback.toDataURL('image/png'), backend: 'software-depth' };
}
