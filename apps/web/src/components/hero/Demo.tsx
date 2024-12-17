export default function Demo() {
  return (
    <div className="overflow-hidden rounded-lg shadow-lg flex relative flex-col flex-1 h-full backdrop-blur-lg font-basic bg-white border-0.5 @container w-full">
      <div className="flex relative flex-none gap-4 items-center pr-1 pl-2  py-[3%] md:h-8">
        <div className="flex items-center w-full space-x-[3%] md:space-x-2">
          <div className="rounded-full aspect-square bg-red-400 border-red-500 w-[3%] md:w-2.5 md:h-2.5"></div>
          <div className="rounded-full aspect-square bg-yellow-300 border-yellow-400 w-[3%] md:w-2.5 md:h-2.5"></div>
          <div className="rounded-full aspect-square bg-green-400 border-green-500 w-[3%] md:w-2.5 md:h-2.5"></div>
        </div>
      </div>
      <div className="relative flex-1 bg-white px-[5%] md:px-8 pt-4 aspect-[4/4.9] opacity-70 md:opacity-100">
        <div
          className="relative w-full"
          style={{ aspectRatio: "300 / 240" }}
        ></div>
        <div className="flex absolute bottom-4 left-1/2 z-10 gap-3 items-center p-2.5 bg-white rounded-full border shadow-lg transition-all transform -translate-x-1/2 origin-bottom scale-75 md:scale-100">
          <div className="flex justify-center items-center w-6 h-6 gap-[3px]">
            <div
              className="bg-green-500 rounded-full transition-all duration-300 ease-in-out w-[3px]"
              style={{ height: "51%" }}
            ></div>
            <div
              className="bg-green-500 rounded-full transition-all duration-300 ease-in-out w-[3px]"
              style={{ height: "70%" }}
            ></div>
            <div
              className="bg-green-500 rounded-full transition-all duration-300 ease-in-out w-[3px]"
              style={{ height: "51%" }}
            ></div>
          </div>
          <div className="opacity-100 transform-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
              data-slot="icon"
              className="mr-1 w-5 h-5 text-tertiary"
            >
              <path d="M5.25 3A2.25 2.25 0 0 0 3 5.25v9.5A2.25 2.25 0 0 0 5.25 17h9.5A2.25 2.25 0 0 0 17 14.75v-9.5A2.25 2.25 0 0 0 14.75 3h-9.5Z"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
