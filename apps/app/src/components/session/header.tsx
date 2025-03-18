import { RiAedFill, RiAndroidFill, RiAppleFill, RiWindowsFill } from "@remixicon/react";
import { useEffect, useState } from "react";
import type { Session } from "../../client";
import { SessionInfo } from "./session-info";

interface HeaderProps {
  session: Session;
}

type Platform = "macOS" | "Windows" | "Linux" | "iOS" | "Android" | "unknown";

export function Header({ session }: HeaderProps) {
  const [platform, setPlatform] = useState<Platform>("unknown");

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes("windows")) {
      setPlatform("Windows");
    } else if (userAgent.includes("android")) {
      setPlatform("Android");
    } else if (userAgent.includes("iphone") || userAgent.includes("ipad")) {
      setPlatform("iOS");
    } else if (userAgent.includes("linux")) {
      setPlatform("Linux");
    } else if (userAgent.includes("mac")) {
      setPlatform("macOS");
    }
  }, []);

  const getPlatformIcon = (platform: Platform) => {
    switch (platform) {
      case "macOS":
        return <RiAppleFill className="w-5 h-5 flex-shrink-0" />;
      case "Windows":
        return <RiWindowsFill className="w-5 h-5 flex-shrink-0" />;
      case "iOS":
        return <RiAppleFill className="w-5 h-5 flex-shrink-0" />;
      case "Linux":
        return <LinuxPenguinIcon />;
      case "Android":
        return <RiAndroidFill className="w-5 h-5 flex-shrink-0" />;
      case "unknown":
        return <RiAedFill className="w-5 h-5 flex-shrink-0" />;
    }
  };

  const getDownloadUrl = (platform: Platform) => {
    if (platform === "unknown") {
      return "https://hyprnote.com";
    }
    return `https://hyprnote.com/download/${platform.toLowerCase()}`;
  };

  return (
    <div className="flex flex-col border-b">
      <a
        href={getDownloadUrl(platform)}
      >
        <div className="flex gap-1 items-center justify-center p-4 border-b bg-black text-white group">
          <div className="flex gap-1 items-center transition-transform group-hover:scale-95">
            <span>Download</span>
            <img src="/hyprnote_icon.png" alt="Hyprnote Icon" className="size-6 ml-1" />
            <span className="font-racing-sans font-bold text-lg mr-1">HYPRNOTE</span>
            <span className="mr-1">for</span>
            {getPlatformIcon(platform)}
            <span>{platform}</span>
          </div>
        </div>
      </a>

      <SessionInfo session={session} />
    </div>
  );
}

const LinuxPenguinIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 434 510"
    fill="currentcolor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M49.762 482.156c26.85 3.207 57.016 20.6 82.262 23.671 25.382 3.205 33.237-17.285 33.237-17.285s28.562-6.386 58.591-7.121c30.057-.842 58.509 6.251 58.509 6.251s5.518 12.637 15.818 18.155c10.3 5.624 32.475 6.385 46.687-8.589 14.24-15.082 52.233-34.08 73.567-45.955 21.469-11.903 17.528-30.056 4.05-35.573-13.479-5.516-24.513-14.213-23.671-30.9.734-16.549-11.903-27.583-11.903-27.583s11.061-36.415.762-66.581c-10.3-30.028-44.27-78.321-70.386-114.628-26.115-36.415-3.942-78.456-27.719-132.184-23.78-53.808-85.441-50.628-118.678-27.693-33.236 22.937-23.046 79.816-21.443 106.802 1.603 26.85.734 46.063-2.337 52.967-3.071 7.011-24.512 32.475-38.752 53.808-14.213 21.442-24.514 65.712-34.922 83.975-10.192 18.154-3.07 34.703-3.07 34.703s-7.12 2.446-12.746 14.35c-5.518 11.768-16.551 17.392-36.417 21.225-19.73 4.049-19.73 16.768-14.974 31.008 4.782 14.213 0 22.175-5.517 40.33-5.516 18.151 22.094 23.667 49.052 26.847Zm279.098-82.807c14.104 6.169 34.377-2.419 40.546-8.588 6.143-6.142 10.491-15.273 10.491-15.273s6.169 3.071 5.543 12.826c-.653 9.893 4.239 23.997 13.479 28.889 9.24 4.865 23.344 11.657 16.034 18.452-7.447 6.794-48.645 23.371-60.955 36.307-12.202 12.853-28.236 23.371-37.993 20.273-9.863-3.071-18.479-16.55-14.238-36.28 4.375-19.647 8.071-41.199 7.445-53.509-.651-12.311-3.07-28.888 0-31.334 3.071-2.42 7.963-1.251 7.963-1.251s-2.448 23.348 11.685 29.488ZM237.332 66.771c13.587 0 24.54 13.478 24.54 30.055 0 11.768-5.518 21.959-13.589 26.851-2.038-.842-4.158-1.794-6.495-2.773 4.892-2.418 8.287-8.587 8.287-15.708 0-9.32-5.732-16.984-12.935-16.984-7.011 0-12.855 7.662-12.855 16.984 0 3.399.843 6.795 2.228 9.458a572.025 572.025 0 0 0-11.141-4.347 36.618 36.618 0 0 1-2.556-13.48c.002-16.576 10.926-30.056 24.516-30.056Zm-33.645 51.798c6.686 1.168 25.055 9.131 31.851 11.576 6.794 2.337 14.321 6.685 13.587 11.034-.842 4.483-4.347 4.483-13.587 10.109-9.131 5.517-29.078 17.828-35.465 18.67-6.36.842-9.973-2.746-16.769-7.121-6.795-4.458-19.538-14.866-16.333-20.382 0 0 9.973-7.636 14.322-11.549 4.349-4.05 15.599-13.588 22.394-12.337Zm-29.296-47.015c10.707 0 19.431 12.745 19.431 28.453 0 2.854-.327 5.516-.842 8.179-2.664.842-5.326 2.229-7.882 4.458-1.25 1.06-2.42 2.01-3.478 3.07 1.684-3.179 2.337-7.744 1.575-12.528-1.467-8.479-7.201-14.756-12.827-13.914-5.653.952-9.023 8.724-7.664 17.313 1.495 8.696 7.119 14.972 12.853 14.022.327-.109.626-.217.952-.327-2.744 2.663-5.299 5-7.963 6.903-7.744-3.616-13.478-14.431-13.478-27.176.001-15.816 8.588-28.453 19.323-28.453ZM114.74 277.167c11.033-17.391 18.152-55.411 29.186-68.048 11.143-12.609 19.73-39.486 15.817-51.362 0 0 23.779 28.453 40.33 23.779 16.577-4.784 53.836-32.475 59.352-27.719 5.517 4.782 52.966 109.138 57.749 142.374 4.783 33.209-3.179 58.592-3.179 58.592s-18.153-4.783-20.492 6.25c-2.337 11.142-2.337 51.499-2.337 51.499s-24.54 33.97-62.532 39.594c-37.993 5.518-57.017 1.495-57.017 1.495l-21.333-24.431s16.578-2.445 14.24-19.105c-2.337-16.549-50.657-39.487-59.354-60.087-8.693-20.6-1.6-55.412 9.57-72.831ZM20.792 401.796c1.902-8.152 26.523-8.152 35.98-13.886 9.459-5.734 11.36-22.203 18.997-26.55 7.527-4.458 21.442 11.36 27.176 20.271 5.626 8.697 27.177 46.717 35.982 56.173 8.913 9.539 17.094 22.175 14.539 33.535-2.418 11.359-15.816 19.648-15.816 19.648-11.984 3.696-45.41-10.734-60.6-17.094-15.191-6.385-53.837-8.289-58.81-13.914-5.108-5.734 2.446-18.37 4.456-30.356 1.792-12.12-3.832-19.648-1.904-27.827Z">
    </path>
  </svg>
);
