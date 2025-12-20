import { Game } from "@/components/Game";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 overflow-hidden">
      {/* Background grid effect */}
      <div 
        className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
      
      {/* Title */}
      <h1 className="font-display text-5xl md:text-6xl text-primary neon-text mb-2 tracking-wider text-center">
        NEON RUN
      </h1>
      <p className="text-muted-foreground mb-8 text-center">
        One button. Infinite attempts. How far can you go?
      </p>

      {/* Game */}
      <Game />

      {/* Footer */}
      <div className="mt-8 text-center text-muted-foreground text-sm">
        <p>Jump over <span className="text-secondary">obstacles</span> • Speed increases every 10s</p>
      </div>
    </div>
  );
};

export default Index;
