import Image from "next/image";

export default function Sidebar() {
  return (
    <aside className="p-6 border-r-2">
      <div className="flex flex-row items-center gap-2">
        <Image
          src="/logo/logo.png"
          alt="The Moon Devs"
          width={38}
          height={38}
        />
        <h1 className="font-bold text-xl">The Moon Devs</h1>
      </div>
      <nav className="mt-12">
        <ul>
          <li>My Dashboard</li>
        </ul>
      </nav>
    </aside>
  );
}
