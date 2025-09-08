import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CTASection = () => {
  const navigate = useNavigate();
  const redirect = async () => {
    navigate("/auth");
  };
  return (
    <section className="py-20 px-6 bg-gradient-secondary relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-primary rounded-full blur-3xl animate-glow"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-primary rounded-full blur-3xl animate-float"></div>
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className="mb-8">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
            Ready to Transform Your
            <span className="bg-gradient-primary bg-clip-text"> Learning?</span>
          </h2>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of students who are already studying smarter, not
            harder. Start your journey to academic excellence today.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <button
            variant="hero"
            size="lg"
            className="btn btn-primary text-lg px-8 py-4 h-auto min-w-[200px]"
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

export default CTASection;
