import type { AmbulanceUnit, HospitalDestination, RoadClosure, RoadNode, RoadSegment } from '../types/route';

const nodeRows: Array<Array<[string, number, number, string]>> = [
  [['j1', 105, 98, 'North Pier'], ['j2', 300, 108, 'Pier Avenue'], ['j3', 500, 94, 'Museum Quarter'], ['j4', 705, 106, 'North Point'], ['j5', 908, 95, 'Harbor Gate']],
  [['j6', 96, 252, 'West Market'], ['j7', 295, 245, 'Old Town'], ['j8', 500, 259, 'Union Square'], ['j9', 710, 243, 'East Market'], ['j10', 914, 254, 'River East']],
  [['j11', 105, 410, 'Civic West'], ['j12', 302, 401, 'Civic Center'], ['j13', 500, 416, 'Central Station'], ['j14', 710, 398, 'Canal District'], ['j15', 906, 414, 'Riverfront']],
  [['j16', 93, 565, 'South Wharf'], ['j17', 300, 552, 'South Market'], ['j18', 502, 568, 'Foundry Row'], ['j19', 706, 551, 'Harbor South'], ['j20', 910, 568, 'East Dock']],
];

export const CITY_NODES: RoadNode[] = nodeRows.flatMap((row, rowIndex) =>
  row.map(([id, x, y, label], columnIndex) => ({
    id,
    x,
    y,
    label,
    district: rowIndex < 1 ? 'North District' : columnIndex > 3 ? 'Riverside' : rowIndex > 2 ? 'South District' : 'Central District',
  })),
);

const nodeById = new Map(CITY_NODES.map((node) => [node.id, node]));
const roadIdCounts = new Map<string, number>();

function road(from: string, to: string, street: string, kind: RoadSegment['kind'], speedKmh: number): RoadSegment {
  const a = nodeById.get(from)!;
  const b = nodeById.get(to)!;
  const distanceKm = Math.hypot(b.x - a.x, b.y - a.y) / 110;
  const [first, second] = from < to ? [from, to] : [to, from];
  const pairId = `${first}-${second}`;
  const occurrence = roadIdCounts.get(pairId) ?? 0;
  roadIdCounts.set(pairId, occurrence + 1);
  const streetSlug = street.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const id = occurrence === 0 ? pairId : `${pairId}-${streetSlug}-${occurrence + 1}`;
  return { id, from, to, street, distanceKm, minutes: (distanceKm / speedKmh) * 60, kind };
}

const rowRoadNames = ['North Shore Road', 'Pier Avenue', 'Union Boulevard', 'South Quay'];
const columnRoadNames = ['Harbor Way', 'West Market Street', 'Central Avenue', 'Canal Street', 'Riverside Drive'];
export const CITY_ROADS: RoadSegment[] = [];

nodeRows.forEach((row, rowIndex) => {
  for (let column = 0; column < row.length - 1; column += 1) {
    const kind = rowIndex === 1 || rowIndex === 2 ? 'arterial' : 'local';
    CITY_ROADS.push(road(row[column][0], row[column + 1][0], rowRoadNames[rowIndex], kind, 31 + ((rowIndex * 7 + column * 3) % 11)));
  }
});

for (let row = 0; row < nodeRows.length - 1; row += 1) {
  for (let column = 0; column < nodeRows[row].length; column += 1) {
    const kind = column === 2 ? 'arterial' : 'local';
    CITY_ROADS.push(road(nodeRows[row][column][0], nodeRows[row + 1][column][0], columnRoadNames[column], kind, 29 + ((row * 5 + column * 4) % 12)));
  }
}

// Diagonal connectors model short, signal-controlled links between city corridors.
[
  ['j2', 'j7', 'Dock Link'], ['j4', 'j9', 'North Canal Link'], ['j7', 'j13', 'Civic Connector'],
  ['j8', 'j14', 'Union Connector'], ['j12', 'j18', 'Foundry Link'], ['j14', 'j20', 'East Dock Link'],
].forEach(([from, to, street], index) => {
  CITY_ROADS.push(road(from, to, street, 'connector', 35 + (index % 5)));
});

export const AMBULANCE_UNITS: AmbulanceUnit[] = [
  { id: 'unit-12', callSign: 'MED-12', name: 'Northside Unit', locationNodeId: 'j7', status: 'Available', accent: 'teal' },
  { id: 'unit-04', callSign: 'MED-04', name: 'Central Unit', locationNodeId: 'j13', status: 'Available', accent: 'blue' },
  { id: 'unit-09', callSign: 'MED-09', name: 'Harbor Unit', locationNodeId: 'j18', status: 'Standby', accent: 'amber' },
];

export const HOSPITALS: HospitalDestination[] = [
  { id: 'st-marys', name: "St. Mary's Medical Center", locationNodeId: 'j5', traumaLevel: 'Level II trauma' },
  { id: 'city-general', name: 'Central General Hospital', locationNodeId: 'j13', traumaLevel: 'Level I trauma' },
  { id: 'harbor-trauma', name: 'Harbor Trauma Centre', locationNodeId: 'j20', traumaLevel: 'Level I trauma' },
];

export const ROAD_CLOSURES: RoadClosure[] = [
  { edgeId: 'j8-j9', street: 'Union Boulevard', segment: 'Union Square → East Market' },
  { edgeId: 'j13-j18', street: 'Central Avenue', segment: 'Central Station → Foundry Row' },
];

export const DEFAULT_CLOSED_ROADS = ROAD_CLOSURES.map((closure) => closure.edgeId);
