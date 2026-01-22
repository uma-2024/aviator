import React, { useState } from 'react';
import './FAQSection.css';

const FAQSection = () => {
  const [expandedFAQ, setExpandedFAQ] = useState(null);

  const faqs = [
    {
      id: 0,
      question: 'Is it safe to play Space XY online?',
      answer: 'Yes, Space XY is completely safe to play online. The game uses advanced encryption technology to protect your personal and financial information. All transactions are secure, and the game is regularly audited for fairness and security compliance.'
    },
    {
      id: 1,
      question: 'Can I play Space XY on my mobile device?',
      answer: 'Absolutely! Space XY is fully responsive and optimized for mobile devices. You can enjoy the game on smartphones and tablets running iOS, Android, or any modern mobile browser. The game adapts seamlessly to different screen sizes.'
    },
    {
      id: 2,
      question: 'What is the biggest win available in Space XY?',
      answer: 'The maximum win in Space XY can reach up to €250,000 with a maximum multiplier of x10,000. However, actual winnings depend on your bet amount and the multiplier at which you cash out. Always remember to play responsibly and within your limits.'
    }
  ];

  const toggleFAQ = (id) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  return (
    <section className="faq-section">
      <h2 className="faq-title">FAQ</h2>
      
      <div className="faq-container">
        <div className="faq-items">
          {faqs.map((faq) => (
            <div
              key={faq.id}
              className={`faq-item ${expandedFAQ === faq.id ? 'expanded' : ''}`}
            >
              <div
                className="faq-question"
                onClick={() => toggleFAQ(faq.id)}
              >
                <span className="faq-question-text">{faq.question}</span>
                <div className="faq-icon">
                  <span className={`icon-plus ${expandedFAQ === faq.id ? 'rotated' : ''}`}>+</span>
                </div>
              </div>
              {expandedFAQ === faq.id && (
                <div className="faq-answer">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;

