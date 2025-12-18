import clsx from "clsx";

interface PageContainerProps {
  children: React.ReactNode;
}

export function PageContainer({ children }: PageContainerProps) {
  return (
    <div className="flex flex-col rounded-lg min-h-screen p-5 m-5 outline-2 shadow-xl outline-slate-200">
      {children}
    </div>
  );
}
