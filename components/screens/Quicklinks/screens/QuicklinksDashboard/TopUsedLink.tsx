"use client";
export default function TopUsedLink({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className=" bg-gray-100 p-8 rounded-sm my-4">
      <h2 className="uppercase tracking-[0.5rem] text-base font-normal text-gray-500">
        Top Used
      </h2>
      {children}
    </div>
  );
}
