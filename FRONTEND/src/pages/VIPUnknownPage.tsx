import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DateBasedContentGrid from '../components/ui/DateBasedContentGrid';
import AgeVerificationModal from '../components/ui/AgeVerificationModal';
import { useState } from 'react';
import { ageVerificationApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Crown, Lock } from 'lucide-react';
import Button from '../components/ui/Button';

const VIPUnknownPage: React.FC = () => {
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const { user } = useAuthStore();
  const navigate = useNavigate();

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

  // Check if user has premium access
  if (!user?.isPremium && !user?.isAdmin) {
    return (
      <main className="pt-20 min-h-screen bg-dark-300 flex items-center justify-center">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto bg-dark-200 rounded-2xl p-8 text-center shadow-xl">
            <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock size={32} className="text-yellow-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">
              Premium Access Required
            </h1>
            <p className="text-gray-300 mb-6">
              This VIP content is exclusively available to premium members.
            </p>
            <div className="space-y-3">
              <Button
                variant="primary"
                fullWidth
                onClick={() => navigate('/premium')}
              >
                <Crown size={16} className="mr-2" />
                Upgrade to Premium
              </Button>
              <Button
                variant="outline"
                fullWidth
                onClick={() => navigate('/')}
              >
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

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
              <div className="flex items-center justify-center mb-6">
                <Crown className="w-12 h-12 text-yellow-500 mr-4" />
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white animate-fade-in">
                  <span className="text-yellow-500">VIP</span> <span className="text-gray-500">Unknown</span> Content
                </h1>
              </div>
              <p className="text-xl md:text-2xl text-gray-300 mb-8 animate-fade-in-up">
                Exclusive premium mysterious and rare content
              </p>
              <div className="inline-flex items-center px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/30">
                <Crown size={16} className="mr-2" />
                <span className="font-medium">Premium Exclusive</span>
              </div>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <DateBasedContentGrid 
              showCategoryFilter={true}
            />
          </div>
        </section>
      </main>
    </>
  );
};

export default VIPUnknownPage;