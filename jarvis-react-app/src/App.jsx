import React from 'react';
import JarvisHome from './components/JarvisHome';
import './index.css';

function App() {
  return (
    <div className="app-container">
      {/* 
        Import and mount the JarvisHome component here.
        By placing it at the root of our App, it acts as the main landing page.
      */}
      <JarvisHome />
    </div>
  );
}

export default App;
