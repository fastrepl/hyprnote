import { SuggestionKeyDownProps } from "@tiptap/suggestion";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

export interface HashtagListProps {
  items: string[];
  command: (props: { id: string }) => void;
}

export interface HashtagListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

export const HashtagList = forwardRef<HashtagListRef, HashtagListProps>(
  (props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
      const item = props.items[index];
      if (item) {
        props.command({ id: item });
      }
    };

    useEffect(() => setSelectedIndex(0), [props.items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
          return true;
        }

        if (event.key === "ArrowDown") {
          setSelectedIndex((selectedIndex + 1) % props.items.length);
          return true;
        }

        if (event.key === "Enter") {
          selectItem(selectedIndex);
          return true;
        }

        return false;
      },
    }));

    return (
      <div className="hashtag-dropdown">
        {props.items.length > 0
          ? (
            props.items.map((item, index) => (
              <button
                key={index}
                className={index === selectedIndex ? "is-selected" : ""}
                onClick={() => selectItem(index)}
              >
                <span className="hashtag-prefix">#</span>
                {item}
              </button>
            ))
          )
          : <div className="item">No matching tags</div>}
      </div>
    );
  },
);
