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
 * Cria um polígono contínuo que representa a área pintada pela brush
 * @param pathPoints Pontos do caminho da brush
 * @param brushRadius Raio da brush (em coordenadas normalizadas)
 * @returns Pontos formando o contorno da brush (polígono fechado)
 */
export function generateBrushOutline(pathPoints: Point[], brushRadius: number): Point[] {
  if (pathPoints.length === 0) return [];

  if (pathPoints.length === 1) {
    // Apenas um ponto: retorna um círculo
    return createCircle(pathPoints[0], brushRadius);
  }

  // Para múltiplos pontos, criar contorno como stroke com espessura
  const leftSide: Point[] = [];
  const rightSide: Point[] = [];

  // Processar cada segmento do path
  for (let i = 0; i < pathPoints.length - 1; i++) {
    const p1 = pathPoints[i];
    const p2 = pathPoints[i + 1];

    // Vetor direção
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) continue;

    // Vetor perpendicular normalizado (aponta para a esquerda)
    const perpX = -dy / len;
    const perpY = dx / len;

    // Pontos offset
    const leftP1 = { x: p1.x + perpX * brushRadius, y: p1.y + perpY * brushRadius };
    const rightP1 = { x: p1.x - perpX * brushRadius, y: p1.y - perpY * brushRadius };
    const leftP2 = { x: p2.x + perpX * brushRadius, y: p2.y + perpY * brushRadius };
    const rightP2 = { x: p2.x - perpX * brushRadius, y: p2.y - perpY * brushRadius };

    // Adicionar pontos aos lados
    if (i === 0) {
      // Primeiro segmento: adicionar semicírculo inicial
      const startCircle: Point[] = [];
      for (let j = 0; j <= 8; j++) {
        const angle = Math.PI / 2 + (j / 8) * Math.PI; // π/2 a 3π/2 (semicírculo esquerdo)
        startCircle.push({
          x: p1.x + brushRadius * Math.cos(angle),
          y: p1.y + brushRadius * Math.sin(angle),
        });
      }
      leftSide.push(...startCircle);
    } else {
      leftSide.push(leftP1);
    }

    leftSide.push(leftP2);
    rightSide.unshift(rightP2); // Adicionar no início para ordem reversa
    if (i === 0) {
      rightSide.unshift(rightP1);
    }
  }

  // Adicionar semicírculo final
  const lastPoint = pathPoints[pathPoints.length - 1];
  const secondLastPoint = pathPoints[pathPoints.length - 2];
  const dx = lastPoint.x - secondLastPoint.x;
  const dy = lastPoint.y - secondLastPoint.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len > 0) {
    const angle0 = Math.atan2(dy, dx);
    const endCircle: Point[] = [];
    for (let j = 0; j <= 8; j++) {
      const angle = angle0 - Math.PI / 2 + (j / 8) * Math.PI; // Semicírculo direito
      endCircle.push({
        x: lastPoint.x + brushRadius * Math.cos(angle),
        y: lastPoint.y + brushRadius * Math.sin(angle),
      });
    }
    leftSide.push(...endCircle);
  }

  // Combinar lado esquerdo + lado direito (reverso)
  return [...leftSide, ...rightSide];
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
