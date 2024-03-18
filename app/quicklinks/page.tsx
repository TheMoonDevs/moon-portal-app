export default function Home() {
  return (
    <div className="mt-10 w-full">
      <div className=" bg-gray-100 p-4 rounded-sm my-4">
        <h2 className="uppercase tracking-[0.5rem] text-base font-normal text-gray-500">
          Top Used
        </h2>
      </div>
      <div className="bg-gray-100 p-4 rounded-sm">
        <div className="flex justify-between">
          <h2 className="uppercase tracking-[0.5rem] text-base font-normal text-gray-500">
            Added To My List
          </h2>
          <div className="flex">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
