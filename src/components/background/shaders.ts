import { MAX_TRAIL } from "./config";

export const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const fragmentShader = `
precision highp float;
#define MAX_TRAIL ${MAX_TRAIL}

uniform float uTime;
uniform float uSpeed;
uniform float uAmplitude;
uniform float uFrequency;
uniform vec2 uDirection;
uniform float uDistortionStrength;
uniform float uCursorRadius;
uniform float uAspect;
uniform vec2 uTrailPositions[MAX_TRAIL];
uniform vec2 uTrailVelocities[MAX_TRAIL];
uniform float uTrailAges[MAX_TRAIL];
uniform int uTrailCount;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uColor4;
uniform float uStop1;
uniform float uStop2;
uniform float uStop3;
uniform float uScroll;
uniform float uZoom;

varying vec2 vUv;

vec2 zoomUv(vec2 p) {
  return (p - 0.5) / uZoom + 0.5;
}

float waterCaustics(vec2 uv, float t) {
  vec2 p = mod(uv * 6.28318, 6.28318) - 250.0;
  vec2 i = vec2(p);
  float c = 1.0;
  float inten = 0.005;

  for (int n = 0; n < 4; n++) {
    float tSub = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tSub - i.x) + sin(tSub + i.y), sin(tSub - i.y) + cos(tSub + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tSub) / inten), p.y / (cos(i.y + tSub) / inten)));
  }
  c /= float(4);
  c = 1.17 - pow(c, 1.4);
  return clamp(pow(abs(c), 8.0) * 0.15, 0.0, 0.4);
}

vec3 sineNoise(vec2 uv, float t) {
  vec2 dir = normalize(uDirection);
  float dp = dot(uv, dir);
  float f = uFrequency;
  float a = uAmplitude;

  float n = 0.0;
  n += sin(dp * 4.0 * f + t) * a;
  n += sin(dp * 7.5 * f + uv.y * 3.0 - t * 1.3) * a * 0.55;
  n += sin(uv.x * 5.0 * f + uv.y * 8.0 * f + t * 0.7) * 0.45;
  n += sin(dp * 11.0 * f - uv.x * 4.5 + t * 1.8) * 0.38;
  n += sin(uv.x * 3.0 * f - uv.y * 5.0 * f - t * 0.95) * 0.28;
  n += sin((uv.x + uv.y) * 7.0 * f + t * 1.4) * 0.22;
  n += sin(dp * 15.0 * f + uv.x * uv.y * 6.0 - t * 2.1) * 0.15;

  float noiseVal = clamp(n * 0.4 + 0.5, 0.0, 1.0);

  vec3 finalColor;
  if (noiseVal < uStop1) {
    finalColor = mix(uColor1, uColor2, smoothstep(0.0, uStop1, noiseVal));
  } else if (noiseVal < uStop2) {
    finalColor = mix(uColor2, uColor3, smoothstep(uStop1, uStop2, noiseVal));
  } else if (noiseVal < uStop3) {
    finalColor = mix(uColor3, uColor4, smoothstep(uStop2, uStop3, noiseVal));
  } else {
    finalColor = uColor4;
  }
  return finalColor;
}

vec2 applyWaterDistortion(vec2 uv, out float outRippleHeight, out vec2 outDisplacement) {
  vec2 result = uv;
  float totalHeight = 0.0;
  vec2 accumDisp = vec2(0.0);

  for (int i = 0; i < MAX_TRAIL; i++) {
    if (i >= uTrailCount) break;

    float age = uTrailAges[i];
    vec2 diff = uv - uTrailPositions[i];
    vec2 scaledDiff = diff * vec2(uAspect, 1.0);
    float dist = length(scaledDiff);

    float radius = uCursorRadius * 2.4;
    if (dist > radius * 3.2) continue;

    float normDist = clamp(dist / radius, 0.0, 1.0);
    float weight = (1.0 - smoothstep(0.0, 1.0, normDist)) * uDistortionStrength;

    float waterDecay = exp(-age * 1.5) * (1.0 - smoothstep(1.9, 2.4, age));
    weight *= waterDecay;

    vec2 vel = uTrailVelocities[i];
    float velMag = length(vel);

    float ripplePhase = dist * 55.0 - age * 16.0;
    float rippleWave = sin(ripplePhase) * exp(-dist * 9.0) * weight * 0.022;
    totalHeight += rippleWave;

    if (velMag > 0.0005) {
      vec2 velDir = vel / (velMag + 0.0005);
      vec2 perp = vec2(-velDir.y, velDir.x);

      float swirl = dot(scaledDiff, perp) * weight * 22.0;
      float s = sin(swirl);
      float c = cos(swirl);
      vec2 rotated = vec2(scaledDiff.x * c - scaledDiff.y * s, scaledDiff.x * s + scaledDiff.y * c);

      vec2 disp = -vel * weight * 0.48 + (rotated - scaledDiff) * 0.52 + normalize(scaledDiff + vec2(0.0001)) * rippleWave;
      result += disp;
      accumDisp += disp;
    } else {
      float idleWave = sin(dist * 48.0 - uTime * 4.5 + age) * weight * 0.016;
      vec2 disp = scaledDiff * weight * (0.028 + idleWave);
      result += disp;
      accumDisp += disp;
    }
  }

  outRippleHeight = totalHeight;
  outDisplacement = accumDisp;
  return result;
}

void main() {
  float t = uTime * uSpeed;
  vec2 flow = vec2(0.0, uScroll);

  if (uTrailCount == 0) {
    gl_FragColor = vec4(sineNoise(zoomUv(vUv) + flow, t), 1.0);
    return;
  }

  float rippleHeight = 0.0;
  vec2 displacement = vec2(0.0);
  vec2 uv = applyWaterDistortion(vUv, rippleHeight, displacement);

  vec2 colorUv = zoomUv(uv) + flow;
  vec3 colorR = sineNoise(colorUv - displacement * 0.045, t);
  vec3 colorG = sineNoise(colorUv, t);
  vec3 colorB = sineNoise(colorUv + displacement * 0.045, t);
  vec3 color = vec3(colorR.r, colorG.g, colorB.b);

  float caustics = waterCaustics(uv * 1.5 + displacement * 0.2, t * 0.8) * uDistortionStrength;
  color += vec3(0.5, 0.8, 1.0) * caustics * clamp(length(displacement) * 8.0, 0.0, 1.0);

  vec2 eps = vec2(0.002, 0.0);
  float hDx = 0.0;
  float hDy = 0.0;
  vec2 unusedDisp;
  applyWaterDistortion(vUv + eps.xy, hDx, unusedDisp);
  applyWaterDistortion(vUv + eps.yx, hDy, unusedDisp);

  vec3 normal = normalize(vec3(-(hDx - rippleHeight) * 45.0, -(hDy - rippleHeight) * 45.0, 1.0));
  vec3 lightDir = normalize(vec3(0.35, 0.55, 0.75));

  float spec = pow(max(dot(normal, lightDir), 0.0), 32.0) * uDistortionStrength;
  float fresnel = pow(1.0 - max(dot(normal, vec3(0.0, 0.0, 1.0)), 0.0), 3.0) * 0.35 * uDistortionStrength;

  vec3 waterHighlight = vec3(0.85, 0.95, 1.0) * (spec * 0.6 + fresnel);

  float dispMag = length(displacement);
  float depthShade = clamp(dispMag * 4.2 * uDistortionStrength, 0.0, 0.40);
  color = mix(color * (1.0 - depthShade), color + waterHighlight, 0.80) + waterHighlight;

  gl_FragColor = vec4(color, 1.0);
}
`;
