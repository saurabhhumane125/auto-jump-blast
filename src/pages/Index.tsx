import { Game } from "@/components/Game";

const Index = () => {
  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center bg-background p-2 md:p-4 overflow-hidden pb-24 md:pb-4">
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
      <h1 className="font-display text-3xl md:text-6xl text-primary neon-text mb-1 md:mb-2 tracking-wider text-center">
        NEON RUN
      </h1>
      <p className="text-muted-foreground mb-4 md:mb-8 text-center text-xs md:text-base">
        One button. Infinite attempts. How far can you go?
      </p>

      {/* Game */}
      <Game />

      {/* Footer - hidden on mobile to make room for jump button */}
      <div className="mt-4 md:mt-8 text-center text-muted-foreground text-xs md:text-sm hidden md:block">
        <p>Jump over <span className="text-secondary">obstacles</span> • Speed increases every 10s</p>
      </div>
    </div>
  );
};

export default Index;
