import { ArrowRight, Brain, Calendar, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
const HeroSection = () => {
  const navigate = useNavigate();
  const redirect = async () => {
    navigate("/auth");
  };
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      <div className="relative z-10 text-center max-w-4xl mx-auto  animate-slide-up">
        <div className="mb-4">
          <h1 className="text-6xl font-bold bg-gradient-primary bg-clip-text mb-4">
            Recall
            <span className="text-6xl font-bold bg-gradient-primary bg-clip-text mb-4 text-[#605dff]">
              Forge
            </span>
          </h1>

          <div className="w-24 h-1 bg-gradient-primary mx-auto rounded-full"></div>
        </div>

        <h2 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
          Master Any Subject with
          <span className="bg-gradient-primary bg-clip-text">
            {" "}
            Smart Repetition
          </span>
        </h2>

        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
          Transform your study routine with Active Recall & Spaced Repetition.
          Log your daily studies and let RecallForge intelligently schedule
          review sessions to maximize retention.
        </p>

        <div className="space-y-4">
          <button
            variant="hero"
            size="lg"
            className="btn btn-primary text-lg px-8 py-4 h-auto"
            onClick={redirect}
          >
            Get Started Free
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
