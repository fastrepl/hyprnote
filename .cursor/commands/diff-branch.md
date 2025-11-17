```bash
git diff "$(
  but branch list --local \
    | grep '^\*' \
    | sed 's/^\* //' \
    | fzf --filter="$1" --select-1 --exit-0
)"
```

- Given the instruction, get the diff of the specific branch using the above command.
- To be more accurate, do not solely rely on diffs, but read related files based on the diff.
- Follow the instruction using the files and diffs as context.
