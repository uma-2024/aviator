import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Add this import
import './HomePage.css';
import HomeHeader from './HomeHeader';
import GameDetails from '../GameDetails/GameDetails';
import FeaturesSection from './FeaturesSection';
import FAQSection from './FAQSection';
import BenefitsSection from './BenefitsSection';
import Footer from './Footer';
import spaceXYImage from '../../Assets/backImage.webp';
import image1 from '../../Assets/image1.webp';
import image2 from '../../Assets/image2.webp';
import image3 from '../../Assets/image3.webp';
import smallImage from '../../Assets/smallimage.webp';
const HomePage = ({ onSignUp }) => {
  const [selectedImage, setSelectedImage] = useState(0);
  const navigate = useNavigate(); // Use navigate hook to navigate to another route
  
  const screenshots = [
    { id: 0, src: image1, alt: 'Screenshot 1' },
    { id: 1, src: image2, alt: 'Screenshot 2' },
    { id: 2, src: image3, alt: 'Screenshot 3' }
  ];

  const handleDemoPlay = () => {
    navigate('/game'); // Navigate to the /game route when Demo Play is clicked
    console.log('Demo Play started!');
  };

  return (
    <div className="homepage">
      <HomeHeader />
      
      {/* Main Content Area */}
      <div className="homepage-content">
        <img
          src={spaceXYImage}
          alt="Rocket"
          loading="lazy"
          className="hero-section-img"
        />
        <img src={smallImage} alt="Robote" className="small-image" />
      </div>

      {/* Social Media Icons */}
      <div className="social-icons">
        {/* Social media icons */}
      </div>

      <GameDetails 
        onDemoPlay={handleDemoPlay} // Pass handleDemoPlay to GameDetails
        onTrailer={() => {
          // Handle trailer click
          console.log('Trailer clicked');
        }}
      />
      
      {/* Screenshots Section */}
      <section className="screenshots-section">
        <h2 className="screenshots-title">SCREENSHOTS</h2>
        {/* Main Screenshot */}
        <div className="main-screenshot">
          <img
            src={screenshots[selectedImage].src}
            alt={screenshots[selectedImage].alt}
            className="main-screenshot-img"
          />
        </div>
        {/* Thumbnail Screenshots */}
        <div className="screenshots-thumbnails">
          {screenshots.map((screenshot, index) => (
            <div
              key={screenshot.id}
              className={`thumbnail-container ${selectedImage === index ? 'active' : ''}`}
              onClick={() => setSelectedImage(index)}
            >
              <img
                src={screenshot.src}
                alt={screenshot.alt}
                className="thumbnail-img"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <FeaturesSection />

      {/* FAQ Section */}
      <FAQSection />

      {/* Benefits Section */}
      <BenefitsSection onSignUp={onSignUp} />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default HomePage;
