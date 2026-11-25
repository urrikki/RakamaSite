import { useEffect, useRef } from "react";

// Fond WebGL plein ecran : nebuleuse tourbillonnante + rayons divins depuis le centre.
// `color` et `intensity` se pilotent a chaud via la ref exposee.

export interface BackdropHandle {
  color: [number, number, number];
  intensity: number; // 0..2
  target: number;
}

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;

const FRAG = `
precision highp float;
uniform vec2 res;
uniform float t;
uniform vec3 col;
uniform float k;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.-2.*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0., a = .5;
  for(int i=0;i<5;i++){ v += a*noise(p); p = p*2.03 + 17.1; a *= .5; }
  return v;
}

void main(){
  vec2 uv = (gl_FragCoord.xy - .5*res) / res.y;
  float r = length(uv);
  float ang = atan(uv.y, uv.x);

  // nebuleuse qui tourne lentement
  vec2 q = vec2(cos(t*.05)*uv.x - sin(t*.05)*uv.y, sin(t*.05)*uv.x + cos(t*.05)*uv.y);
  float n = fbm(q*2.2 + vec2(t*.04, -t*.03));
  float n2 = fbm(q*4.0 - vec2(t*.06, t*.02) + n);
  vec3 neb = mix(vec3(.03,.02,.08), col*.55, smoothstep(.35,.95,n2)) + col*.12*n;

  // rayons
  float rays = pow(.5+.5*sin(ang*14. + t*.6 + n*3.), 6.) * .7 + pow(.5+.5*sin(ang*7. - t*.4), 8.) * .5;
  rays *= smoothstep(1.3, .0, r);
  float core = exp(-r*r*7.) * 1.4;

  vec3 c = neb + col * (rays*.55 + core) * k;
  // etoiles
  float s = step(.996, hash(floor(gl_FragCoord.xy/2.))) * (.5+.5*sin(t*3.+hash(floor(gl_FragCoord.xy))*20.));
  c += s*.7;
  // vignette
  c *= smoothstep(1.6, .3, r);
  gl_FragColor = vec4(c, 1.);
}`;

export function ShaderBackdrop({ handle }: { handle: React.MutableRefObject<BackdropHandle> }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false });
    if (!gl) return;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, "res");
    const uT = gl.getUniformLocation(prog, "t");
    const uCol = gl.getUniformLocation(prog, "col");
    const uK = gl.getUniformLocation(prog, "k");

    let raf = 0;
    const cur: [number, number, number] = [...handle.current.color];
    const start = performance.now();
    const resize = () => {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = Math.floor(canvas.clientWidth * dpr * 0.6);
      canvas.height = Math.floor(canvas.clientHeight * dpr * 0.6);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);
    const loop = () => {
      const h = handle.current;
      for (let i = 0; i < 3; i++) cur[i] += (h.color[i] - cur[i]) * 0.05;
      h.intensity += (h.target - h.intensity) * 0.06;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uT, (performance.now() - start) / 1000);
      gl.uniform3f(uCol, cur[0], cur[1], cur[2]);
      gl.uniform1f(uK, h.intensity);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [handle]);

  return <canvas ref={ref} className="backdrop-canvas" />;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
