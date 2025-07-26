export const formatDate = (date: Date) => {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    if (weeks > 0) {
      return `${weeks}w`;
    }

    return `${diffDays}d`;
  } else {
    const month = date.toLocaleString("default", { month: "short" });
    const day = date.getDate();

    if (date.getFullYear() === now.getFullYear()) {
      return `${month} ${day}`;
    }

    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  }
};

export const focusInput = (chatInputRef: React.RefObject<HTMLTextAreaElement>) => {
  if (chatInputRef.current) {
    chatInputRef.current.focus();
  }
};
