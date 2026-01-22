import React, { useState } from 'react';
import './FeaturesSection.css';

const FeaturesSection = () => {
  const [expandedFeature, setExpandedFeature] = useState(0);

  const features = [
    {
      id: 0,
      title: 'Auto Cash-out mode',
      description: 'Players can set up the Auto Cash-out feature in the game settings by choosing the exact multiplier for when they need to leave the rocket.'
    },
    {
      id: 1,
      title: 'Autoplay mode',
      description: 'Enable autoplay to automatically place bets and cash out at your specified multiplier. Set it and let the game run automatically for multiple rounds.'
    },
    {
      id: 2,
      title: 'Multiple bets',
      description: 'Place multiple bets simultaneously with different multipliers. Each bet can have its own cash-out point, maximizing your winning potential.'
    },
    {
      id: 3,
      title: 'Easy gameplay',
      description: 'Simple and intuitive controls make Space XY accessible to all players. Just place your bet, watch the rocket, and cash out at the right moment.'
    }
  ];

  const toggleFeature = (id) => {
    setExpandedFeature(expandedFeature === id ? null : id);
  };

  return (
    <section className="features-section">
      <div className="features-container">
        {/* Left Side - Features List */}
        <div className="features-list">
          <h2 className="features-title">FEATURES</h2>
          <div className="features-items">
            {features.map((feature) => (
              <div
                key={feature.id}
                className={`feature-item ${expandedFeature === feature.id ? 'expanded' : ''}`}
              >
                <div
                  className="feature-header"
                  onClick={() => toggleFeature(feature.id)}
                >
                  <div className="feature-icon">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className={`icon-arrow ${expandedFeature === feature.id ? 'rotated' : ''}`}
                    >
                      <path
                        d="M4 6L8 10L12 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <span className="feature-title">{feature.title}</span>
                </div>
                {expandedFeature === feature.id && (
                  <div className="feature-description">
                    {feature.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Video */}
        <div className="features-video">
          <div className="video-container">
            <iframe
              src="https://www.youtube.com/embed/dQw4w9WgXcQ"
              title="Space XY Gameplay"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="video-iframe"
            ></iframe>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

