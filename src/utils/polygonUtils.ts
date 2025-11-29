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
    // Apenas um ponto: retorna um círculo completo
    return createCircle(pathPoints[0], brushRadius, 32);
  }

  const outline: Point[] = [];

  // Adicionar semicírculo inicial
  const firstPoint = pathPoints[0];
  const secondPoint = pathPoints[1];
  const firstDx = secondPoint.x - firstPoint.x;
  const firstDy = secondPoint.y - firstPoint.y;
  const firstAngle = Math.atan2(firstDy, firstDx);

  // Semicírculo inicial (20 segmentos para suavidade)
  for (let i = 0; i <= 20; i++) {
    const angle = firstAngle + Math.PI / 2 + (i / 20) * Math.PI;
    outline.push({
      x: firstPoint.x + brushRadius * Math.cos(angle),
      y: firstPoint.y + brushRadius * Math.sin(angle),
    });
  }

  // Processar cada segmento do path
  for (let i = 0; i < pathPoints.length - 1; i++) {
    const p1 = pathPoints[i];
    const p2 = pathPoints[i + 1];

    // Vetor direção atual
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) continue;

    // Vetor perpendicular (aponta para a esquerda)
    const perpX = -dy / len;
    const perpY = dx / len;

    // Ponto no lado esquerdo de p2
    const leftP2 = {
      x: p2.x + perpX * brushRadius,
      y: p2.y + perpY * brushRadius,
    };

    outline.push(leftP2);

    // Se não é o último segmento, adicionar arco de transição no canto
    if (i < pathPoints.length - 2) {
      const p3 = pathPoints[i + 2];
      const nextDx = p3.x - p2.x;
      const nextDy = p3.y - p2.y;
      const nextLen = Math.sqrt(nextDx * nextDx + nextDy * nextDy);

      if (nextLen > 0) {
        // Calcular ângulo de mudança de direção
        const currentAngle = Math.atan2(dy, dx);
        const nextAngle = Math.atan2(nextDy, nextDx);
        let angleDiff = nextAngle - currentAngle;

        // Normalizar para -π a π
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        // Se há mudança de direção significativa (>10°), adicionar arco
        if (Math.abs(angleDiff) > 0.174) { // ~10 graus
          const arcSegments = Math.ceil(Math.abs(angleDiff) / (Math.PI / 20));
          for (let j = 1; j <= arcSegments; j++) {
            const t = j / (arcSegments + 1);
            const arcAngle = currentAngle + Math.PI / 2 + t * angleDiff;
            outline.push({
              x: p2.x + brushRadius * Math.cos(arcAngle),
              y: p2.y + brushRadius * Math.sin(arcAngle),
            });
          }
        }
      }
    }
  }

  // Adicionar semicírculo final
  const lastPoint = pathPoints[pathPoints.length - 1];
  const secondLastPoint = pathPoints[pathPoints.length - 2];
  const lastDx = lastPoint.x - secondLastPoint.x;
  const lastDy = lastPoint.y - secondLastPoint.y;
  const lastAngle = Math.atan2(lastDy, lastDx);

  // Semicírculo final (20 segmentos)
  for (let i = 0; i <= 20; i++) {
    const angle = lastAngle - Math.PI / 2 + (i / 20) * Math.PI;
    outline.push({
      x: lastPoint.x + brushRadius * Math.cos(angle),
      y: lastPoint.y + brushRadius * Math.sin(angle),
    });
  }

  // Lado direito em ordem reversa
  for (let i = pathPoints.length - 1; i >= 0; i--) {
    const point = pathPoints[i];

    let dx, dy, len;
    if (i > 0) {
      dx = point.x - pathPoints[i - 1].x;
      dy = point.y - pathPoints[i - 1].y;
    } else {
      dx = pathPoints[1].x - point.x;
      dy = pathPoints[1].y - point.y;
    }

    len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) continue;

    const perpX = -dy / len;
    const perpY = dx / len;

    const rightP = {
      x: point.x - perpX * brushRadius,
      y: point.y - perpY * brushRadius,
    };

    outline.push(rightP);

    // Adicionar arco de transição no lado direito
    if (i > 0 && i < pathPoints.length - 1) {
      const prevPoint = pathPoints[i - 1];
      const nextPoint = pathPoints[i + 1];

      const prevDx = point.x - prevPoint.x;
      const prevDy = point.y - prevPoint.y;
      const nextDx = nextPoint.x - point.x;
      const nextDy = nextPoint.y - point.y;

      const prevAngle = Math.atan2(prevDy, prevDx);
      const nextAngle = Math.atan2(nextDy, nextDx);

      let angleDiff = nextAngle - prevAngle;
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

      if (Math.abs(angleDiff) > 0.174) {
        const arcSegments = Math.ceil(Math.abs(angleDiff) / (Math.PI / 20));
        for (let j = 1; j <= arcSegments; j++) {
          const t = j / (arcSegments + 1);
          const arcAngle = prevAngle - Math.PI / 2 - t * angleDiff;
          outline.push({
            x: point.x + brushRadius * Math.cos(arcAngle),
            y: point.y + brushRadius * Math.sin(arcAngle),
          });
        }
      }
    }
  }

  return outline;
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
