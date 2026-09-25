# Debug Commander
**Status:** In development
**Version:** 0.1.0
**License:** MIT

A process-injection debugger toolkit. A Python Commander attaches to a target process and
drives in-process Bug agents over an encrypted, authenticated channel, giving full debugger
capability on memory, registers, breakpoints and watchpoints. Bugs can hollow the host
process, cache blobs in memory, and optionally persist across reboots, with no disk
footprint while running.

- Stealth transport over local IPC, never TCP
- Authenticated with X25519 key exchange and AES-GCM, with keys separated per session
- Memory scanner, symbol resolution and disassembly for reverse engineering
- Sensitive regions locked in memory so payloads never reach disk or swap
- Linux, Windows and macOS, with the Linux path furthest along

For research and tooling use. Injection, hollowing and persistence operate inside target
processes with minimal detection by design, so use them only on systems you are authorised
to debug.
