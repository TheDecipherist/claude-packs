---
name: shell-extract-template
description: Use when template-law refuses shell code, when scan lists repeated shell, or when copying a script to start another.
---

# Extract a shell repeat into one template (one job: pick the shell form, and move every copy to it)

Follow `make-it-a-template`. This skill is its shell forms.

<constraints>
Always do:
1. A repeated block: one function in the shared file, what differs as its arguments, read into named locals.
   ```bash
   wait_for_file() {
     local file="$1" what="$2"
     wingate_wait "$pid" "[ -s '$file' ]" || exit 1
     [ -s "$file" ] || { echo "FAIL no $what" >&2; exit 1; }
   }
   ```
2. One command with other arguments: a table and one loop.
   ```bash
   rows=("a silent slot|PLANT_SILENT" "a dead key|PLANT_DEAD")
   for row in "${rows[@]}"; do expect_fail "${row%%|*}" env "${row##*|}=1" "$gate"; done
   ```
3. Source the shared file by its own location, so it works from any folder: `. "$(dirname "$0")/lib.sh"`.
4. A program pasted into a heredoc: move it to its own file and call it.
5. Run the scripts the change reaches. Then search for the old block: none is left.

Never do:
- Pass values through globals when an argument will do.
- Use `eval` to make a function general.
</constraints>
