import { Brain, Calendar, BarChart3, Zap, Target, Users } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Intelligent Spaced Repetition",
    description:
      "Our algorithm optimizes review timing based on your learning curve and memory retention patterns.",
  },
  {
    icon: Calendar,
    title: "Smart Study Scheduling",
    description:
      "Log your daily studies and receive personalized review schedules that adapt to your progress.",
  },
  {
    icon: Zap,
    title: "Lightning Fast Reviews",
    description:
      "Quick, focused review sessions designed to reinforce knowledge without overwhelming your schedule.",
  },
];

const FeaturesSection = () => {
  return (
    <section className=" px-6 bg-background-secondary mt-">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Everything You Need to
            <span className="bg-gradient-primary bg-clip-text"> Excel</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            RecallForge combines cutting-edge cognitive science with intuitive
            design to create the ultimate learning companion.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`group relative rounded-xl border border-zinc-700 bg-zinc-900/50 p-6 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_2px_rgba(168,85,247,0.3)] backdrop-blur-sm animate-slide-up cursor-pointer`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 rounded-md bg-[#605dff] text-white group-hover:animate-pulse">
                  <feature.icon className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-white group-hover:text-[#605dff] transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
