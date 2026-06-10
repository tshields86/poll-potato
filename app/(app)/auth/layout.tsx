export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-start justify-center px-[clamp(18px,5vw,56px)] pb-16 pt-4 sm:items-center">
      {children}
    </div>
  );
}
