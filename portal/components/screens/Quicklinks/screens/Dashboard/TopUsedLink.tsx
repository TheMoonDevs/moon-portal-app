'use client';
export default function TopUsedLink({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="my-4 rounded-sm p-8">
      <h2 className="text-base font-normal uppercase tracking-[0.5rem] text-gray-500">
        {title || 'Top Used'}
      </h2>
      {children}
    </div>
  );
}
