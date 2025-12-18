import clsx from "clsx";

interface PageContainerProps {
  children: React.ReactNode;
}

export function PageContainer({ children }: PageContainerProps) {
  return (
    <div className="flex flex-col rounded-lg min-h-screen px-5 py-10 mx-2 mt-5 md:m-5 outline-2 shadow-xl outline-slate-200">
      {children}
    </div>
  );
}
