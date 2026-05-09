import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { appRoutes } from './routes.jsx';
import { SocketProvider } from '../contexts/socket.context.jsx';

const router = createBrowserRouter(appRoutes);

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
      <span className="text-sm font-medium uppercase tracking-[0.22em]">
        Loading WatchNest
      </span>
    </div>
  );
}

export default function App() {
  return (
    <SocketProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <RouterProvider router={router} fallbackElement={<RouteFallback />} />
      </div>
    </SocketProvider>
  );
}
