import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import AuthorDashboard from './AuthorDashboard';

createRoot(document.getElementById('root')!).render(<StrictMode><AuthorDashboard /></StrictMode>);
