const fs = require('fs');

let content = fs.readFileSync('c:/Users/Samarth Deshpande/Desktop/Sam_N/Love/client/app/cinema/page.tsx', 'utf8');

// 1. Remove FloatingParticle interface
content = content.replace(/interface FloatingParticle \{\s*id: string;\s*emoji: string;\s*left: number;\s*delay\?: number;\s*\}\n\n/, '');

// 2. Replace state with refs
content = content.replace(/const \[floatingParticles, setFloatingParticles\] = useState<FloatingParticle\[\]>\(\[\]\);/, `const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<{emoji:string, x:number, y:number, opacity:number, vy:number, scale:number}[]>([]);
  const animationFrameRef = useRef<number>();`);

// 3. Replace triggerReaction and triggerPopcornFight
const triggerRegex = /\/\/ Reaction Animation Generators\s*const triggerReaction = \([\s\S]*?timeoutsRef\.current\.push\(t\);\s*\};\s*const triggerPopcornFight = \(\) => \{[\s\S]*?timeoutsRef\.current\.push\(t\);\s*\};/;

const newTriggers = `// Reaction Animation Generators
  const triggerReaction = useCallback((emoji: string, count = 1) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    }
    
    for (let i = 0; i < count; i++) {
      if (particlesRef.current.length >= 30) {
        particlesRef.current.shift();
      }
      particlesRef.current.push({
        emoji,
        x: Math.random() * (canvas.width - 50) + 25,
        y: canvas.height + 20,
        opacity: 1,
        vy: -(Math.random() * 2 + 2),
        scale: Math.random() * 0.5 + 1
      });
    }

    if (!animationFrameRef.current) {
      const animate = () => {
        if (!canvasRef.current) {
          animationFrameRef.current = undefined;
          return;
        }
        const cvs = canvasRef.current;
        const ctx = cvs.getContext('2d');
        if (!ctx) return;
        
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i];
          p.y += p.vy;
          p.opacity -= 0.008;
          
          if (p.opacity <= 0) {
            particlesRef.current.splice(i, 1);
            continue;
          }
          
          ctx.globalAlpha = p.opacity;
          ctx.font = \`\${Math.floor(28 * p.scale)}px sans-serif\`;
          ctx.fillText(p.emoji, p.x, p.y);
        }
        ctx.globalAlpha = 1;
        
        if (particlesRef.current.length > 0) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          animationFrameRef.current = undefined;
        }
      };
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, []);

  const triggerPopcornFight = useCallback(() => {
    triggerReaction("🍿", 16);
  }, [triggerReaction]);`;

content = content.replace(triggerRegex, newTriggers);

// 4. Replace JSX
const jsxRegex = /<div className="fixed inset-0 pointer-events-none overflow-hidden z-\[55\]">\s*<AnimatePresence>\s*\{floatingParticles\.map\(\(r\) => \([\s\S]*?<\/AnimatePresence>\s*<\/div>/;

content = content.replace(jsxRegex, `<canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-50" style={{width:'100%',height:'100%'}} />`);

fs.writeFileSync('c:/Users/Samarth Deshpande/Desktop/Sam_N/Love/client/app/cinema/page.tsx', content, 'utf8');
