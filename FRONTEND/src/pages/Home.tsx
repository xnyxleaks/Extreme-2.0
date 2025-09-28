import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DateBasedContentGrid from '../components/ui/DateBasedContentGrid';
import AgeVerificationModal from '../components/ui/AgeVerificationModal';
import { ageVerificationApi } from '../services/api';
import { 
  Flame, 
  User
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const Home: React.FC = () => {
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
      
      <main>
        {/* Hero Section */}
        <section className="relative pt-20 lg:pt-28 pb-16 lg:pb-24">
          <div className="absolute inset-0 bg-gradient-to-br from-dark-400 via-dark-300 to-dark-400 z-[-1]"></div>
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-white animate-fade-in">
                Latest <span className="text-primary-500">Content</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 mb-8 animate-fade-in-up">
                Discover the latest exclusive content from premium models
              </p>
              
              {/* Quick Navigation */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up delay-200">
                <Link
                  to="/models"
                  className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center"
                >
                  <User size={18} className="mr-2" />
                  Browse Models
                </Link>
                <Link
                  to="/premium"
                  className="px-6 py-3 bg-dark-200 hover:bg-dark-100 text-gray-300 font-medium rounded-lg transition-all duration-200 border border-dark-100"
                >
                  Go Premium
                </Link>
              </div>
              
              {/* Category Quick Links */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 max-w-4xl mx-auto">
                <Link to="/asian" className="bg-dark-200/50 hover:bg-dark-200 border border-dark-100 rounded-xl p-4 text-center transition-all duration-200 hover:scale-105">
                  <span className="text-2xl mb-2 block">🏮</span>
                  <span className="text-white font-medium">Asian</span>
                </Link>
                <Link to="/western" className="bg-dark-200/50 hover:bg-dark-200 border border-dark-100 rounded-xl p-4 text-center transition-all duration-200 hover:scale-105">
                  <span className="text-2xl mb-2 block">❄️</span>
                  <span className="text-white font-medium">Western</span>
                </Link>
                <Link to="/banned" className="bg-dark-200/50 hover:bg-dark-200 border border-dark-100 rounded-xl p-4 text-center transition-all duration-200 hover:scale-105">
                  <span className="text-2xl mb-2 block">🚫</span>
                  <span className="text-white font-medium">Banned</span>
                </Link>
                <Link to="/unknown" className="bg-dark-200/50 hover:bg-dark-200 border border-dark-100 rounded-xl p-4 text-center transition-all duration-200 hover:scale-105">
                  <span className="text-2xl mb-2 block">❓</span>
                  <span className="text-white font-medium">Unknown</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Content Grid */}
        <section className="py-12 bg-dark-300">
          <div className="container mx-auto px-4">
            <DateBasedContentGrid showCategoryFilter={true} />
          </div>
        </section>
      </main>
    </>
  );
};

export default Home;