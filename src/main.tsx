import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { studies } from '#xuui-studies';
import { Studio } from './xuui/Studio';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Studio studies={studies} />
  </StrictMode>,
);
