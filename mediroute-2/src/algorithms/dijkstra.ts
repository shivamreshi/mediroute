import type { AlgorithmStep, RoadNode, RoadSegment, RouteAlgorithm, RouteResult } from '../types/route';

interface QueueEntry {
  nodeId: string;
  priority: number;
}

class MinPriorityQueue {
  private heap: QueueEntry[] = [];

  push(entry: QueueEntry): void {
    this.heap.push(entry);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): QueueEntry | undefined {
    if (this.heap.length === 0) return undefined;
    const minimum = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return minimum;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.heap[parent].priority <= this.heap[index].priority) break;
      [this.heap[parent], this.heap[index]] = [this.heap[index], this.heap[parent]];
      index = parent;
    }
  }

  private bubbleDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;
      if (left < length && this.heap[left].priority < this.heap[smallest].priority) smallest = left;
      if (right < length && this.heap[right].priority < this.heap[smallest].priority) smallest = right;
      if (smallest === index) break;
      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }
}

interface SearchInputs {
  nodes: RoadNode[];
  roads: RoadSegment[];
  sourceId: string;
  targetId: string;
  closedRoadIds: Set<string>;
}

const labelFor = (nodes: RoadNode[], id: string) => nodes.find((node) => node.id === id)?.label ?? id;

function buildAdjacency({ nodes, roads, closedRoadIds }: SearchInputs) {
  const adjacency = new Map(nodes.map((node) => [node.id, [] as Array<{ nodeId: string; road: RoadSegment }>]));
  for (const road of roads) {
    if (closedRoadIds.has(road.id)) continue;
    adjacency.get(road.from)?.push({ nodeId: road.to, road });
    adjacency.get(road.to)?.push({ nodeId: road.from, road });
  }
  return adjacency;
}

function createResult(
  algorithm: RouteAlgorithm,
  nodes: RoadNode[],
  roads: RoadSegment[],
  pathNodeIds: string[],
  exploredNodeIds: string[],
  relaxations: number,
  steps: AlgorithmStep[],
  closedRoadIds: Set<string>,
): RouteResult {
  const pathEdgeIds: string[] = [];
  let distanceKm = 0;
  let etaMinutes = 0;
  for (let index = 0; index < pathNodeIds.length - 1; index += 1) {
    const from = pathNodeIds[index];
    const to = pathNodeIds[index + 1];
    const segment = roads
      .filter((road) => !closedRoadIds.has(road.id) && ((road.from === from && road.to === to) || (road.from === to && road.to === from)))
      .sort((a, b) => a.minutes - b.minutes)[0];
    if (segment) {
      pathEdgeIds.push(segment.id);
      distanceKm += segment.distanceKm;
      etaMinutes += segment.minutes;
    }
  }
  return { algorithm, pathNodeIds, pathEdgeIds, distanceKm, etaMinutes, exploredNodeIds, relaxations, steps };
}

function heuristic(node: RoadNode, goal: RoadNode): number {
  // Map coordinates are approximately 110 px per kilometre; 50 km/h is
  // deliberately faster than any modeled road, keeping this estimate admissible.
  return (Math.hypot(goal.x - node.x, goal.y - node.y) / 110 / 50) * 60;
}

function runFrontierSearch(inputs: SearchInputs, algorithm: 'dijkstra' | 'astar'): RouteResult {
  const { nodes, roads, sourceId, targetId, closedRoadIds } = inputs;
  const adjacency = buildAdjacency(inputs);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const goal = nodeById.get(targetId)!;
  const costs = new Map(nodes.map((node) => [node.id, Number.POSITIVE_INFINITY]));
  const previous = new Map<string, { nodeId: string; roadId: string }>();
  const settled = new Set<string>();
  const steps: AlgorithmStep[] = [];
  const queue = new MinPriorityQueue();
  let relaxations = 0;

  costs.set(sourceId, 0);
  queue.push({ nodeId: sourceId, priority: algorithm === 'astar' ? heuristic(nodeById.get(sourceId)!, goal) : 0 });

  while (true) {
    const entry = queue.pop();
    if (!entry) break;
    if (settled.has(entry.nodeId)) continue;

    const currentCost = costs.get(entry.nodeId) ?? Number.POSITIVE_INFINITY;
    const currentNode = nodeById.get(entry.nodeId)!;
    const estimatedTotal = currentCost + (algorithm === 'astar' ? heuristic(currentNode, goal) : 0);
    if (entry.priority > estimatedTotal + 1e-8) continue;

    settled.add(entry.nodeId);
    steps.push({
      activeNodeId: entry.nodeId,
      visitedNodeIds: [...settled],
      title: entry.nodeId === targetId ? `${labelFor(nodes, entry.nodeId)} reached` : `${labelFor(nodes, entry.nodeId)} selected`,
      description: entry.nodeId === targetId
        ? `The destination is settled at an estimated ${currentCost.toFixed(1)} minutes. The route is traced back through the best predecessor links.`
        : algorithm === 'astar'
          ? `A* expands this intersection using known travel time plus its straight-line lower-bound estimate toward the hospital.`
          : `Dijkstra settles the lowest known travel-time intersection, then tests each open neighboring road.`,
    });

    if (entry.nodeId === targetId) break;

    for (const { nodeId: neighborId, road } of adjacency.get(entry.nodeId) ?? []) {
      if (settled.has(neighborId)) continue;
      relaxations += 1;
      const candidate = currentCost + road.minutes;
      if (candidate < (costs.get(neighborId) ?? Number.POSITIVE_INFINITY)) {
        costs.set(neighborId, candidate);
        previous.set(neighborId, { nodeId: entry.nodeId, roadId: road.id });
        const estimate = algorithm === 'astar' ? heuristic(nodeById.get(neighborId)!, goal) : 0;
        queue.push({ nodeId: neighborId, priority: candidate + estimate });
      }
    }
  }

  const path: string[] = [];
  let current: string | undefined = targetId;
  if (sourceId === targetId) path.push(sourceId);
  else if (previous.has(targetId)) {
    while (current) {
      path.unshift(current);
      if (current === sourceId) break;
      current = previous.get(current)?.nodeId;
    }
    if (path[0] !== sourceId) path.length = 0;
  }

  return createResult(algorithm, nodes, roads, path, [...settled], relaxations, steps, closedRoadIds);
}

function runFloydWarshall(inputs: SearchInputs): RouteResult {
  const { nodes, roads, sourceId, targetId, closedRoadIds } = inputs;
  const indexById = new Map(nodes.map((node, index) => [node.id, index]));
  const distance = nodes.map((_, row) => nodes.map((__, column) => row === column ? 0 : Number.POSITIVE_INFINITY));
  const next = nodes.map((_, row) => nodes.map((__, column) => row === column ? column : -1));
  let relaxations = 0;

  for (const road of roads) {
    if (closedRoadIds.has(road.id)) continue;
    const from = indexById.get(road.from)!;
    const to = indexById.get(road.to)!;
    if (road.minutes < distance[from][to]) {
      distance[from][to] = road.minutes;
      distance[to][from] = road.minutes;
      next[from][to] = to;
      next[to][from] = from;
    }
  }

  const steps: AlgorithmStep[] = [];
  for (let pivot = 0; pivot < nodes.length; pivot += 1) {
    let improvements = 0;
    for (let from = 0; from < nodes.length; from += 1) {
      if (!Number.isFinite(distance[from][pivot])) continue;
      for (let to = 0; to < nodes.length; to += 1) {
        if (!Number.isFinite(distance[pivot][to])) continue;
        relaxations += 1;
        const candidate = distance[from][pivot] + distance[pivot][to];
        if (candidate < distance[from][to]) {
          distance[from][to] = candidate;
          next[from][to] = next[from][pivot];
          improvements += 1;
        }
      }
    }
    steps.push({
      activeNodeId: nodes[pivot].id,
      visitedNodeIds: nodes.slice(0, pivot + 1).map((node) => node.id),
      title: `Intermediate: ${nodes[pivot].label}`,
      description: improvements
        ? `Using ${nodes[pivot].label} as an intermediate intersection improved ${improvements} known origin-to-destination pair${improvements === 1 ? '' : 's'}.`
        : `Using ${nodes[pivot].label} as an intermediate intersection did not improve any known pair this pass.`,
    });
  }

  const source = indexById.get(sourceId)!;
  const target = indexById.get(targetId)!;
  const path: string[] = [];
  if (next[source][target] !== -1) {
    let cursor = source;
    path.push(nodes[cursor].id);
    let guard = 0;
    while (cursor !== target && guard < nodes.length) {
      cursor = next[cursor][target];
      if (cursor === -1) {
        path.length = 0;
        break;
      }
      path.push(nodes[cursor].id);
      guard += 1;
    }
  }

  return createResult('floyd-warshall', nodes, roads, path, nodes.map((node) => node.id), relaxations, steps, closedRoadIds);
}

export function computeAllRoutes(
  nodes: RoadNode[],
  roads: RoadSegment[],
  sourceId: string,
  targetId: string,
  closedRoadIds: Set<string>,
): Record<RouteAlgorithm, RouteResult> {
  const inputs = { nodes, roads, sourceId, targetId, closedRoadIds };
  return {
    dijkstra: runFrontierSearch(inputs, 'dijkstra'),
    astar: runFrontierSearch(inputs, 'astar'),
    'floyd-warshall': runFloydWarshall(inputs),
  };
}
