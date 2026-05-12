import { Outlet } from 'react-router-dom';
import Header from './Header.jsx';
import Sidebar from './Sidebar.jsx';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <Header />
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
