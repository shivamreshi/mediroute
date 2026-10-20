import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MediRoute — Emergency Route Optimization',
  description: 'An interactive ambulance routing and shortest-path algorithm studio. Explore Dijkstra, A*, Floyd–Warshall, road closures, and DAA metrics on a simulated city network.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
