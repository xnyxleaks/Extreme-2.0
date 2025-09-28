import React, { useEffect } from 'react';
import DateBasedContentGrid from '../components/ui/DateBasedContentGrid';
import AgeVerificationModal from '../components/ui/AgeVerificationModal';
import { useState } from 'react';
import { ageVerificationApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

const AsianPage: React.FC = () => {
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    window.scrollTo(0, 0);
    checkAgeVerification();
  }, []);

  const checkAgeVerification = async () => {
    const ageConfirmed = sessionStorage.getItem('ageConfirmed');
    if (ageConfirmed !== 'true') {
      try {
        const status = await ageVerificationApi.getStatus();
        if (!status.ageConfirmed) {
          setShowAgeVerification(true);
          return;
        }
      } catch (error) {
        setShowAgeVerification(true);
        return;
      }
    }
  };

  const handleAgeVerificationConfirm = () => {
    setShowAgeVerification(false);
  };

  const handleAgeVerificationExit = () => {
    window.location.href = 'https://www.google.com';
  };

  return (
    <>
      <AgeVerificationModal
        isOpen={showAgeVerification}
        onConfirm={handleAgeVerificationConfirm}
        onExit={handleAgeVerificationExit}
      />
      
      <main className="pt-20 min-h-screen bg-dark-300">
        {/* Hero Section */}
        <section className="relative py-16 lg:py-24">
          <div className="absolute inset-0 bg-gradient-to-br from-dark-400 via-dark-300 to-dark-400 z-[-1]"></div>
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-white animate-fade-in">
                <span className="text-primary-500">Asian</span> Models
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 mb-8 animate-fade-in-up">
                Discover exclusive content from beautiful Asian models
              </p>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <DateBasedContentGrid 
              ethnicity="asian"
              showCategoryFilter={true}
            />
          </div>
        </section>
      </main>
    </>
  );
};

export default AsianPage;