# MediRoute outcomes

- [x] **City network and emergency entities** — Present a city road network with roads/intersections, ambulance locations, and hospitals; support ambulance and destination-hospital selection for emergency routing scenarios.
- [x] **Closure-aware route recommendations** — Visualize road closures and exclude affected road segments from route calculations; display the recommended shortest route with travel distance and estimated arrival time.
- [x] **Three route algorithms and walkthrough** — Offer Dijkstra, A*, and Floyd–Warshall; show an algorithm’s explored nodes and route progression step by step; provide an explanation of each method’s approach, complexity, strengths, and limitations.
- [x] **DAA comparison and scenario controls** — Compare algorithms side-by-side by travel distance, estimated time, and number of nodes explored; provide reset and rerun controls so algorithms can be compared under the same network conditions.
- [x] **Algorithm strategy interaction** — Selecting Dijkstra, A*, or Floyd–Warshall from the route picker, comparison table, or strategy card activates that algorithm’s route result and trace; selecting anywhere on a comparison row should work; “Re-run all three” recomputes the three routes for the current ambulance, hospital, and road closures.
- [x] **Repository and technology continuity** — Use https://github.com/Harshit000-byte/vascularbot.git as the implementation starting point while preserving its requested technology choices (Next.js and TypeScript).
- [x] **Static publication build** — Provide a self-contained locked-dependency install and build command; configure Next.js static export so the configured `out` directory exists and contains `index.html` for publication.
