import polygonClipping from 'polygon-clipping';
import type { Point, Polygon, MaskPath } from '../types';

/**
 * Converte um array de pontos para o formato de polígono do polygon-clipping
 * @param points Array de pontos
 * @returns Polígono no formato [[x, y], [x, y], ...]
 */
function pointsToPolygon(points: Point[]): [number, number][] {
  return points.map(p => [p.x, p.y] as [number, number]);
}

/**
 * Converte polígono do formato polygon-clipping para array de pontos
 * @param polygon Polígono no formato [[x, y], [x, y], ...]
 * @returns Array de pontos
 */
function polygonToPoints(polygon: number[][]): Point[] {
  return polygon.map(([x, y]) => ({ x, y }));
}

/**
 * Cria um polígono circular (círculo aproximado por pontos) ao redor de um ponto central
 * @param center Centro do círculo
 * @param radius Raio do círculo
 * @param segments Número de segmentos para aproximar o círculo (padrão: 32)
 * @returns Array de pontos formando um círculo
 */
export function createCircle(center: Point, radius: number, segments = 32): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    points.push({
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    });
  }
  return points;
}

/**
 * Gera o contorno de um traço de brush circular
 * Cria círculos ao longo do trajeto e faz a união para eliminar defeitos internos
 * @param pathPoints Pontos do caminho da brush
 * @param brushRadius Raio da brush (em coordenadas normalizadas)
 * @returns Pontos formando o contorno da brush (polígono fechado)
 */
export function generateBrushOutline(pathPoints: Point[], brushRadius: number): Point[] {
  if (pathPoints.length === 0) return [];

  if (pathPoints.length === 1) {
    // Apenas um ponto: retorna um círculo completo
    return createCircle(pathPoints[0], brushRadius, 32);
  }

  try {
    // Gerar círculos ao longo de todo o trajeto
    const circles: polygonClipping.MultiPolygon[] = [];

    // Adicionar círculo no primeiro ponto
    circles.push([[pointsToPolygon(createCircle(pathPoints[0], brushRadius, 24))]]);

    // Para cada segmento, adicionar círculos intermediários
    for (let i = 0; i < pathPoints.length - 1; i++) {
      const p1 = pathPoints[i];
      const p2 = pathPoints[i + 1];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Número de círculos a adicionar baseado na distância
      // Garante sobreposição para eliminar gaps
      const numCircles = Math.max(2, Math.ceil(distance / (brushRadius * 0.5)));

      for (let j = 1; j <= numCircles; j++) {
        const t = j / numCircles;
        const interpPoint = {
          x: p1.x + dx * t,
          y: p1.y + dy * t,
        };
        circles.push([[pointsToPolygon(createCircle(interpPoint, brushRadius, 24))]]);
      }
    }

    // Fazer união de todos os círculos
    let result: polygonClipping.MultiPolygon = circles[0];
    for (let i = 1; i < circles.length; i++) {
      result = polygonClipping.union(result, circles[i]);
    }

    // Converter resultado para array de pontos
    // Pegar apenas o primeiro polígono do resultado (exterior)
    if (result.length > 0 && result[0].length > 0) {
      return polygonToPoints(result[0][0]); // Primeiro polígono, primeiro ring (exterior)
    }

    // Fallback: retornar círculo simples se união falhar
    return createCircle(pathPoints[0], brushRadius, 32);
  } catch (error) {
    console.error('Erro ao gerar contorno da brush:', error);
    // Fallback: retornar círculo simples
    return createCircle(pathPoints[0], brushRadius, 32);
  }
}

/**
 * Une múltiplos caminhos de máscara em um único polígono usando operações booleanas
 * Preserva buracos e remove bordas internas
 * @param paths Array de caminhos de máscara (freehand e brush)
 * @param brushSize Tamanho da brush para gerar contornos circulares
 * @returns Polígono unificado no formato compatível com polygon-clipping
 */
export function unifyMaskPaths(paths: MaskPath[], brushSize: number): Polygon | null {
  if (paths.length === 0) return null;

  try {
    // Converter cada path para MultiPolygon (formato esperado pela library)
    const multiPolygons = paths.map(path => {
      let points: Point[];

      if (path.type === 'brush') {
        // Para brush, gerar contorno circular
        // Brush já retorna um polígono fechado (com semicírculos nas extremidades)
        const brushRadius = brushSize / 2; // brushSize é o diâmetro em pixels, converter para raio normalizado
        // Nota: assumindo que brushRadius já está em coordenadas normalizadas (0-1)
        // Se estiver em pixels, seria necessário converter
        points = generateBrushOutline(path.points, brushRadius / 1000); // Normalizar para coordenadas 0-1
      } else {
        // Para freehand, usar pontos diretamente e fechar o polígono
        points = path.points;

        // Fechar o polígono freehand se necessário (conectar último ao primeiro)
        if (points.length > 0) {
          const first = points[0];
          const last = points[points.length - 1];
          if (first.x !== last.x || first.y !== last.y) {
            points = [...points, first];
          }
        }
      }

      // Retornar no formato MultiPolygon = [Polygon] = [[Ring]] = [[[x,y]]]
      return [[pointsToPolygon(points)]];
    });

    // Realizar união de todos os polígonos
    let result: polygonClipping.MultiPolygon = multiPolygons[0];

    for (let i = 1; i < multiPolygons.length; i++) {
      result = polygonClipping.union(result, multiPolygons[i]);
    }

    // Converter resultado para o formato Polygon (Point[][])
    // result é MultiPolygon = Polygon[] onde Polygon = Ring[] onde Ring = [number, number][]
    // Precisamos converter para Point[][] = Ring[] onde Ring = Point[]
    const unified: Polygon = [];

    // Iterar sobre cada polígono no MultiPolygon
    for (const polygon of result) {
      // Cada polígono tem múltiplos rings (exterior + holes)
      for (const ring of polygon) {
        unified.push(polygonToPoints(ring));
      }
    }

    return unified;
  } catch (error) {
    console.error('Erro ao unificar máscaras:', error);
    return null;
  }
}

/**
 * Verifica se um polígono está orientado no sentido horário
 * @param points Pontos do polígono
 * @returns true se horário, false se anti-horário
 */
export function isClockwise(points: Point[]): boolean {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    sum += (p2.x - p1.x) * (p2.y + p1.y);
  }
  return sum > 0;
}
