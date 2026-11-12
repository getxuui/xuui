type Point = { x: number; y: number };
export type Color = readonly [number, number, number, number];

const vertexSource = `
  attribute vec2 position;
  attribute vec4 color;
  attribute vec2 local;
  attribute vec2 grid;
  uniform vec2 resolution;
  varying vec4 vColor;
  varying vec2 vLocal;
  varying vec2 vGrid;
  void main() {
    gl_Position = vec4(position / resolution * vec2(2., -2.) + vec2(-1., 1.), 0., 1.);
    vColor = color;
    vLocal = local;
    vGrid = grid;
  }
`;

const fragmentSource = `
  precision highp float;
  varying vec4 vColor;
  varying vec2 vLocal;
  varying vec2 vGrid;
  void main() {
    float alpha = vColor.a;
    if (vGrid.x > 0.) {
      vec2 cell = mod(vLocal, vGrid.x);
      // One CSS pixel in the design, scaled with the camera.
      vec2 coverage = clamp((vGrid.y - cell) * 2. + .5, 0., 1.);
      alpha = 1. - (1. - alpha * coverage.x) * (1. - alpha * coverage.y);
    }
    gl_FragColor = vec4(vColor.rgb * alpha, alpha);
  }
`;

/** Batched triangles in viewport CSS pixels. One context serves the whole study,
 * so neither the number of artboards nor zoom determines GPU surface size. */
export function createCanvasRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: true,
    premultipliedAlpha: true,
    depth: false,
    stencil: false,
  });
  if (!gl) return null;
  const shaders: WebGLShader[] = [];
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  const dispose = () => {
    shaders.forEach((shader) => gl.deleteShader(shader));
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
  };
  if (!program || !buffer) {
    dispose();
    return null;
  }
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vertexSource],
    [gl.FRAGMENT_SHADER, fragmentSource],
  ] as const) {
    const shader = gl.createShader(type);
    if (!shader) {
      dispose();
      return null;
    }
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      dispose();
      return null;
    }
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    dispose();
    return null;
  }
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  // position, premultiplication input, local grid coordinate, grid period/width.
  const stride = 10;
  for (const [name, size, offset] of [
    ['position', 2, 0],
    ['color', 4, 2],
    ['local', 2, 6],
    ['grid', 2, 8],
  ] as const) {
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(
      location,
      size,
      gl.FLOAT,
      false,
      stride * 4,
      offset * 4,
    );
  }
  const resolution = gl.getUniformLocation(program, 'resolution');
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);
  const maxSize = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array;
  let vertices: number[] = [];
  const vertex = (
    point: Point,
    color: Color,
    local = point,
    period = 0,
    line = 0,
  ) =>
    vertices.push(point.x, point.y, ...color, local.x, local.y, period, line);
  const rect = (
    x: number,
    y: number,
    width: number,
    height: number,
    color: Color,
    period = 0,
    line = 0,
  ) => {
    if (width <= 0 || height <= 0) return;
    const corners = [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ];
    for (const index of [0, 1, 2, 0, 2, 3]) {
      const point = corners[index];
      vertex(point, color, { x: point.x - x, y: point.y - y }, period, line);
    }
  };
  const outline = (
    x: number,
    y: number,
    width: number,
    height: number,
    color: Color,
    line = 1,
  ) => {
    rect(x, y, width, line, color);
    rect(x, y + height - line, width, line, color);
    rect(x, y + line, line, height - line * 2, color);
    rect(x + width - line, y + line, line, height - line * 2, color);
  };
  const stroke = (points: Point[], width: number, colors: Color[]) => {
    // Shared mitered vertices prevent darker overlaps at segment joins.
    const sides = points.map((point, index) => {
      const before = points[Math.max(0, index - 1)];
      const after = points[Math.min(points.length - 1, index + 1)];
      const normal = (a: Point, b: Point) => {
        const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        return { x: -(b.y - a.y) / length, y: (b.x - a.x) / length };
      };
      const a = normal(before, index ? point : after);
      const b = normal(index < points.length - 1 ? point : before, after);
      const length = Math.hypot(a.x + b.x, a.y + b.y) || 1;
      const n = { x: (a.x + b.x) / length, y: (a.y + b.y) / length };
      const distance = width / 2 / Math.max(0.25, n.x * b.x + n.y * b.y);
      return [
        { x: point.x + n.x * distance, y: point.y + n.y * distance },
        { x: point.x - n.x * distance, y: point.y - n.y * distance },
      ];
    });
    for (let index = 1; index < sides.length; index++) {
      for (const [at, side] of [
        [index - 1, 0],
        [index - 1, 1],
        [index, 0],
        [index, 0],
        [index - 1, 1],
        [index, 1],
      ])
        vertex(sides[at][side], colors[at]);
    }
  };
  return {
    rect,
    outline,
    stroke,
    begin() {
      vertices = [];
    },
    render(width: number, height: number) {
      if (!width || !height || gl.isContextLost()) return false;
      const ratio = Math.min(
        window.devicePixelRatio || 1,
        maxSize[0] / width,
        maxSize[1] / height,
      );
      const pixelWidth = Math.max(1, Math.round(width * ratio));
      const pixelHeight = Math.max(1, Math.round(height * ratio));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resolution, width, height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(vertices),
        gl.DYNAMIC_DRAW,
      );
      gl.drawArrays(gl.TRIANGLES, 0, vertices.length / stride);
      return true;
    },
    dispose,
  };
}

export type CanvasRenderer = NonNullable<
  ReturnType<typeof createCanvasRenderer>
>;
