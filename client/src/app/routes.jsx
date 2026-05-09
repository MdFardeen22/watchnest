import { lazy } from 'react';

// eslint-disable-next-line react-refresh/only-export-components
const HomePage = lazy(() => import('../pages/HomePage.jsx'));
// eslint-disable-next-line react-refresh/only-export-components
const RoomPage = lazy(() => import('../pages/RoomPage.jsx'));
// eslint-disable-next-line react-refresh/only-export-components
const NotFoundPage = lazy(() => import('../pages/NotFoundPage.jsx'));

export const appRoutes = [
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/room/:roomCode',
    element: <RoomPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
];
