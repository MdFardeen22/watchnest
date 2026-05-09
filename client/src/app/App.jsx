import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { appRoutes } from './routes.jsx';
import { SocketProvider } from '../contexts/socket.context.jsx';
import { ThemeProvider } from '../contexts/theme.context.jsx';

const router = createBrowserRouter(appRoutes);

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
      <span className="text-sm font-medium uppercase tracking-[0.22em]">
        Loading WatchNest
      </span>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SocketProvider>
        <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 antialiased transition-colors duration-300">
          <RouterProvider router={router} fallbackElement={<RouteFallback />} />
        </div>
      </SocketProvider>
    </ThemeProvider>
  );
}
