# Install recipes for a missing tool (a fresh Mac)

Read by `re-toolchain` when a cell says `missing` and the tool exists. Run them as written; the traps are what each recipe works around.

- **GNU binutils for H8:** build from source, `./configure --target=h8300-elf --with-system-zlib`, then `make MAKEINFO=true all-binutils` (the documentation step fails on macOS without it). A stock binutils from a package manager has no H8 target.
- **dsp56kDisassemble:** build the dsp56300 project with asmjit.
- **Z80:** `brew install z80dasm`. **capstone:** in a virtual environment. **PDFs:** `brew install poppler`. **MAME's unidasm:** `brew install mame`, run only as a black-box program.
- **EPROM packs:** the Internet Archive's MAME romsets.
- Keep these as one script in the library's `toolchain/` shelf, not in a project.
