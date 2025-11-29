import polygonClipping from 'polygon-clipping';
import type { Point, Polygon, MaskPath } from '../types';

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
 * Cria círculos ao longo do path e retorna os pontos do contorno externo
 * @param pathPoints Pontos do caminho da brush
 * @param brushRadius Raio da brush (em coordenadas normalizadas)
 * @returns Pontos formando o contorno da brush
 */
export function generateBrushOutline(pathPoints: Point[], brushRadius: number): Point[] {
  if (pathPoints.length === 0) return [];
  if (pathPoints.length === 1) {
    // Apenas um ponto: retorna um círculo
    return createCircle(pathPoints[0], brushRadius);
  }

  // Para múltiplos pontos, criamos círculos ao longo do caminho
  // e calculamos o envelope (contorno externo)
  const circles: Point[][] = [];

  // Criar círculos ao longo do path
  for (let i = 0; i < pathPoints.length; i++) {
    circles.push(createCircle(pathPoints[i], brushRadius, 16));
  }

  // Se temos apenas 2 pontos, criamos um contorno simplificado
  if (pathPoints.length === 2) {
    const p1 = pathPoints[0];
    const p2 = pathPoints[1];

    // Vetor direção
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) return createCircle(p1, brushRadius);

    // Vetor perpendicular normalizado
    const perpX = -dy / len;
    const perpY = dx / len;

    // Criar contorno como um retângulo com extremidades circulares
    const outline: Point[] = [];

    // Semicírculo no início (lado direito)
    for (let i = 0; i <= 8; i++) {
      const angle = (i / 8) * Math.PI; // 0 a π
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      outline.push({
        x: p1.x + brushRadius * (perpX * cos - (dx/len) * sin),
        y: p1.y + brushRadius * (perpY * cos - (dy/len) * sin),
      });
    }

    // Semicírculo no fim (lado esquerdo)
    for (let i = 0; i <= 8; i++) {
      const angle = (i / 8) * Math.PI; // 0 a π
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      outline.push({
        x: p2.x + brushRadius * (-perpX * cos + (dx/len) * sin),
        y: p2.y + brushRadius * (-perpY * cos + (dy/len) * sin),
      });
    }

    return outline;
  }

  // Para múltiplos pontos, uma abordagem simples:
  // criar círculos em cada ponto e retornar a união aproximada
  const allPoints: Point[] = [];
  circles.forEach(circle => allPoints.push(...circle));

  // Retornar convex hull seria ideal, mas por simplicidade
  // vamos interpolar círculos entre pontos consecutivos
  const detailedOutline: Point[] = [];

  for (let i = 0; i < pathPoints.length - 1; i++) {
    const p1 = pathPoints[i];
    const p2 = pathPoints[i + 1];
    const steps = 5; // Interpolação entre pontos

    for (let t = 0; t < steps; t++) {
      const ratio = t / steps;
      const interpPoint = {
        x: p1.x + (p2.x - p1.x) * ratio,
        y: p1.y + (p2.y - p1.y) * ratio,
      };
      detailedOutline.push(...createCircle(interpPoint, brushRadius, 12));
    }
  }

  // Adicionar círculo no último ponto
  detailedOutline.push(...createCircle(pathPoints[pathPoints.length - 1], brushRadius, 16));

  return detailedOutline;
}

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
        const brushRadius = brushSize / 2; // brushSize é o diâmetro em pixels, converter para raio normalizado
        // Nota: assumindo que brushRadius já está em coordenadas normalizadas (0-1)
        // Se estiver em pixels, seria necessário converter
        points = generateBrushOutline(path.points, brushRadius / 1000); // Normalizar para coordenadas 0-1
      } else {
        // Para freehand, usar pontos diretamente
        points = path.points;
      }

      // Fechar o polígono se necessário
      if (points.length > 0) {
        const first = points[0];
        const last = points[points.length - 1];
        if (first.x !== last.x || first.y !== last.y) {
          points = [...points, first];
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
