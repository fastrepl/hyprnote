const NoPriorityIcon = () => (
  <svg
    aria-label="No Priority"
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="lch(39.286% 1 282.863 / 1)"
    role="img"
    focusable="false"
    xmlns="http://www.w3.org/2000/svg"
    color="lch(39.286% 1 282.863 / 1)"
  >
    <rect x="1.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9"></rect>
    <rect x="6.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9"></rect>
    <rect
      x="11.5"
      y="7.25"
      width="3"
      height="1.5"
      rx="0.5"
      opacity="0.9"
    ></rect>
  </svg>
);

const UrgentPriorityIcon = () => (
  <svg
    aria-label="Urgent Priority"
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="lch(66% 80 48)"
    role="img"
    focusable="false"
    xmlns="http://www.w3.org/2000/svg"
    color="lch(66% 80 48)"
  >
    <path d="M3 1C1.91067 1 1 1.91067 1 3V13C1 14.0893 1.91067 15 3 15H13C14.0893 15 15 14.0893 15 13V3C15 1.91067 14.0893 1 13 1H3ZM7 4L9 4L8.75391 8.99836H7.25L7 4ZM9 11C9 11.5523 8.55228 12 8 12C7.44772 12 7 11.5523 7 11C7 10.4477 7.44772 10 8 10C8.55228 10 9 10.4477 9 11Z"></path>
  </svg>
);

const HighPriorityIcon = () => (
  <svg
    aria-label="High Priority"
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="lch(39.286% 1 282.863 / 1)"
    role="img"
    focusable="false"
    xmlns="http://www.w3.org/2000/svg"
    color="lch(39.286% 1 282.863 / 1)"
  >
    <rect x="1.5" y="8" width="3" height="6" rx="1"></rect>
    <rect x="6.5" y="5" width="3" height="9" rx="1"></rect>
    <rect x="11.5" y="2" width="3" height="12" rx="1"></rect>
  </svg>
);

const MediumPriorityIcon = () => (
  <svg
    aria-label="Medium Priority"
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="lch(39.286% 1 282.863 / 1)"
    role="img"
    focusable="false"
    xmlns="http://www.w3.org/2000/svg"
    color="lch(39.286% 1 282.863 / 1)"
  >
    <rect x="1.5" y="8" width="3" height="6" rx="1"></rect>
    <rect x="6.5" y="5" width="3" height="9" rx="1"></rect>
    <rect x="11.5" y="2" width="3" height="12" rx="1" fillOpacity="0.4"></rect>
  </svg>
);

const LowPriorityIcon = () => (
  <svg
    aria-label="Low Priority"
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="lch(39.286% 1 282.863 / 1)"
    role="img"
    focusable="false"
    xmlns="http://www.w3.org/2000/svg"
    color="lch(39.286% 1 282.863 / 1)"
  >
    <rect x="1.5" y="8" width="3" height="6" rx="1"></rect>
    <rect x="6.5" y="5" width="3" height="9" rx="1" fillOpacity="0.4"></rect>
    <rect x="11.5" y="2" width="3" height="12" rx="1" fillOpacity="0.4"></rect>
  </svg>
);

export const PriorityIcons = {
  NoPriority: NoPriorityIcon,
  Urgent: UrgentPriorityIcon,
  High: HighPriorityIcon,
  Medium: MediumPriorityIcon,
  Low: LowPriorityIcon,
};
