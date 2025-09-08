import HeroSection from "../components/landing/HeroSection.jsx";
import FeaturesSection from "../components/landing/FeaturesSection.jsx";
import CTASection from "../components/landing/CTASection.jsx";
import Footer from "../components/landing/Footer.jsx";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeroSection />
      <FeaturesSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default LandingPage;
