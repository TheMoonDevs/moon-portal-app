"use client";
export default function TopUsedLink({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className=" p-8 rounded-sm my-4">
      <h2 className="uppercase tracking-[0.5rem] text-base font-normal text-gray-500">
        {title || "Top Used"}
      </h2>
      {children}
    </div>
  );
}
