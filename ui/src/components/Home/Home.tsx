import React from 'react';
import './Home.css';

const Home: React.FC = () => {
  return (
    <div className="home">
      <div className="home-content">
        <h1>Welcome to Bouncer</h1>
        <p>Please use the Login button in the header to get started.</p>
      </div>
    </div>
  );
};

export default Home;
