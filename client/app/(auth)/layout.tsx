import { FloatingHearts } from "@/components/animations/FloatingHearts";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh flex items-center justify-center bg-gradient-to-br from-[#FFF8F0] via-[#FFE4E6] to-[#E8E0F0] dark:from-[#1A1625] dark:via-[#2D1F3D] dark:to-[#1F2937]">
      <FloatingHearts count={10} />
      <div className="relative z-10 w-full max-w-md px-4">
        {children}
      </div>
    </div>
  );
}
