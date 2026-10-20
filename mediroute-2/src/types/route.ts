export type RouteAlgorithm = 'dijkstra' | 'astar' | 'floyd-warshall';

export interface RoadNode {
  id: string;
  label: string;
  x: number;
  y: number;
  district: string;
}

export interface RoadSegment {
  id: string;
  from: string;
  to: string;
  street: string;
  distanceKm: number;
  minutes: number;
  kind: 'arterial' | 'local' | 'connector';
}

export interface AmbulanceUnit {
  id: string;
  callSign: string;
  name: string;
  locationNodeId: string;
  status: 'Available' | 'En route' | 'Standby';
  accent: 'teal' | 'blue' | 'amber';
}

export interface HospitalDestination {
  id: string;
  name: string;
  locationNodeId: string;
  traumaLevel: string;
}

export interface RoadClosure {
  edgeId: string;
  street: string;
  segment: string;
}

export interface AlgorithmStep {
  activeNodeId: string;
  visitedNodeIds: string[];
  title: string;
  description: string;
}

export interface RouteResult {
  algorithm: RouteAlgorithm;
  pathNodeIds: string[];
  pathEdgeIds: string[];
  distanceKm: number;
  etaMinutes: number;
  exploredNodeIds: string[];
  relaxations: number;
  steps: AlgorithmStep[];
}
