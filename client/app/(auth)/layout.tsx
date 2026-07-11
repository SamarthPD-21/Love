import { FloatingHearts } from "@/components/animations/FloatingHearts";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh flex items-center justify-center bg-gradient-to-br from-[#FDF6F0] via-[#F2D4D8] to-[#E8D4EC] dark:from-[#0F0A1A] dark:via-[#1A1030] dark:to-[#12101E]">
      <FloatingHearts count={10} />
      <div className="relative z-10 w-full max-w-md px-4">
        {children}
      </div>
    </div>
  );
}
