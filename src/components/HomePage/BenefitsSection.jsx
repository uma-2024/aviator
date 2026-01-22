import React from 'react';
import './BenefitsSection.css';

const BenefitsSection = ({ onSignUp }) => {
  const benefits = [
    {
      id: 0,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
        </svg>
      ),
      title: 'Unlock Full RTP Insights',
      description: 'Sed neque at pellentesque augue nisi at. Feugiat pellentesque enim.'
    },
    {
      id: 1,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v12M6 12h12"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      ),
      title: 'View the All-time Biggest Wins',
      description: 'Orci tellus fermentum fermentum elementum ac. Molestie amet.'
    },
    {
      id: 2,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="6" width="20" height="12" rx="2"/>
          <path d="M6 10h4M10 14h4"/>
        </svg>
      ),
      title: 'Participate in Pre-launch Game Tests',
      description: 'Ac quis luctus euismod curabitur nunc neque. Natoque cras lacus.'
    },
    {
      id: 3,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      ),
      title: 'Earn Rewards for Playing',
      description: 'Diam lectus elementum fames turpis risus dictumst. Scelerisque.'
    }
  ];

  return (
    <section className="benefits-section">
      <div className="benefits-container">
        {/* Left Side - Benefit Cards */}
        <div className="benefits-grid">
          {benefits.map((benefit) => (
            <div key={benefit.id} className="benefit-card">
              <div className="benefit-icon-container">
                <div className="benefit-icon">
                  {benefit.icon}
                </div>
              </div>
              <h3 className="benefit-title">{benefit.title}</h3>
              <p className="benefit-description">{benefit.description}</p>
            </div>
          ))}
        </div>

        {/* Right Side - Call to Action */}
        <div className="benefits-cta">
          <h2 className="benefits-title">BENEFITS OF<br />FAN BASE</h2>
          <p className="benefits-subtitle">
            Sign up to receive all the benefits of the platform.
          </p>
          <button className="signup-button" onClick={onSignUp}>
            SIGN UP
          </button>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;

