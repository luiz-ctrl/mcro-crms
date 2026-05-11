import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import MCROAdminAI from './MCROAdminAI.jsx'; // ← 1. add this
import './Layout.css';

export default function Layout() {
  return (
    <div className="layout">
      <Sidebar />
      <main className="layout-main">
        <div className="layout-content">
          <Outlet />
        </div>
      </main>
      <MCROAdminAI /> {/* ← 2. add this */}
    </div>
  );
}